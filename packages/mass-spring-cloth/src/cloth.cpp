// Mass-spring cloth (XPBD) — Stage 1b Vulkan/C++ serial-GS implementation.
//
// Sub-phase: sub-phase-phase-3-mass-spring-cloth (task-5). Consumes the
// §1.9.1-cpp substrate: vkcompute (compute context + storage buffers + pipeline
// + dispatch), capture (Hdf5Writer/Manifest), determinism (DeterministicContext
// + assert_deterministic_run), hash (sha256_hex).
//
// XPBD reimplemented INDEPENDENTLY from Macklin, Müller, Chentanez 2016
// (Convention #8); cross-checked against the read-only vendored oracle
// references/PositionBasedDynamics/PositionBasedDynamics/XPBD.cpp. Determinism
// (charter D-DET): serial Gauss-Seidel in a single Vulkan invocation, fixed
// constraint order, f64 + NoContraction, no atomics/subgroups -> bit-exact on
// lavapipe (LP_NUM_THREADS=0; MEASURED via assert_deterministic_run).

#include "bit_physics/mass_spring_cloth/cloth.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <ctime>
#include <stdexcept>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/hash.hpp"
#include "bit_physics/common/vulkan_compute.hpp"

#include "cloth_xpbd.spv.h"  // const uint32_t kClothXpbdSpv[]

namespace bit_physics::mass_spring_cloth {

namespace vk = bit_physics::common_cpp::vkcompute;
namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;
namespace hsh = bit_physics::common_cpp::hash;

namespace {

// Push-constant block — MUST match shaders/cloth_xpbd.comp `Params` (std430:
// 4 uints @ 0..15, then f64s 8-byte-aligned from offset 16).
struct PushParams {
    uint32_t N;
    uint32_t M;
    uint32_t iters;
    uint32_t substeps;
    double   dt;
    double   gx;
    double   gy;
    double   gz;
    double   damping;
};
static_assert(sizeof(PushParams) == 56, "push-constant layout must match the shader std430 block");

std::string utc_now() {
    std::time_t now = std::time(nullptr);
    std::tm tm_buf{};
    gmtime_r(&now, &tm_buf);
    char buf[32];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm_buf);
    return buf;
}

}  // namespace

std::vector<double> build_grid_positions(const ClothConfig& cfg) {
    const size_t N = static_cast<size_t>(cfg.nx) * cfg.ny;
    std::vector<double> pos(3u * N, 0.0);
    for (uint32_t j = 0; j < cfg.ny; ++j)
        for (uint32_t i = 0; i < cfg.nx; ++i) {
            size_t idx = static_cast<size_t>(j) * cfg.nx + i;
            pos[3u * idx + 0u] = i * cfg.spacing;
            pos[3u * idx + 1u] = -static_cast<double>(j) * cfg.spacing;
            pos[3u * idx + 2u] = 0.0;
        }
    return pos;
}

std::vector<Constraint> build_constraints(const ClothConfig& cfg) {
    std::vector<Constraint> cons;
    auto idx = [&](uint32_t i, uint32_t j) -> uint32_t { return j * cfg.nx + i; };
    const double s = cfg.spacing;

    // structural: 4-neighbour (right + down)
    for (uint32_t j = 0; j < cfg.ny; ++j)
        for (uint32_t i = 0; i < cfg.nx; ++i) {
            if (i + 1u < cfg.nx) cons.push_back({idx(i, j), idx(i + 1u, j), s, SpringClass::Structural});
            if (j + 1u < cfg.ny) cons.push_back({idx(i, j), idx(i, j + 1u), s, SpringClass::Structural});
        }
    // shear: diagonals
    if (cfg.enable_shear) {
        const double sd = s * std::sqrt(2.0);
        for (uint32_t j = 0; j + 1u < cfg.ny; ++j)
            for (uint32_t i = 0; i + 1u < cfg.nx; ++i) {
                cons.push_back({idx(i, j), idx(i + 1u, j + 1u), sd, SpringClass::Shear});
                cons.push_back({idx(i + 1u, j), idx(i, j + 1u), sd, SpringClass::Shear});
            }
    }
    // bending / flexion: 2-apart
    if (cfg.enable_bending) {
        const double sb = 2.0 * s;
        for (uint32_t j = 0; j < cfg.ny; ++j)
            for (uint32_t i = 0; i < cfg.nx; ++i) {
                if (i + 2u < cfg.nx) cons.push_back({idx(i, j), idx(i + 2u, j), sb, SpringClass::Bending});
                if (j + 2u < cfg.ny) cons.push_back({idx(i, j), idx(i, j + 2u), sb, SpringClass::Bending});
            }
    }
    return cons;
}

