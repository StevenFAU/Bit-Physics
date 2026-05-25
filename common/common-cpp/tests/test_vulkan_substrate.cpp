// C-3 gate — Vulkan compute substrate (Stage 1a).
//
// Charter docs/phases/sub-phase-common-cpp-bootstrap.md § 3 C-3:
//   "instance/device/compute-queue/pipeline/buffer-IO/dispatch/readback runs
//    end-to-end headless on lavapipe."
//
// Hard Rule 2 (substrate determinism): the production substrate must reproduce
// the Stage-0 ephemeral determinism baseline digest a7f85bd4…2844f05 (§ L.7 O-2
// ephemeral→production chain, ckpt-2). The test runs the SAME element-wise
// computation (N=4096 floats, determinism_probe.comp) through the production
// substrate, reads back, and asserts the sha256 of the readback matches.
//
// The lavapipe pin (VK_DRIVER_FILES=lvp_icd.json, LP_NUM_THREADS=0) is set by
// CTest (set_tests_properties ... ENVIRONMENT) so the digest is reproducible.

#include <doctest/doctest.h>

#include <cstdint>
#include <cstring>
#include <vector>

#include "bit_physics/common/vulkan_compute.hpp"
#include "determinism_probe.spv.h"  // generated: const uint32_t kDeterminismProbeSpv[]
#include "sha256_util.hpp"          // test-only; delegates to lib hash::sha256_hex

namespace vk = bit_physics::common_cpp::vkcompute;
namespace bptest = bit_physics::common_cpp::test;

namespace {
constexpr uint32_t kN = 4096;  // matches the Stage-0 probe
constexpr const char* kBaselineDigest =
    "a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05";
}  // namespace

TEST_CASE("C-3 substrate runs end-to-end headless and selects lavapipe") {
    vk::ComputeContext ctx = vk::ComputeContext::create();
    MESSAGE("device: " << ctx.device_name());
    // Under the VK_DRIVER_FILES lavapipe pin the single device is the CPU ICD
    // (PHYSICAL_DEVICE_TYPE_CPU). The determinism contract is pinned to it (D4).
    CHECK(ctx.device_type() == VK_PHYSICAL_DEVICE_TYPE_CPU);
    // Default config: f32 contract, no f64 enable (charter § 1 / R-CPPB1).
    CHECK_FALSE(ctx.float64_enabled());
}

TEST_CASE("C-3 substrate reproduces the Stage-0 determinism baseline digest") {
    vk::ComputeContext ctx = vk::ComputeContext::create();

    const VkDeviceSize bytes = static_cast<VkDeviceSize>(kN) * sizeof(float);
    vk::StorageBuffer buf(ctx, bytes);
    buf.fill_zero();  // deterministic init (matches the probe's memset)

    vk::ComputePipeline::Options opts;
    opts.spirv = kDeterminismProbeSpv;
    opts.spirv_word_count = sizeof(kDeterminismProbeSpv) / sizeof(uint32_t);
    opts.binding_count = 1;
    vk::ComputePipeline pipe(ctx, opts);
    pipe.bind(0, buf);

    vk::dispatch(ctx, pipe, (kN + 63) / 64);  // 64 workgroups of local_size_x=64

    std::vector<uint8_t> readback(static_cast<size_t>(bytes));
    buf.download(readback.data(), readback.size());

    // Sanity (the Stage-0 evidence pins these): out[0]=0.125, out[1]≈0.12755.
    float f0 = 0.0f, f1 = 0.0f;
    std::memcpy(&f0, readback.data(), sizeof(float));
    std::memcpy(&f1, readback.data() + sizeof(float), sizeof(float));
    CHECK(f0 == doctest::Approx(0.125f));
    CHECK(f1 == doctest::Approx(0.12755f).epsilon(1e-4));

    // Hard Rule 2: the production substrate reproduces the Stage-0 digest.
    std::string digest = bptest::sha256_hex(readback.data(), readback.size());
    CHECK(digest == kBaselineDigest);
}

TEST_CASE("C-3 substrate dispatch is idempotent (run-to-run bit-identical)") {
    // Substrate-level sanity only; the determinism socket (assert_deterministic_run,
    // canonical-scale 2-run) is Stage 1b (charter § 2 / C-2), not asserted here.
    vk::ComputeContext ctx = vk::ComputeContext::create();
    const VkDeviceSize bytes = static_cast<VkDeviceSize>(kN) * sizeof(float);

    auto run_once = [&]() {
        vk::StorageBuffer buf(ctx, bytes);
        buf.fill_zero();
        vk::ComputePipeline::Options opts;
        opts.spirv = kDeterminismProbeSpv;
        opts.spirv_word_count = sizeof(kDeterminismProbeSpv) / sizeof(uint32_t);
        opts.binding_count = 1;
        vk::ComputePipeline pipe(ctx, opts);
        pipe.bind(0, buf);
        vk::dispatch(ctx, pipe, (kN + 63) / 64);
        std::vector<uint8_t> out(static_cast<size_t>(bytes));
        buf.download(out.data(), out.size());
        return bptest::sha256_hex(out.data(), out.size());
    };

    CHECK(run_once() == run_once());
}
