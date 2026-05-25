// R-A1 ephemeral Vulkan/C++ determinism digest — RD-2D-Stack-C Stage 0.
//
// Establishes RD-2D-Stack-C's OWN within-stack determinism anchor (§L.7 O-2
// ckpt 1), distinct from the refresh-probe faithfulness measurement (step-1 vs
// NumPy). Runs a representative EPHEMERAL multi-step Gray-Scott f64 kernel
// (K steps, NoContraction) on lavapipe N times and asserts bit-identity across
// all runs (smoke-E/LBM-E precedent: 6/6). The shared digest is the R-A1 anchor.
// The PRODUCTION canonical 2000-step run + capture is Stage 1b/1c (not here).

#include <cstdint>
#include <cstdio>
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
static constexpr uint32_t K = 100;   // ephemeral representative horizon
static constexpr int      RUNS = 6;  // smoke-E / LBM-E precedent

static std::vector<double> load_f64(const std::string& p, size_t n) {
    std::vector<double> v(n);
    std::ifstream f(p, std::ios::binary);
    if (!f) { std::fprintf(stderr, "open %s\n", p.c_str()); std::exit(2); }
    f.read(reinterpret_cast<char*>(v.data()), std::streamsize(n * sizeof(double)));
    return v;
}
static std::vector<uint32_t> load_spv(const std::string& p) {
    std::ifstream f(p, std::ios::binary | std::ios::ate);
    if (!f) { std::fprintf(stderr, "open %s\n", p.c_str()); std::exit(2); }
    std::streamsize sz = f.tellg(); f.seekg(0);
    std::vector<uint32_t> w(size_t(sz) / 4);
    f.read(reinterpret_cast<char*>(w.data()), sz);
    return w;
}

int main() {
    const std::string dir = "/tmp/rd2d_probe/";
    std::vector<double> u0 = load_f64(dir + "u0.f64", NCELL);
    std::vector<double> v0 = load_f64(dir + "v0.f64", NCELL);
    std::vector<uint32_t> spv = load_spv(dir + "rd2d_step.spv");

    vk::ComputeContextConfig cfg;
    cfg.app_name = "rd2d-stack-c-stage0-ra1";
    cfg.api_version_minor = 2;
    cfg.require_float64 = true;
    vk::ComputeContext ctx = vk::ComputeContext::create(cfg);
    std::printf("device=%s float64=%s\n", ctx.device_name().c_str(),
                ctx.float64_enabled() ? "ENABLED" : "NO");
    bool fc_ok = true;
    try { ctx.assert_deterministic_float_controls(); }   // Q-CPP2 (f32-scoped)
    catch (const std::exception& e) { fc_ok = false; std::printf("fc THREW %s\n", e.what()); }
    std::printf("FloatControls assert at pipeline-context: %s (f32-scoped)\n", fc_ok ? "PASS" : "FAIL");

    vk::StorageBuffer a_u(ctx, NBYTES), a_v(ctx, NBYTES), b_u(ctx, NBYTES), b_v(ctx, NBYTES);
    vk::ComputePipeline::Options o;
    o.spirv = spv.data(); o.spirv_word_count = spv.size(); o.binding_count = 4;
    vk::ComputePipeline pipe(ctx, o);
    const uint32_t g = (N + 7) / 8;

    auto run = [&]() -> std::string {
        a_u.upload(u0.data(), NBYTES); a_v.upload(v0.data(), NBYTES);
        b_u.fill_zero(); b_v.fill_zero();
        vk::StorageBuffer *cu = &a_u, *cv = &a_v, *ou = &b_u, *ov = &b_v;
        for (uint32_t s = 0; s < K; ++s) {
            pipe.bind(0, *cu); pipe.bind(1, *cv); pipe.bind(2, *ou); pipe.bind(3, *ov);
            vk::dispatch(ctx, pipe, g, g, 1, nullptr);
            std::swap(cu, ou); std::swap(cv, ov);
        }
        std::vector<double> ru(NCELL), rv(NCELL);
        cu->download(ru.data(), NBYTES); cv->download(rv.data(), NBYTES);
        return hsh::sha256_hex(reinterpret_cast<unsigned char*>(ru.data()), NBYTES)
             + hsh::sha256_hex(reinterpret_cast<unsigned char*>(rv.data()), NBYTES);
    };

    std::string first = run();
    int identical = 1;
    for (int r = 1; r < RUNS; ++r) if (run() == first) ++identical;
    // R-A1 digest = sha256 of the concatenated (sha256(U)||sha256(V)) witness.
    std::string ra1 = hsh::sha256_hex(
        reinterpret_cast<const unsigned char*>(first.data()), first.size());
    std::printf("multi-run bit-identity: %d/%d\n", identical, RUNS);
    std::printf("K(ephemeral steps)=%u  N=%u  posture=NoContraction(f64)\n", K, N);
    std::printf("R-A1 ephemeral determinism digest (sha256-of-content): %s\n", ra1.c_str());
    std::printf("witness(U||V) sha-pair: %s\n", first.c_str());
    return identical == RUNS ? 0 : 1;
}
