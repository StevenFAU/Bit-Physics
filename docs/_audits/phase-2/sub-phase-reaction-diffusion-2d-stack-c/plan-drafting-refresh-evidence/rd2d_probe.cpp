// Faithful scratch RD-2D Gray-Scott step-1 cross-stack measurement.
//
// reaction-diffusion-2d-stack-c plan-drafting-refresh probe, item (c):
// build a faithful Vulkan/C++ f64 port of the RD-2D step against the
// §1.9.1-cpp surface (common_cpp.hpp / vkcompute), feed the IDENTICAL
// NumPy-generated f64 IC, run ONE dispatch on lavapipe, and measure
// step-1 max_abs_err vs the Phase-1 NumPy f64 reference. Bit-exactness
// (max_abs_err == 0.0) => verdict-shape (a); residual => (b)/(c).
//
// Exercises: ComputeContext(require_float64), assert_deterministic_float_controls
// (f32-scoped per Q-CPP2), StorageBuffer upload/download, ComputePipeline
// (4 std430 f64 bindings), dispatch. Also runs the dispatch TWICE to witness
// run-to-run determinism (Q-CPP1/Q-CPP3).

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <cmath>
#include <fstream>
#include <vector>
#include <string>

#include "bit_physics/common/vulkan_compute.hpp"
#include "bit_physics/common/hash.hpp"

namespace vk = bit_physics::common_cpp::vkcompute;
namespace hsh = bit_physics::common_cpp::hash;

static constexpr uint32_t N = 128;
static constexpr size_t   NCELL = size_t(N) * N;
static constexpr size_t   NBYTES = NCELL * sizeof(double);

static std::vector<double> load_f64(const std::string& path, size_t n) {
    std::vector<double> v(n);
    std::ifstream f(path, std::ios::binary);
    if (!f) { std::fprintf(stderr, "cannot open %s\n", path.c_str()); std::exit(2); }
    f.read(reinterpret_cast<char*>(v.data()), std::streamsize(n * sizeof(double)));
    if (size_t(f.gcount()) != n * sizeof(double)) {
        std::fprintf(stderr, "short read %s\n", path.c_str()); std::exit(2);
    }
    return v;
}

static std::vector<uint32_t> load_spirv(const std::string& path) {
    std::ifstream f(path, std::ios::binary | std::ios::ate);
    if (!f) { std::fprintf(stderr, "cannot open %s\n", path.c_str()); std::exit(2); }
    std::streamsize sz = f.tellg();
    f.seekg(0);
    std::vector<uint32_t> words(size_t(sz) / 4);
    f.read(reinterpret_cast<char*>(words.data()), sz);
    return words;
}

struct Diff { double max_abs; size_t ndiff; double max_rel; };

static Diff compare(const std::vector<double>& got, const std::vector<double>& ref) {
    Diff d{0.0, 0, 0.0};
    for (size_t i = 0; i < got.size(); ++i) {
        double a = std::fabs(got[i] - ref[i]);
        if (a > d.max_abs) d.max_abs = a;
        if (a != 0.0) {
            d.ndiff++;
            double denom = std::fabs(ref[i]);
            double r = denom > 0.0 ? a / denom : a;
            if (r > d.max_rel) d.max_rel = r;
        }
    }
    return d;
}

