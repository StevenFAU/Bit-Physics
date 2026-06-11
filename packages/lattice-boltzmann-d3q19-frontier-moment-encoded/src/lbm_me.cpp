// D3Q19 LBM frontier-moment-encoded — Stage-1b Vulkan/C++ f64 implementation.
//
// Consumes the §1.9.1-cpp substrate exactly like the landed rd2d-stack-c port:
// vkcompute (context + storage buffers + pipelines + dispatch), capture (Hdf5Writer),
// determinism (assert_deterministic_run), hash. Posture: f64 (require_float64) +
// NoContraction shaders; element-wise kernels; the encode kernel's atomicOr composes
// DISJOINT half-words (order-independent), so the lavapipe determinism posture holds.

#include "bit_physics/lbm_d3q19_me/lbm_me.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <ctime>
#include <stdexcept>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/vulkan_compute.hpp"

#include "lbm_collide.spv.h"        // const uint32_t kLbmCollideSpv[]
#include "lbm_stream_bounce.spv.h"  // const uint32_t kLbmStreamBounceSpv[]
#include "lbm_encode.spv.h"         // const uint32_t kLbmEncodeSpv[]
#include "lbm_decode.spv.h"         // const uint32_t kLbmDecodeSpv[]

namespace bit_physics::lbm_d3q19_me {

namespace vk = bit_physics::common_cpp::vkcompute;
namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;

namespace {

constexpr double kCs2 = 1.0 / 3.0;

const std::array<double, kQ>& weights() {
    static const std::array<double, kQ> w = [] {
        std::array<double, kQ> a{};
        a[0] = 1.0 / 3.0;
        for (int i = 1; i <= 6; ++i) a[i] = 1.0 / 18.0;
        for (int i = 7; i < kQ; ++i) a[i] = 1.0 / 36.0;
        return a;
    }();
    return w;
}

// Push-constant block — MUST match the shaders' std430 push_constant layout.
struct PushParams {
    uint32_t nx;
    uint32_t ny;
    uint32_t nz;
    uint32_t pad;
    double tau;
    double force_x;
};
static_assert(sizeof(PushParams) == 32, "push-constant layout must match the shader block");

std::string utc_now() {
    std::time_t now = std::time(nullptr);
    std::tm tm_buf{};
    gmtime_r(&now, &tm_buf);
    char buf[32];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm_buf);
    return buf;
}

inline size_t ncell_of(const LbmConfig& c) {
    return static_cast<size_t>(c.nx) * c.ny * c.nz;
}

// The 19 monomials over a velocity vector (rank-19 on the D3Q19 set; measured cond ~19).
std::array<double, kQ> monomials(const std::array<int, 3>& c) {
    const double x = c[0], y = c[1], z = c[2];
    return {1.0,         x,           y,           z,           x * x,       y * y,
            z * z,       x * y,       x * z,       y * z,       x * x * y,   x * x * z,
            y * y * x,   y * y * z,   z * z * x,   z * z * y,   x * x * y * y,
            x * x * z * z, y * y * z * z};
}

}  // namespace

std::array<double, kQ> QuantRanges::bound() const {
    std::array<double, kQ> b{};
    for (int k = 0; k < kQ; ++k) b[k] = (hi[k] - lo[k]) / 2.0 / 65535.0;
    return b;
}

MomentBasis build_moment_basis() {
    MomentBasis basis;
    for (int k = 0; k < kQ; ++k) {
        for (int i = 0; i < kQ; ++i) basis.m[k * kQ + i] = 0.0;
    }
    for (int i = 0; i < kQ; ++i) {
        auto mono = monomials(kVelocities[i]);
        for (int k = 0; k < kQ; ++k) basis.m[k * kQ + i] = mono[k];
    }
    // Gauss-Jordan inverse in f64 with partial pivoting (deterministic).
    std::array<double, kQ * kQ> a = basis.m;
    std::array<double, kQ * kQ>& inv = basis.m_inv;
    for (int k = 0; k < kQ; ++k)
        for (int i = 0; i < kQ; ++i) inv[k * kQ + i] = (k == i) ? 1.0 : 0.0;
    for (int col = 0; col < kQ; ++col) {
        int pivot = col;
        for (int r = col + 1; r < kQ; ++r)
            if (std::fabs(a[r * kQ + col]) > std::fabs(a[pivot * kQ + col])) pivot = r;
        if (std::fabs(a[pivot * kQ + col]) < 1e-12)
            throw std::runtime_error("moment basis singular (should be rank 19)");
        if (pivot != col)
            for (int j = 0; j < kQ; ++j) {
                std::swap(a[pivot * kQ + j], a[col * kQ + j]);
                std::swap(inv[pivot * kQ + j], inv[col * kQ + j]);
            }
        const double d = a[col * kQ + col];
        for (int j = 0; j < kQ; ++j) {
            a[col * kQ + j] /= d;
            inv[col * kQ + j] /= d;
        }
        for (int r = 0; r < kQ; ++r) {
            if (r == col) continue;
            const double m = a[r * kQ + col];
            if (m == 0.0) continue;
            for (int j = 0; j < kQ; ++j) {
                a[r * kQ + j] -= m * a[col * kQ + j];
                inv[r * kQ + j] -= m * inv[col * kQ + j];
            }
        }
    }
    // A2 anchor: max |M·M⁻¹ − I| (recorded; asserted in the doctest suite).
    double resid = 0.0;
    for (int r = 0; r < kQ; ++r)
        for (int c = 0; c < kQ; ++c) {
            double s = 0.0;
            for (int k = 0; k < kQ; ++k) s += basis.m[r * kQ + k] * basis.m_inv[k * kQ + c];
            resid = std::max(resid, std::fabs(s - ((r == c) ? 1.0 : 0.0)));
        }
    basis.inverse_residual = resid;
    return basis;
}

