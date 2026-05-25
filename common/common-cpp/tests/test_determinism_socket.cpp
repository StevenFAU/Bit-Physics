// C-2 gate — determinism socket + FloatControls/NoContraction discipline (Stage 1b).
//
// Charter docs/phases/sub-phase-common-cpp-bootstrap.md § 3 C-2:
//   "assert_deterministic_run(runs=2) bit-identical on lavapipe LP_NUM_THREADS=0
//    + NoContraction shaders. | 2-run readback-digest equality (D4/D13)."
//
// Demonstrates the socket on a real lavapipe dispatch:
//   (1) the socket reproduces the Stage-0/1a determinism baseline a7f85bd4…
//       (contraction-allowed probe) — O-2 ephemeral->production checkpoint-3;
//   (2) the NoContraction (precise) shader is run-to-run bit-identical with a
//       DISTINCT digest 48c92e95… (FMA-contraction discipline; R-CPPB3);
//   (3) FloatControls f32 levers (RTE + signed-zero/inf/nan preserve) are
//       advertised (S0-CPPB2).
//
// The lavapipe pin (VK_DRIVER_FILES + LP_NUM_THREADS=0) is set by CTest.

#include <doctest/doctest.h>

#include <cstdint>
#include <vector>

#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/vulkan_compute.hpp"
#include "determinism_nocontract.spv.h"  // const uint32_t kDeterminismNoContractSpv[]
#include "determinism_probe.spv.h"       // const uint32_t kDeterminismProbeSpv[]

namespace vk = bit_physics::common_cpp::vkcompute;
namespace det = bit_physics::common_cpp::determinism;

namespace {
constexpr uint32_t kN = 4096;
constexpr const char* kContractedBaseline =
    "a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05";
constexpr const char* kNoContractDigest =
    "48c92e95a75d139bb1371e4f1f5bd1131e7126476bd845d7acdaf292a174cbec";

// One dispatch of `spirv` over N=4096 zeroed floats; returns the readback bytes.
std::vector<unsigned char> run_probe(vk::ComputeContext& ctx, const uint32_t* spirv,
                                     std::size_t words) {
    const VkDeviceSize bytes = static_cast<VkDeviceSize>(kN) * sizeof(float);
    vk::StorageBuffer buf(ctx, bytes);
    buf.fill_zero();
    vk::ComputePipeline::Options opts;
    opts.spirv = spirv;
    opts.spirv_word_count = words;
    opts.binding_count = 1;
    vk::ComputePipeline pipe(ctx, opts);
    pipe.bind(0, buf);
    vk::dispatch(ctx, pipe, (kN + 63) / 64);
    std::vector<unsigned char> out(static_cast<size_t>(bytes));
    buf.download(out.data(), out.size());
    return out;
}
}  // namespace

TEST_CASE("C-2 FloatControls f32 levers are advertised (S0-CPPB2)") {
    vk::ComputeContext ctx = vk::ComputeContext::create();
    auto fc = ctx.query_float_controls();
    CHECK(fc.rounding_mode_rte_f32);                 // RTE assertable (NumPy match)
    CHECK(fc.signed_zero_inf_nan_preserve_f32);      // assertable
    // denorm preserve/FTZ NOT pinnable on lavapipe (S0-CPPB2) — documented, not required.
    MESSAGE("denorm_preserve=" << fc.denorm_preserve_f32
                               << " denorm_ftz=" << fc.denorm_flush_to_zero_f32);
    CHECK_NOTHROW(ctx.assert_deterministic_float_controls());
}

TEST_CASE("C-2 determinism socket reproduces the Stage-0 baseline (O-2 ckpt-3)") {
    vk::ComputeContext ctx = vk::ComputeContext::create();
    det::DeterministicContext dctx(/*seed=*/42);
    CHECK(det::is_deterministic());
    CHECK(det::get_seed() == 42u);

    std::string digest = det::assert_deterministic_run(
        [&] {
            return run_probe(ctx, kDeterminismProbeSpv,
                             sizeof(kDeterminismProbeSpv) / sizeof(uint32_t));
        },
        /*runs=*/2);
    // Contraction-allowed probe == the Stage-0/1a substrate baseline.
    CHECK(digest == kContractedBaseline);
}

TEST_CASE("C-2 NoContraction shader is bit-identical with a distinct digest") {
    vk::ComputeContext ctx = vk::ComputeContext::create();
    std::string digest = det::assert_deterministic_run(
        [&] {
            return run_probe(ctx, kDeterminismNoContractSpv,
                             sizeof(kDeterminismNoContractSpv) / sizeof(uint32_t));
        },
        /*runs=*/2);
    // NoContraction (precise) is run-to-run bit-identical, but lavapipe contracts
    // the default probe, so this digest DIFFERS from the contracted baseline.
    CHECK(digest == kNoContractDigest);
    CHECK(digest != kContractedBaseline);
}

TEST_CASE("DeterministicContext restores prior seed state on scope exit") {
    CHECK_FALSE(det::is_deterministic());
    {
        det::DeterministicContext a(7);
        CHECK(det::is_deterministic());
        CHECK(det::get_seed() == 7u);
    }
    CHECK_FALSE(det::is_deterministic());
}