int main() {
    const std::string dir = "/tmp/rd2d_probe/";
    std::vector<double> u0 = load_f64(dir + "u0.f64", NCELL);
    std::vector<double> v0 = load_f64(dir + "v0.f64", NCELL);
    std::vector<double> u1 = load_f64(dir + "u1.f64", NCELL);  // NumPy step-1 ref
    std::vector<double> v1 = load_f64(dir + "v1.f64", NCELL);
    std::vector<uint32_t> spirv = load_spirv(dir + "rd2d_step.spv");

    vk::ComputeContextConfig cfg;
    cfg.app_name = "rd2d-stack-c-probe";
    cfg.api_version_minor = 2;       // FloatControls query needs 1.2
    cfg.require_float64 = true;      // f64 port (charter canonical is f64)
    vk::ComputeContext ctx = vk::ComputeContext::create(cfg);
    std::printf("device      : %s\n", ctx.device_name().c_str());
    std::printf("float64     : %s\n", ctx.float64_enabled() ? "ENABLED" : "NOT-ENABLED");

    // Q-CPP2: assertable levers are f32-scoped. Exercise the socket call and
    // report; the f64 path relies on lavapipe's inherent IEEE-754 f64 + NoContraction.
    auto fc = ctx.query_float_controls();
    std::printf("f32 RTE     : %d | f32 SZINP: %d | f32 denorm-preserve: %d | f32 FTZ: %d\n",
                fc.rounding_mode_rte_f32, fc.signed_zero_inf_nan_preserve_f32,
                fc.denorm_preserve_f32, fc.denorm_flush_to_zero_f32);
    bool fc_assert_ok = true;
    try { ctx.assert_deterministic_float_controls(); }
    catch (const std::exception& e) { fc_assert_ok = false; std::printf("fc assert THREW: %s\n", e.what()); }
    std::printf("fc assert   : %s (f32-scoped)\n", fc_assert_ok ? "PASS" : "FAIL");

    vk::StorageBuffer u_in(ctx, NBYTES), v_in(ctx, NBYTES);
    vk::StorageBuffer u_out(ctx, NBYTES), v_out(ctx, NBYTES);

    vk::ComputePipeline::Options opts;
    opts.spirv = spirv.data();
    opts.spirv_word_count = spirv.size();
    opts.binding_count = 4;
    opts.push_constant_bytes = 0;
    vk::ComputePipeline pipe(ctx, opts);

    const uint32_t g = (N + 7) / 8;  // 16x16 workgroups

    auto run_once = [&](std::vector<double>& ru, std::vector<double>& rv) {
        u_in.upload(u0.data(), NBYTES);
        v_in.upload(v0.data(), NBYTES);
        u_out.fill_zero();
        v_out.fill_zero();
        pipe.bind(0, u_in); pipe.bind(1, v_in); pipe.bind(2, u_out); pipe.bind(3, v_out);
        vk::dispatch(ctx, pipe, g, g, 1, nullptr);
        ru.resize(NCELL); rv.resize(NCELL);
        u_out.download(ru.data(), NBYTES);
        v_out.download(rv.data(), NBYTES);
    };

    std::vector<double> ru1, rv1, ru2, rv2;
    run_once(ru1, rv1);
    run_once(ru2, rv2);

    // Run-to-run determinism witness (Q-CPP1 / Q-CPP3).
    std::string d1 = hsh::sha256_hex(reinterpret_cast<unsigned char*>(ru1.data()), NBYTES)
                   + hsh::sha256_hex(reinterpret_cast<unsigned char*>(rv1.data()), NBYTES);
    std::string d2 = hsh::sha256_hex(reinterpret_cast<unsigned char*>(ru2.data()), NBYTES)
                   + hsh::sha256_hex(reinterpret_cast<unsigned char*>(rv2.data()), NBYTES);
    std::printf("determinism : run1==run2 %s\n", d1 == d2 ? "TRUE (bit-identical)" : "FALSE");

    Diff du = compare(ru1, u1);
    Diff dv = compare(rv1, v1);
    std::printf("\n== step-1 cross-stack seed-difference (Vulkan/C++ f64 lavapipe vs NumPy f64) ==\n");
    std::printf("U: max_abs_err=%.17g  ndiff=%zu/%zu  max_rel_err=%.17g\n", du.max_abs, du.ndiff, NCELL, du.max_rel);
    std::printf("V: max_abs_err=%.17g  ndiff=%zu/%zu  max_rel_err=%.17g\n", dv.max_abs, dv.ndiff, NCELL, dv.max_rel);
    double overall = du.max_abs > dv.max_abs ? du.max_abs : dv.max_abs;
    std::printf("step-1 max_abs_err (both fields) = %.17g\n", overall);
    std::printf("VERDICT-SHAPE ANCHOR: %s\n",
                overall == 0.0 ? "(a) BIT-EXACT (max_abs_err == 0.0)"
                               : "(b)/(c) non-zero seed-difference (MEASURE horizon)");
    return 0;
}