std::vector<double> initial_rest_state(const LbmConfig& cfg) {
    const size_t n = ncell_of(cfg);
    std::vector<double> f(static_cast<size_t>(kQ) * n);
    for (int i = 0; i < kQ; ++i)
        std::fill(f.begin() + i * n, f.begin() + (i + 1) * n, weights()[i]);
    return f;
}

void reference_step(std::vector<double>& f, const LbmConfig& cfg) {
    // Host-side f64 mirror of the parent numpy arithmetic (collide+force, pull stream,
    // static-wall bounce-back). Golden/calibration surface only.
    const size_t n = ncell_of(cfg);
    const auto& W = weights();
    std::vector<double> fpost(f.size());
    const double inv_cs2 = 1.0 / kCs2;
    const double inv_cs4 = inv_cs2 * inv_cs2;
    const double prefactor = 1.0 - 0.5 / cfg.tau;
    for (size_t cell = 0; cell < n; ++cell) {
        double fi[kQ];
        for (int i = 0; i < kQ; ++i) fi[i] = f[i * n + cell];
        double rho = 0.0;
        for (int i = 0; i < kQ; ++i) rho += fi[i];
        const double rho_safe = std::max(rho, 1e-30);
        double mx = 0.0, my = 0.0, mz = 0.0;
        for (int i = 0; i < kQ; ++i) {
            mx += kVelocities[i][0] * fi[i];
            my += kVelocities[i][1] * fi[i];
            mz += kVelocities[i][2] * fi[i];
        }
        const double ux = mx / rho_safe + 0.5 * cfg.force_x / rho_safe;
        const double uy = my / rho_safe;
        const double uz = mz / rho_safe;
        const double u_sq = ux * ux + uy * uy + uz * uz;
        for (int i = 0; i < kQ; ++i) {
            const double cu =
                kVelocities[i][0] * ux + kVelocities[i][1] * uy + kVelocities[i][2] * uz;
            const double feq = W[i] * rho
                * (1.0 + cu / kCs2 + (cu * cu) / (2.0 * kCs2 * kCs2) - u_sq / (2.0 * kCs2));
            double fp = fi[i] - (fi[i] - feq) / cfg.tau;
            const double term_x = (kVelocities[i][0] - ux) * inv_cs2 + cu * kVelocities[i][0] * inv_cs4;
            fp += prefactor * W[i] * (term_x * cfg.force_x);
            fpost[i * n + cell] = fp;
        }
    }
    // Pull streaming + bounce-back, mirroring the shader.
    const int nx = static_cast<int>(cfg.nx), ny = static_cast<int>(cfg.ny),
              nz = static_cast<int>(cfg.nz);
    std::vector<double> fnew(f.size());
    for (int x = 0; x < nx; ++x)
        for (int y = 0; y < ny; ++y)
            for (int z = 0; z < nz; ++z) {
                const size_t cell = (static_cast<size_t>(x) * ny + y) * nz + z;
                double g[kQ];
                for (int i = 0; i < kQ; ++i) {
                    const int sx = (x - kVelocities[i][0] + nx) % nx;
                    const int sy = (y - kVelocities[i][1] + ny) % ny;
                    const int sz = (z - kVelocities[i][2] + nz) % nz;
                    g[i] = fpost[i * n + (static_cast<size_t>(sx) * ny + sy) * nz + sz];
                }
                double outv[kQ];
                for (int i = 0; i < kQ; ++i) outv[i] = g[i];
                if (y == 0)
                    for (int i = 0; i < kQ; ++i)
                        if (kVelocities[i][1] > 0) outv[i] = g[kOpposite[i]];
                if (y == ny - 1)
                    for (int i = 0; i < kQ; ++i)
                        if (kVelocities[i][1] < 0) outv[i] = g[kOpposite[i]];
                for (int i = 0; i < kQ; ++i) fnew[i * n + cell] = outv[i];
            }
    f = std::move(fnew);
}