ClothResult run_cloth(const ClothConfig& cfg, const std::filesystem::path* capture_manifest) {
    const size_t N = static_cast<size_t>(cfg.nx) * cfg.ny;
    if (N == 0) throw std::runtime_error("mass-spring-cloth: empty grid");

    det::DeterministicContext dctx(cfg.seed);

    // ----- mesh (host) --------------------------------------------------------
    std::vector<double> ic = cfg.initial_positions.empty() ? build_grid_positions(cfg)
                                                            : cfg.initial_positions;
    if (ic.size() != 3u * N) throw std::runtime_error("initial_positions size != 3*N");

    std::vector<double> inv_mass(N, cfg.particle_mass > 0.0 ? 1.0 / cfg.particle_mass : 0.0);
    for (uint32_t p : cfg.pinned) {
        if (p >= N) throw std::runtime_error("pinned index out of range");
        inv_mass[p] = 0.0;
    }

    std::vector<Constraint> cons = build_constraints(cfg);
    const size_t M = cons.size();
    std::vector<uint32_t> con_a(M), con_b(M);
    std::vector<double> con_rest(M), con_compliance(M);
    for (size_t c = 0; c < M; ++c) {
        con_a[c] = cons[c].a;
        con_b[c] = cons[c].b;
        con_rest[c] = cons[c].rest;
        con_compliance[c] = (cons[c].cls == SpringClass::Bending) ? cfg.bend_compliance
                                                                  : cfg.stretch_compliance;
    }

    // ----- Vulkan context + pipeline (built once) -----------------------------
    vk::ComputeContextConfig cc;
    cc.app_name = "mass-spring-cloth";
    cc.api_version_minor = 2;     // FloatControls query
    cc.require_float64 = true;
    vk::ComputeContext ctx = vk::ComputeContext::create(cc);
    ctx.assert_deterministic_float_controls();

    vk::ComputePipeline::Options opts;
    opts.spirv = kClothXpbdSpv;
    opts.spirv_word_count = sizeof(kClothXpbdSpv) / sizeof(uint32_t);
    opts.binding_count = 9;
    opts.push_constant_bytes = sizeof(PushParams);
    vk::ComputePipeline pipe(ctx, opts);

    PushParams pc{cfg.nx * cfg.ny, static_cast<uint32_t>(M), cfg.iterations, cfg.substeps,
                  cfg.dt, cfg.gx, cfg.gy, cfg.gz, cfg.velocity_damping};

    const VkDeviceSize vec_bytes = static_cast<VkDeviceSize>(3u * N) * sizeof(double);
    const VkDeviceSize n_bytes = static_cast<VkDeviceSize>(N) * sizeof(double);
    const VkDeviceSize m_u_bytes = static_cast<VkDeviceSize>(std::max<size_t>(M, 1)) * sizeof(uint32_t);
    const VkDeviceSize m_d_bytes = static_cast<VkDeviceSize>(std::max<size_t>(M, 1)) * sizeof(double);

    // One full trajectory; fills `out` (if non-null) with captured frames + final.
    auto trajectory = [&](ClothResult* out) -> std::vector<unsigned char> {
        vk::StorageBuffer pos(ctx, vec_bytes), prev(ctx, vec_bytes), vel(ctx, vec_bytes);
        vk::StorageBuffer wbuf(ctx, n_bytes);
        vk::StorageBuffer ca(ctx, m_u_bytes), cb(ctx, m_u_bytes);
        vk::StorageBuffer cr(ctx, m_d_bytes), cco(ctx, m_d_bytes), lam(ctx, m_d_bytes);
        pos.upload(ic.data(), vec_bytes);
        prev.fill_zero();
        if (cfg.initial_velocity.size() == 3) {
            std::vector<double> v0(3u * N);
            for (size_t i = 0; i < N; ++i) {
                v0[3u * i] = cfg.initial_velocity[0];
                v0[3u * i + 1u] = cfg.initial_velocity[1];
                v0[3u * i + 2u] = cfg.initial_velocity[2];
            }
            vel.upload(v0.data(), vec_bytes);
        } else {
            vel.fill_zero();
        }
        wbuf.upload(inv_mass.data(), n_bytes);
        if (M > 0) {
            ca.upload(con_a.data(), M * sizeof(uint32_t));
            cb.upload(con_b.data(), M * sizeof(uint32_t));
            cr.upload(con_rest.data(), M * sizeof(double));
            cco.upload(con_compliance.data(), M * sizeof(double));
        }
        lam.fill_zero();
        pipe.bind(0, pos); pipe.bind(1, prev); pipe.bind(2, vel); pipe.bind(3, wbuf);
        pipe.bind(4, ca); pipe.bind(5, cb); pipe.bind(6, cr); pipe.bind(7, cco); pipe.bind(8, lam);

        std::vector<double> hp(3u * N), hv(3u * N);
        auto snapshot = [&](uint32_t step) {
            if (!out) return;
            pos.download(hp.data(), vec_bytes);
            vel.download(hv.data(), vec_bytes);
            out->captured_steps.push_back(step);
            out->captured_positions.push_back(hp);
            out->captured_velocities.push_back(hv);
        };
        snapshot(0);  // IC
        for (uint32_t s = 1; s <= cfg.steps; ++s) {
            vk::dispatch(ctx, pipe, 1, 1, 1, &pc);  // single workgroup, serial GS
            if (cfg.capture_interval > 0 && s % cfg.capture_interval == 0) snapshot(s);
        }

        pos.download(hp.data(), vec_bytes);
        vel.download(hv.data(), vec_bytes);
        if (out) {
            out->final_positions = hp;
            // length_bounded witness: max |d - rest|/rest over stretch constraints
            double max_ratio = 0.0;
            for (size_t c = 0; c < M; ++c) {
                if (cons[c].cls == SpringClass::Bending) continue;
                uint32_t a = con_a[c], b = con_b[c];
                double dx = hp[3u * a] - hp[3u * b];
                double dy = hp[3u * a + 1u] - hp[3u * b + 1u];
                double dz = hp[3u * a + 2u] - hp[3u * b + 2u];
                double d = std::sqrt(dx * dx + dy * dy + dz * dz);
                max_ratio = std::max(max_ratio, std::fabs(d - con_rest[c]) / con_rest[c]);
            }
            out->max_stretch_ratio = max_ratio;
            double max_sp = 0.0;
            for (size_t i = 0; i < N; ++i) {
                double sp = std::sqrt(hv[3u * i] * hv[3u * i] + hv[3u * i + 1u] * hv[3u * i + 1u] +
                                      hv[3u * i + 2u] * hv[3u * i + 2u]);
                max_sp = std::max(max_sp, sp);
            }
            out->max_speed = max_sp;
        }
        std::vector<unsigned char> wit(vec_bytes);
        std::memcpy(wit.data(), hp.data(), vec_bytes);
        return wit;
    };

    ClothResult result;
    if (cfg.assert_determinism) {
        // D-DET: 2-run bit-identical determinism (tolerance 0.0).
        result.determinism_witness = det::assert_deterministic_run(
            [&] { return trajectory(nullptr); }, 2, 0.0);
        trajectory(&result);
    } else {
        // Single capturing run; witness = sha256 of its final positions.
        std::vector<unsigned char> wit = trajectory(&result);
        result.determinism_witness = hsh::sha256_hex(wit);
    }

    // ----- optional capture-v1 .h5 (+ .json) ----------------------------------
    if (capture_manifest) {
        cap::Manifest m;
        m.schema_version = "1.0.0";
        m.sim = {"mass-spring-cloth", "soft-body", "ref"};
        m.stack = {"cpp", "0.0.0", "stage-1b"};
        m.config.tier = "ref";
        m.config.dims = {static_cast<int64_t>(cfg.ny), static_cast<int64_t>(cfg.nx), 3};
        m.config.dtype = "f64";
        m.config.seed = cfg.seed;
        m.config.params = {{"nx", cfg.nx}, {"ny", cfg.ny}, {"spacing", cfg.spacing},
                           {"dt", cfg.dt}, {"substeps", cfg.substeps},
                           {"iterations", cfg.iterations},
                           {"stretch_compliance", cfg.stretch_compliance},
                           {"bend_compliance", cfg.bend_compliance},
                           {"gravity", {cfg.gx, cfg.gy, cfg.gz}},
                           {"velocity_damping", cfg.velocity_damping}};
        m.run.step_count = cfg.steps;
        m.run.capture_interval = cfg.capture_interval;
        m.run.start_utc = utc_now();
        m.payload.format = "hdf5";
        m.payload.path = capture_manifest->stem().string() + ".h5";
        m.determinism = {"bit-exact-same-hw", false, false};

        cap::Hdf5Writer writer(*capture_manifest, m);
        for (size_t f = 0; f < result.captured_steps.size(); ++f) {
            const std::vector<double>& fr = result.captured_positions[f];
            cap::StepData sd;
            cap::FieldData fp;
            fp.dtype = "f64";
            fp.shape = {static_cast<int64_t>(N), 3};
            fp.bytes.resize(vec_bytes);
            std::memcpy(fp.bytes.data(), fr.data(), vec_bytes);
            sd.fields.emplace("positions", std::move(fp));
            cap::FieldData fv;
            fv.dtype = "f64";
            fv.shape = {static_cast<int64_t>(N), 3};
            fv.bytes.resize(vec_bytes);
            std::memcpy(fv.bytes.data(), result.captured_velocities[f].data(), vec_bytes);
            sd.fields.emplace("velocities", std::move(fv));
            writer.write_step(result.captured_steps[f], sd);
        }
        writer.finalize();
    }
    return result;
}

}  // namespace bit_physics::mass_spring_cloth
