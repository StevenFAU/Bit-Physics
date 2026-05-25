// Gray-Scott Stack-C — Stage-1b Vulkan/C++ f64 NoContraction implementation.
//
// Consumes the §1.9.1-cpp substrate: vkcompute (compute context + storage
// buffers + pipeline + dispatch), capture (Hdf5Reader/Writer), determinism
// (DeterministicContext + assert_deterministic_run), hash (sha256_hex).
// Posture: f64 (require_float64) + NoContraction (precise shaders; Q-CPP1);
// lavapipe element-wise no-atomics determinism (Q-CPP3). FloatControls assertion
// is f32-scoped (Q-CPP2/D16) — the f64 path relies on inherent IEEE-754 f64 +
// NoContraction (verified bit-exact at the refresh probe + Stage-0 R-A1).

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <ctime>
#include <functional>
#include <limits>
#include <memory>
#include <stdexcept>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/hash.hpp"
#include "bit_physics/common/vulkan_compute.hpp"

#include "gray_scott_2d.spv.h"      // const uint32_t kGrayScott2dSpv[]
#include "gray_scott_2d_mms.spv.h"  // const uint32_t kGrayScott2dMmsSpv[]

namespace bit_physics::reaction_diffusion_2d_stack_c {

namespace vk = bit_physics::common_cpp::vkcompute;
namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;
namespace hsh = bit_physics::common_cpp::hash;

namespace {

// Push-constant block — MUST match shaders/gray_scott_2d*.comp `Params`
// (std430 push_constant: nx@0, ny@4, then f64s 8-byte-aligned from offset 8).
struct PushParams {
    uint32_t nx;
    uint32_t ny;
    double   Du;
    double   Dv;
    double   F;
    double   k;
    double   dx;
    double   dt;
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

double max_abs(const std::vector<double>& a) {
    double m = 0.0;
    for (double x : a) m = std::max(m, std::fabs(x));
    return m;
}

double sum(const std::vector<double>& a) {
    double s = 0.0;
    for (double x : a) s += x;
    return s;
}

}  // namespace

Fields load_reference_ic(const std::filesystem::path& manifest_json) {
    cap::Hdf5Reader reader(manifest_json);
    cap::StepData s0 = reader.read_step(0);
    auto it_u = s0.fields.find("U");
    auto it_v = s0.fields.find("V");
    if (it_u == s0.fields.end() || it_v == s0.fields.end())
        throw std::runtime_error("reference capture step-0 missing U/V fields");
    Fields ic;
    ic.u.resize(it_u->second.bytes.size() / sizeof(double));
    ic.v.resize(it_v->second.bytes.size() / sizeof(double));
    std::memcpy(ic.u.data(), it_u->second.bytes.data(), it_u->second.bytes.size());
    std::memcpy(ic.v.data(), it_v->second.bytes.data(), it_v->second.bytes.size());
    return ic;
}

GrayScottResult run_gray_scott(const GrayScottConfig& cfg, const Fields& ic,
                               const std::filesystem::path* capture_manifest) {
    const size_t ncell = static_cast<size_t>(cfg.n) * cfg.n;
    if (ic.u.size() != ncell || ic.v.size() != ncell)
        throw std::runtime_error("IC size does not match cfg.n*cfg.n");

    det::DeterministicContext dctx(cfg.seed);

    vk::ComputeContextConfig cc;
    cc.app_name = "rd2d-stack-c";
    cc.api_version_minor = 2;       // FloatControls query (Q-CPP2)
    cc.require_float64 = true;      // f64 port (D12)
    vk::ComputeContext ctx = vk::ComputeContext::create(cc);
    ctx.assert_deterministic_float_controls();  // f32 RTE+SZINP (Q-CPP2); f64 path is IEEE-754+NoContraction

    const VkDeviceSize bytes = static_cast<VkDeviceSize>(ncell) * sizeof(double);
    vk::ComputePipeline::Options opts;
    opts.spirv = kGrayScott2dSpv;
    opts.spirv_word_count = sizeof(kGrayScott2dSpv) / sizeof(uint32_t);
    opts.binding_count = 4;
    opts.push_constant_bytes = sizeof(PushParams);
    vk::ComputePipeline pipe(ctx, opts);
    PushParams pc{cfg.n, cfg.n, cfg.Du, cfg.Dv, cfg.F, cfg.k, cfg.dx, cfg.dt};
    const uint32_t g = (cfg.n + 7) / 8;

    // One full trajectory; `collect` (if non-null) receives every captured frame.
    auto trajectory = [&](GrayScottResult* out) -> std::vector<unsigned char> {
        vk::StorageBuffer ua(ctx, bytes), va(ctx, bytes), ub(ctx, bytes), vb(ctx, bytes);
        ua.upload(ic.u.data(), bytes);
        va.upload(ic.v.data(), bytes);
        ub.fill_zero();
        vb.fill_zero();
        vk::StorageBuffer *cu = &ua, *cv = &va, *ou = &ub, *ov = &vb;

        std::vector<double> hu(ncell), hv(ncell);
        auto snapshot = [&](uint32_t step) {
            cu->download(hu.data(), bytes);
            cv->download(hv.data(), bytes);
            if (out) {
                out->captured_steps.push_back(step);
                out->captured_fields.push_back(Fields{hu, hv});
                out->max_field_trajectory.push_back(std::max(max_abs(hu), max_abs(hv)));
            }
        };
        snapshot(0);  // step 0 = IC (matches reference frame 0 by construction; S1b-RD2C1)
        for (uint32_t s = 1; s <= cfg.steps; ++s) {
            pipe.bind(0, *cu); pipe.bind(1, *cv); pipe.bind(2, *ou); pipe.bind(3, *ov);
            vk::dispatch(ctx, pipe, g, g, 1, &pc);
            std::swap(cu, ou); std::swap(cv, ov);
            if (s % cfg.capture_interval == 0) snapshot(s);
        }
        // final field as the determinism witness payload (U||V).
        cu->download(hu.data(), bytes);
        cv->download(hv.data(), bytes);
        if (out) { out->final_u = hu; out->final_v = hv; }
        std::vector<unsigned char> wit(2 * bytes);
        std::memcpy(wit.data(), hu.data(), bytes);
        std::memcpy(wit.data() + bytes, hv.data(), bytes);
        return wit;
    };

    GrayScottResult result;
    // O-2 ckpt 3: 2-run bit-identical determinism (tolerance 0.0; Q-CPP1/Q-CPP3).
    result.determinism_witness = det::assert_deterministic_run(
        [&] { return trajectory(nullptr); }, 2, 0.0);

    // Capturing run (fills result.captured_fields + final fields).
    trajectory(&result);

    // §L.4 bounded characterisation.
    result.bounded = true;
    const double eps = 1e-9;
    double init_max = result.max_field_trajectory.empty() ? 0.0 : result.max_field_trajectory.front();
    for (double m : result.max_field_trajectory)
        if (!std::isfinite(m) || m > init_max + 1.0 + eps) result.bounded = false;

    // Optional capture-v1 .h5 (+ .json) — Q-CPP4 conformant (U,V state + mass diagnostics).
    if (capture_manifest) {
        cap::Manifest m;
        m.schema_version = "1.0.0";
        m.sim = {"reaction-diffusion-2d", "continuous-ca", "gray-scott"};
        m.stack = {"cpp", "0.0.0", "stage-1b"};
        m.config.tier = "test";
        m.config.dims = {static_cast<int64_t>(cfg.n), static_cast<int64_t>(cfg.n)};
        m.config.dtype = "f64";
        m.config.seed = cfg.seed;
        m.config.params = {{"Du", cfg.Du}, {"Dv", cfg.Dv}, {"F", cfg.F},
                           {"k", cfg.k}, {"dx", cfg.dx}, {"dt", cfg.dt}};
        m.run.step_count = cfg.steps;
        m.run.capture_interval = cfg.capture_interval;
        m.run.start_utc = utc_now();
        m.payload.format = "hdf5";  // Q-CPP4 / S1c-CPPB2
        m.payload.path = capture_manifest->stem().string() + ".h5";
        m.determinism = {"bit-exact-same-hw", false, false};

        cap::Hdf5Writer writer(*capture_manifest, m);
        for (size_t f = 0; f < result.captured_steps.size(); ++f) {
            const Fields& fr = result.captured_fields[f];
            cap::StepData sd;
            cap::FieldData fu, fv;
            fu.dtype = fv.dtype = "f64";
            fu.shape = fv.shape = {static_cast<int64_t>(cfg.n), static_cast<int64_t>(cfg.n)};
            fu.bytes.resize(bytes); std::memcpy(fu.bytes.data(), fr.u.data(), bytes);
            fv.bytes.resize(bytes); std::memcpy(fv.bytes.data(), fr.v.data(), bytes);
            sd.fields.emplace("U", std::move(fu));
            sd.fields.emplace("V", std::move(fv));
            sd.diagnostics["mass_U"] = sum(fr.u);
            sd.diagnostics["mass_V"] = sum(fr.v);
            writer.write_step(result.captured_steps[f], sd);
        }
        writer.finalize();
    }
    return result;
}

// ---- gate-4 MMS observed order of accuracy (manufactured-source kernel) ------

namespace {

// Manufactured solution (solution.py): u=(sin(kx)cos(ky)cos t+2)/4, v=(cos(kx)sin(ky)sin t+2)/4.
struct Mms {
    double L = 1.0, Du = 0.16, Dv = 0.08, F = 0.0367, k = 0.0649;
    double kk() const { return M_PI / L; }
    void exact(uint32_t n, double dx, double t, std::vector<double>& u, std::vector<double>& v) const {
        const double K = kk();
        for (uint32_t j = 0; j < n; ++j)
            for (uint32_t i = 0; i < n; ++i) {
                double x = i * dx, y = j * dx;
                u[j * n + i] = (std::sin(K * x) * std::cos(K * y) * std::cos(t) + 2.0) / 4.0;
                v[j * n + i] = (std::cos(K * x) * std::sin(K * y) * std::sin(t) + 2.0) / 4.0;
            }
    }
    void source(uint32_t n, double dx, double t, std::vector<double>& su, std::vector<double>& sv) const {
        const double K = kk(), ct = std::cos(t), st = std::sin(t);
        for (uint32_t j = 0; j < n; ++j)
            for (uint32_t i = 0; i < n; ++i) {
                double x = i * dx, y = j * dx;
                double sx = std::sin(K * x), cx = std::cos(K * x);
                double sy = std::sin(K * y), cy = std::cos(K * y);
                double u = (sx * cy * ct + 2.0) / 4.0;
                double vv = (cx * sy * st + 2.0) / 4.0;
                double u_t = -st * sx * cy / 4.0;
                double lap_u = -2.0 * K * K * sx * cy * ct / 4.0;
                double v_t = ct * cx * sy / 4.0;
                double lap_v = -2.0 * K * K * cx * sy * st / 4.0;
                su[j * n + i] = u_t - Du * lap_u + u * vv * vv - F * (1.0 - u);
                sv[j * n + i] = v_t - Dv * lap_v - u * vv * vv + (F + k) * vv;
            }
    }
};

double l2_error(const std::vector<double>& un, const std::vector<double>& vn,
                const std::vector<double>& ue, const std::vector<double>& ve, double dx) {
    double s = 0.0;
    for (size_t i = 0; i < un.size(); ++i) {
        double du = un[i] - ue[i], dv = vn[i] - ve[i];
        s += du * du + dv * dv;
    }
    return std::sqrt(s * dx * dx);  // discrete L2 over the cell area
}

}  // namespace

double mms_observed_l2_order(const std::vector<uint32_t>& grid_ladder, double t_final) {
    Mms mms;
    vk::ComputeContextConfig cc;
    cc.app_name = "rd2d-stack-c-mms";
    cc.api_version_minor = 2;
    cc.require_float64 = true;
    vk::ComputeContext ctx = vk::ComputeContext::create(cc);
    ctx.assert_deterministic_float_controls();

    std::vector<double> errors;
    std::vector<double> dxs;
    for (uint32_t n : grid_ladder) {
        const double dx = 2.0 * mms.L / n;  // domain [0,2L]^2 (full period; spec-ref-stack-d)
        const double dt_cfl = 0.4 * dx * dx / (4.0 * std::max(mms.Du, mms.Dv));
        const uint32_t nsteps = std::max<uint32_t>(1, static_cast<uint32_t>(std::round(t_final / dt_cfl)));
        const double dt = t_final / nsteps;  // hit t_final exactly
        const size_t ncell = static_cast<size_t>(n) * n;
        const VkDeviceSize bytes = static_cast<VkDeviceSize>(ncell) * sizeof(double);

        vk::ComputePipeline::Options opts;
        opts.spirv = kGrayScott2dMmsSpv;
        opts.spirv_word_count = sizeof(kGrayScott2dMmsSpv) / sizeof(uint32_t);
        opts.binding_count = 6;  // u_in,v_in,u_out,v_out,src_u,src_v
        opts.push_constant_bytes = sizeof(PushParams);
        vk::ComputePipeline pipe(ctx, opts);
        PushParams pc{n, n, mms.Du, mms.Dv, mms.F, mms.k, dx, dt};
        const uint32_t g = (n + 7) / 8;

        vk::StorageBuffer ua(ctx, bytes), va(ctx, bytes), ub(ctx, bytes), vb(ctx, bytes);
        vk::StorageBuffer su(ctx, bytes), sv(ctx, bytes);
        std::vector<double> u(ncell), v(ncell), hsu(ncell), hsv(ncell);
        mms.exact(n, dx, 0.0, u, v);
        ua.upload(u.data(), bytes); va.upload(v.data(), bytes);
        ub.fill_zero(); vb.fill_zero();
        vk::StorageBuffer *cu = &ua, *cv = &va, *ou = &ub, *ov = &vb;

        for (uint32_t s = 0; s < nsteps; ++s) {
            mms.source(n, dx, s * dt, hsu, hsv);
            su.upload(hsu.data(), bytes); sv.upload(hsv.data(), bytes);
            pipe.bind(0, *cu); pipe.bind(1, *cv); pipe.bind(2, *ou); pipe.bind(3, *ov);
            pipe.bind(4, su);  pipe.bind(5, sv);
            vk::dispatch(ctx, pipe, g, g, 1, &pc);
            std::swap(cu, ou); std::swap(cv, ov);
        }
        std::vector<double> un(ncell), vn(ncell), ue(ncell), ve(ncell);
        cu->download(un.data(), bytes); cv->download(vn.data(), bytes);
        mms.exact(n, dx, t_final, ue, ve);
        errors.push_back(l2_error(un, vn, ue, ve, dx));
        dxs.push_back(dx);
    }
    // Asymptotic observed order from the two finest grids.
    const size_t m = errors.size();
    if (m < 2) return std::numeric_limits<double>::quiet_NaN();
    return std::log(errors[m - 2] / errors[m - 1]) / std::log(dxs[m - 2] / dxs[m - 1]);
}

}  // namespace bit_physics::reaction_diffusion_2d_stack_c