QuantRanges calibrate_ranges(const LbmConfig& cfg, const MomentBasis& basis) {
    // f64 warmup (host reference) -> per-moment min/max envelope, padded by range_margin
    // (the stability-guided envelope: ranges wide enough that the trajectory's moments
    // never clamp, narrow enough that the 16-bit step stays small).
    const size_t n = ncell_of(cfg);
    std::vector<double> f = initial_rest_state(cfg);
    QuantRanges r;
    for (int k = 0; k < kQ; ++k) {
        r.lo[k] = 1e300;
        r.hi[k] = -1e300;
    }
    auto absorb = [&](const std::vector<double>& field) {
        for (size_t cell = 0; cell < n; ++cell) {
            for (int k = 0; k < kQ; ++k) {
                double m = 0.0;
                for (int i = 0; i < kQ; ++i) m += basis.m[k * kQ + i] * field[i * n + cell];
                r.lo[k] = std::min(r.lo[k], m);
                r.hi[k] = std::max(r.hi[k], m);
            }
        }
    };
    absorb(f);
    // Stability-guided = the envelope must cover the WHOLE trajectory (a Poiseuille
    // start-up keeps accelerating well past any short warmup; a clamped momentum moment
    // is a systematic bias, MEASURED at stage 1b: 64-step ranges on a 200-step run gave
    // ~60% u error from clamping). Calibrate over max(warmup_steps, steps).
    const uint32_t horizon = std::max(cfg.warmup_steps, cfg.steps);
    for (uint32_t s = 0; s < horizon; ++s) {
        reference_step(f, cfg);
        absorb(f);
    }
    for (int k = 0; k < kQ; ++k) {
        double span = r.hi[k] - r.lo[k];
        if (span < 1e-12) span = 1e-12;  // degenerate moments (constant over warmup)
        r.lo[k] -= cfg.range_margin * span;
        r.hi[k] += cfg.range_margin * span;
    }
    return r;
}

namespace {

struct MacroFields {
    std::vector<double> rho;  // (n)
    std::vector<double> u;    // (3*n) component-major
};

MacroFields macroscopic(const std::vector<double>& f, const LbmConfig& cfg) {
    const size_t n = ncell_of(cfg);
    MacroFields out;
    out.rho.assign(n, 0.0);
    out.u.assign(3 * n, 0.0);
    for (size_t cell = 0; cell < n; ++cell) {
        double rho = 0.0, mx = 0.0, my = 0.0, mz = 0.0;
        for (int i = 0; i < kQ; ++i) {
            const double fi = f[i * n + cell];
            rho += fi;
            mx += kVelocities[i][0] * fi;
            my += kVelocities[i][1] * fi;
            mz += kVelocities[i][2] * fi;
        }
        const double rho_safe = std::max(rho, 1e-30);
        out.rho[cell] = rho;
        // Guo: physical velocity u = (ρu + F/2) / ρ; force along +x only.
        out.u[0 * n + cell] = (mx + 0.5 * cfg.force_x) / rho_safe;
        out.u[1 * n + cell] = my / rho_safe;
        out.u[2 * n + cell] = mz / rho_safe;
    }
    return out;
}

}  // namespace

LbmResult run_lbm(const LbmConfig& cfg, const std::filesystem::path* capture_manifest) {
    const size_t n = ncell_of(cfg);
    const VkDeviceSize fbytes = static_cast<VkDeviceSize>(kQ) * n * sizeof(double);
    const size_t nwords = (static_cast<size_t>(kQ) * n + 1) / 2;
    const VkDeviceSize encbytes = static_cast<VkDeviceSize>(nwords) * sizeof(uint32_t);

    const MomentBasis basis = build_moment_basis();
    QuantRanges ranges{};
    if (cfg.quantize) ranges = calibrate_ranges(cfg, basis);

    vk::ComputeContextConfig cc;
    cc.app_name = "lbm-d3q19-me";
    cc.api_version_minor = 2;
    cc.require_float64 = true;
    vk::ComputeContext ctx = vk::ComputeContext::create(cc);
    ctx.assert_deterministic_float_controls();

    auto make_pipe = [&](const uint32_t* spv, size_t words, uint32_t bindings) {
        vk::ComputePipeline::Options o;
        o.spirv = spv;
        o.spirv_word_count = words;
        o.binding_count = bindings;
        o.push_constant_bytes = sizeof(PushParams);
        return vk::ComputePipeline(ctx, o);
    };
    vk::ComputePipeline collide =
        make_pipe(kLbmCollideSpv, sizeof(kLbmCollideSpv) / sizeof(uint32_t), 2);
    vk::ComputePipeline stream_bounce =
        make_pipe(kLbmStreamBounceSpv, sizeof(kLbmStreamBounceSpv) / sizeof(uint32_t), 2);
    vk::ComputePipeline encode =
        make_pipe(kLbmEncodeSpv, sizeof(kLbmEncodeSpv) / sizeof(uint32_t), 4);
    vk::ComputePipeline decode =
        make_pipe(kLbmDecodeSpv, sizeof(kLbmDecodeSpv) / sizeof(uint32_t), 4);

    PushParams pc{cfg.nx, cfg.ny, cfg.nz, 0u, cfg.tau, cfg.force_x};
    const uint32_t groups = static_cast<uint32_t>((n + 63) / 64);

    const std::vector<double> f0 = initial_rest_state(cfg);

    auto trajectory = [&](LbmResult* out) -> std::vector<unsigned char> {
        vk::StorageBuffer fa(ctx, fbytes), fb(ctx, fbytes);
        vk::StorageBuffer enc(ctx, encbytes);
        vk::StorageBuffer mbuf(ctx, sizeof(double) * kQ * kQ);
        vk::StorageBuffer minvbuf(ctx, sizeof(double) * kQ * kQ);
        vk::StorageBuffer rngbuf(ctx, sizeof(double) * 2 * kQ);
        mbuf.upload(basis.m.data(), sizeof(double) * kQ * kQ);
        minvbuf.upload(basis.m_inv.data(), sizeof(double) * kQ * kQ);
        std::array<double, 2 * kQ> rng{};
        for (int k = 0; k < kQ; ++k) {
            rng[k] = ranges.lo[k];
            rng[kQ + k] = ranges.hi[k];
        }
        rngbuf.upload(rng.data(), sizeof(double) * 2 * kQ);

        fa.upload(f0.data(), fbytes);
        fb.fill_zero();
        if (cfg.quantize) {
            // Encode the IC so the persistent state starts quantized (step-0 readback
            // decodes it back — the capture's frame 0 reflects the encoded state).
            enc.fill_zero();
            encode.bind(0, fa);
            encode.bind(1, enc);
            encode.bind(2, mbuf);
            encode.bind(3, rngbuf);
            vk::dispatch(ctx, encode, groups, 1, 1, &pc);
        }

        std::vector<double> hf(static_cast<size_t>(kQ) * n);
        auto readback_state = [&]() {
            if (cfg.quantize) {
                decode.bind(0, enc);
                decode.bind(1, fa);
                decode.bind(2, minvbuf);
                decode.bind(3, rngbuf);
                vk::dispatch(ctx, decode, groups, 1, 1, &pc);
            }
            fa.download(hf.data(), fbytes);
        };
        auto snapshot = [&](uint32_t step) {
            readback_state();
            if (out) {
                MacroFields mac = macroscopic(hf, cfg);
                StepFrame fr;
                fr.step = step;
                fr.rho = std::move(mac.rho);
                fr.u = std::move(mac.u);
                out->frames.push_back(std::move(fr));
            }
        };
        snapshot(0);
        if (out) {
            double mass = 0.0, px = 0.0, py = 0.0, pz = 0.0;
            for (size_t cell = 0; cell < n; ++cell) mass += out->frames[0].rho[cell];
            for (size_t cell = 0; cell < n; ++cell) {
                px += out->frames[0].rho[cell] * out->frames[0].u[0 * n + cell];
                py += out->frames[0].rho[cell] * out->frames[0].u[1 * n + cell];
                pz += out->frames[0].rho[cell] * out->frames[0].u[2 * n + cell];
            }
            out->total_mass_initial = mass;
            out->total_momentum_initial = {px, py, pz};
        }
        for (uint32_t s = 1; s <= cfg.steps; ++s) {
            if (cfg.quantize) {
                decode.bind(0, enc);
                decode.bind(1, fa);
                decode.bind(2, minvbuf);
                decode.bind(3, rngbuf);
                vk::dispatch(ctx, decode, groups, 1, 1, &pc);
            }
            collide.bind(0, fa);
            collide.bind(1, fb);
            vk::dispatch(ctx, collide, groups, 1, 1, &pc);
            stream_bounce.bind(0, fb);
            stream_bounce.bind(1, fa);
            vk::dispatch(ctx, stream_bounce, groups, 1, 1, &pc);
            if (cfg.quantize) {
                enc.fill_zero();
                encode.bind(0, fa);
                encode.bind(1, enc);
                encode.bind(2, mbuf);
                encode.bind(3, rngbuf);
                vk::dispatch(ctx, encode, groups, 1, 1, &pc);
            }
            if (s % cfg.capture_interval == 0 || s == cfg.steps) snapshot(s);
        }
        readback_state();
        if (out) {
            MacroFields mac = macroscopic(hf, cfg);
            double mass = 0.0, px = 0.0, py = 0.0, pz = 0.0;
            for (size_t cell = 0; cell < n; ++cell) {
                mass += mac.rho[cell];
                px += mac.rho[cell] * mac.u[0 * n + cell];
                py += mac.rho[cell] * mac.u[1 * n + cell];
                pz += mac.rho[cell] * mac.u[2 * n + cell];
            }
            out->total_mass_final = mass;
            out->total_momentum_final = {px, py, pz};
            out->ranges_used = ranges;
        }
        std::vector<unsigned char> wit(hf.size() * sizeof(double));
        std::memcpy(wit.data(), hf.data(), wit.size());
        return wit;
    };

    LbmResult result;
    result.determinism_witness_sha256 =
        det::assert_deterministic_run([&] { return trajectory(nullptr); }, 2, 0.0);
    trajectory(&result);

    if (capture_manifest) {
        cap::Manifest m;
        m.schema_version = "1.0.0";
        m.sim = {"lattice-boltzmann-d3q19", "lattice",
                 cfg.quantize ? "frontier-moment-encoded-16bit" : "stack-c-f64"};
        m.stack = {"cpp", "0.0.0", "phase-6-c1-u3"};
        m.config.tier = "test";
        m.config.dims = {static_cast<int64_t>(cfg.nx), static_cast<int64_t>(cfg.ny),
                         static_cast<int64_t>(cfg.nz)};
        m.config.dtype = "f64";
        m.config.seed = cfg.seed;
        m.config.params = {{"tau", cfg.tau},
                           {"force_x_lattice", cfg.force_x},
                           {"quantize_bits", cfg.quantize ? 16.0 : 0.0},
                           {"range_margin", cfg.range_margin},
                           {"warmup_steps", static_cast<double>(cfg.warmup_steps)}};
        m.run.step_count = cfg.steps;
        m.run.capture_interval = cfg.capture_interval;
        m.run.start_utc = utc_now();
        m.payload.format = "hdf5";
        m.payload.path = capture_manifest->stem().string() + ".h5";
        m.determinism = {"bit-exact-same-hw", false, false};

        cap::Hdf5Writer writer(*capture_manifest, m);
        const size_t nc = n;
        for (const StepFrame& fr : result.frames) {
            cap::StepData sd;
            cap::FieldData frho, fu;
            frho.dtype = fu.dtype = "f64";
            frho.shape = {static_cast<int64_t>(cfg.nx), static_cast<int64_t>(cfg.ny),
                          static_cast<int64_t>(cfg.nz)};
            fu.shape = {3, static_cast<int64_t>(cfg.nx), static_cast<int64_t>(cfg.ny),
                        static_cast<int64_t>(cfg.nz)};
            frho.bytes.resize(nc * sizeof(double));
            std::memcpy(frho.bytes.data(), fr.rho.data(), frho.bytes.size());
            fu.bytes.resize(3 * nc * sizeof(double));
            std::memcpy(fu.bytes.data(), fr.u.data(), fu.bytes.size());
            sd.fields.emplace("rho", std::move(frho));
            sd.fields.emplace("u", std::move(fu));
            double rho_min = 1e300, rho_max = -1e300, u_max = 0.0;
            for (size_t cidx = 0; cidx < nc; ++cidx) {
                rho_min = std::min(rho_min, fr.rho[cidx]);
                rho_max = std::max(rho_max, fr.rho[cidx]);
            }
            for (size_t v = 0; v < 3 * nc; ++v) u_max = std::max(u_max, std::fabs(fr.u[v]));
            sd.diagnostics["rho_min"] = rho_min;
            sd.diagnostics["rho_max"] = rho_max;
            sd.diagnostics["u_max_lat"] = u_max;
            writer.write_step(fr.step, sd);
        }
        writer.finalize();
    }
    return result;
}

}  // namespace bit_physics::lbm_d3q19_me
