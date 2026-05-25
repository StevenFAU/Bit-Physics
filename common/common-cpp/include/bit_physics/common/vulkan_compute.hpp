// Vulkan headless compute substrate (Stack-C / common-cpp).
//
// Sub-phase: sub-phase-common-cpp-bootstrap, Stage 1a (gate C-3). Charter
// docs/phases/sub-phase-common-cpp-bootstrap.md § 2 row "Stage 1a" + § 3 C-3.
//
// This is the PRODUCTION compute substrate the Stack-C per-sim ports consume.
// It is the durable analog of the Stage-0 ephemeral determinism probe
// (docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence/
// determinism-probe-host.cpp) — § L.7 O-2 ephemeral→production chain, ckpt-2.
//
// SCOPE (Stage 1a, per charter § 2):
//   instance / physical+logical device / compute queue / command pool+buffers /
//   descriptor set layout+pool+set / pipeline layout / compute pipeline /
//   SPIR-V shader module / buffer alloc-upload-readback / fence sync.
//   Headless compute ONLY — no swapchain / present / ImGui (those stay
//   declarations-only in vulkan_init.hpp per § 8 + § 1 "What this is NOT").
//
// OUT OF SCOPE here (charter assigns elsewhere — do NOT add in 1a):
//   - FloatControls / NoContraction determinism DISCIPLINE — Stage 1b
//     (charter § 2 row "Stage 1b"). The pipeline-creation path below exposes
//     a documented extension point (ComputePipeline::Options::pipeline_pnext)
//     so 1b can attach the FloatControls execution-mode chain additively,
//     but 1a does NOT assert FloatControls.
//   - assert_deterministic_run / DeterministicContext — Stage 1b.
//   - HDF5 / HighFive capture — Stage 1b.
//
// Determinism posture (S0-CPPB3): the substrate favours a no-atomics,
// element-wise, single-dispatch-per-submit + fence-wait execution path, which
// is bit-identical regardless of lavapipe thread count. Lavapipe is selected
// out-of-band via VK_DRIVER_FILES (D14); LP_NUM_THREADS=0 (D4) is the
// determinism lever the caller sets in the environment.

#pragma once

#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>

#include <vulkan/vulkan.h>

namespace bit_physics::common_cpp::vkcompute {

// Thrown on any VkResult != VK_SUCCESS or substrate precondition failure.
// Carries the failing call site and (for VkResult failures) the result code.
class VulkanError : public std::runtime_error {
public:
    explicit VulkanError(const std::string& message) : std::runtime_error(message) {}
};

struct ComputeContextConfig {
    std::string app_name = "bit-physics-common-cpp";
    // Vulkan API version to request on the instance. 1.1 is sufficient for the
    // bootstrap compute path (matches the Stage-0 probe); FloatControls (1b)
    // needs 1.2 / VK_KHR_shader_float_controls — bumped there, additively.
    uint32_t api_version_major = 1;
    uint32_t api_version_minor = 1;
    // Enable VK_LAYER_KHRONOS_validation (development only). If requested but
    // unavailable, creation proceeds WITHOUT validation (no hard failure) and
    // validation_enabled() reports false — lavapipe CI may not ship the layer.
    bool enable_validation = false;
    // Enable the shaderFloat64 device feature (S0-CPPB1: available on lavapipe).
    // Default off — the bootstrap contract is f32-vs-f32 (charter § 1 / § 5
    // R-CPPB1). Future f64 Stack-C ports flip this on.
    bool require_float64 = false;
};

// Owns the Vulkan instance, the selected physical device, the logical device,
// the compute queue, and a command pool. The first enumerated physical device
// is selected: under VK_DRIVER_FILES=lvp_icd.json (D14) that is lavapipe, the
// single device the determinism contract is pinned to.
//
// Resource lifetime is RAII; destruction order is the reverse of creation
// (command pool -> device -> debug messenger -> instance). Move-only.
class ComputeContext {
public:
    static ComputeContext create(const ComputeContextConfig& config = {});

    ComputeContext() = default;
    ~ComputeContext();

    ComputeContext(const ComputeContext&) = delete;
    ComputeContext& operator=(const ComputeContext&) = delete;
    ComputeContext(ComputeContext&& other) noexcept;
    ComputeContext& operator=(ComputeContext&& other) noexcept;

    VkInstance       instance() const { return instance_; }
    VkPhysicalDevice physical() const { return physical_; }
    VkDevice         device() const { return device_; }
    VkQueue          queue() const { return queue_; }
    uint32_t         queue_family() const { return queue_family_; }
    VkCommandPool    command_pool() const { return command_pool_; }

    const std::string& device_name() const { return device_name_; }
    // VK_PHYSICAL_DEVICE_TYPE_* of the selected device (CPU for lavapipe).
    VkPhysicalDeviceType device_type() const { return device_type_; }
    // True iff shaderFloat64 was advertised AND enabled at device creation.
    bool float64_enabled() const { return float64_enabled_; }
    bool validation_enabled() const { return validation_enabled_; }

    // VkPhysicalDeviceFloatControlsProperties (f32) levers, queried via
    // vkGetPhysicalDeviceProperties2 (Stage 1b; S0-CPPB2). On lavapipe: RTE +
    // signed-zero/inf/nan preserve are advertised (assertable NumPy-match
    // levers); denorm preserve/FTZ are NOT (residual near-zero risk → quirks
    // catalog, Stage 2).
    struct FloatControls {
        bool rounding_mode_rte_f32 = false;
        bool signed_zero_inf_nan_preserve_f32 = false;
        bool denorm_preserve_f32 = false;
        bool denorm_flush_to_zero_f32 = false;
    };
    FloatControls query_float_controls() const;
    // Assert the determinism-relevant f32 levers (RTE rounding +
    // signed-zero/inf/nan preserve) are advertised; throws VulkanError if not
    // (Stage-1b Hard-Rule-2 condition). Denorm behaviour is NOT assertable on
    // lavapipe (S0-CPPB2) — documented, not asserted.
    void assert_deterministic_float_controls() const;

private:
    void destroy() noexcept;

    VkInstance               instance_ = VK_NULL_HANDLE;
    VkDebugUtilsMessengerEXT messenger_ = VK_NULL_HANDLE;
    VkPhysicalDevice         physical_ = VK_NULL_HANDLE;  // owned by instance
    VkDevice                 device_ = VK_NULL_HANDLE;
    VkQueue                  queue_ = VK_NULL_HANDLE;      // owned by device
    VkCommandPool            command_pool_ = VK_NULL_HANDLE;
    uint32_t                 queue_family_ = 0;
    std::string              device_name_;
    VkPhysicalDeviceType     device_type_ = VK_PHYSICAL_DEVICE_TYPE_OTHER;
    bool                     float64_enabled_ = false;
    bool                     validation_enabled_ = false;
};

// A storage buffer backed by HOST_VISIBLE | HOST_COHERENT memory, persistently
// mapped. On lavapipe (CPU device) host-visible memory is the device memory, so
// this is the natural zero-copy path; for a future real-GPU backend a
// device-local + staging path would be added (banked — out of bootstrap scope).
// Move-only; the mapping is valid for the buffer's lifetime.
class StorageBuffer {
public:
    StorageBuffer(const ComputeContext& ctx, VkDeviceSize size_bytes);

    StorageBuffer() = default;
    ~StorageBuffer();

    StorageBuffer(const StorageBuffer&) = delete;
    StorageBuffer& operator=(const StorageBuffer&) = delete;
    StorageBuffer(StorageBuffer&& other) noexcept;
    StorageBuffer& operator=(StorageBuffer&& other) noexcept;

    // Copy `bytes` from `src` into the mapped buffer at `offset` (host-coherent,
    // visible to the device without an explicit flush).
    void upload(const void* src, std::size_t bytes, std::size_t offset = 0);
    // Copy `bytes` out of the mapped buffer at `offset` into `dst`.
    void download(void* dst, std::size_t bytes, std::size_t offset = 0) const;
    // Zero the whole buffer (deterministic initialisation, matching the probe).
    void fill_zero();

    VkBuffer     handle() const { return buffer_; }
    VkDeviceSize size() const { return size_; }
    void*        mapped() const { return mapped_; }

private:
    void destroy() noexcept;

    VkDevice       device_ = VK_NULL_HANDLE;  // non-owning (owned by ComputeContext)
    VkBuffer       buffer_ = VK_NULL_HANDLE;
    VkDeviceMemory memory_ = VK_NULL_HANDLE;
    VkDeviceSize   size_ = 0;
    void*          mapped_ = nullptr;
};

// A compute pipeline built from a SPIR-V module bound to `binding_count`
// storage buffers at descriptor set 0 (bindings 0..binding_count-1), plus an
// optional push-constant block (compute stage). Owns its descriptor set layout,
// pipeline layout, pipeline, descriptor pool, and the (single) descriptor set.
// Move-only.
class ComputePipeline {
public:
    struct Options {
        // SPIR-V words (as emitted by glslangValidator --vn). Required.
        const uint32_t* spirv = nullptr;
        std::size_t     spirv_word_count = 0;
        // Number of std430 storage-buffer bindings at set 0 (0..N-1).
        uint32_t        binding_count = 1;
        // Size in bytes of the compute push-constant block (0 = none).
        uint32_t        push_constant_bytes = 0;
        // Entry-point name in the SPIR-V module.
        const char*     entry_point = "main";
        // EXTENSION POINT (additive, for Stage 1b+): generic pNext for
        // VkComputePipelineCreateInfo. Stage 1b's FloatControls / NoContraction
        // determinism discipline (charter § 2 row "Stage 1b") lands mostly as
        // SPIR-V NoContraction decorations in the shaders + the device float-
        // controls feature; this hook covers any pipeline-creation-time pNext
        // additions 1b needs, so it lands additively without restructuring 1a.
        // Stage 1a leaves this null (no FloatControls assertion — charter § 2).
        const void*     pipeline_pnext = nullptr;
    };

    ComputePipeline(const ComputeContext& ctx, const Options& options);

    ComputePipeline() = default;
    ~ComputePipeline();

    ComputePipeline(const ComputePipeline&) = delete;
    ComputePipeline& operator=(const ComputePipeline&) = delete;
    ComputePipeline(ComputePipeline&& other) noexcept;
    ComputePipeline& operator=(ComputePipeline&& other) noexcept;

    // Point binding `i` of the descriptor set at `buffer` (whole-buffer range).
    // Must be called for every binding before dispatch.
    void bind(uint32_t binding, const StorageBuffer& buffer);

    VkPipeline       pipeline() const { return pipeline_; }
    VkPipelineLayout layout() const { return layout_; }
    VkDescriptorSet  descriptor_set() const { return descriptor_set_; }
    uint32_t         push_constant_bytes() const { return push_constant_bytes_; }

private:
    void destroy() noexcept;

    VkDevice              device_ = VK_NULL_HANDLE;  // non-owning
    VkShaderModule        module_ = VK_NULL_HANDLE;
    VkDescriptorSetLayout set_layout_ = VK_NULL_HANDLE;
    VkPipelineLayout      layout_ = VK_NULL_HANDLE;
    VkPipeline            pipeline_ = VK_NULL_HANDLE;
    VkDescriptorPool      pool_ = VK_NULL_HANDLE;
    VkDescriptorSet       descriptor_set_ = VK_NULL_HANDLE;  // owned by pool
    uint32_t              push_constant_bytes_ = 0;
};

// Record a single dispatch of `pipeline` over `group_count_*` workgroups into a
// one-time command buffer, submit on the compute queue, and block on a fence
// until completion. Host-coherent buffers are immediately readable afterwards.
//
// Synchronous single-submit-per-dispatch is the deterministic bootstrap path:
// no in-command-buffer barriers are needed for one dispatch, and a multi-step
// caller (e.g. the Stage-1c smoke) loops this with a fence wait between steps.
// `push_constants` (if non-null) must point to at least
// pipeline.push_constant_bytes() bytes.
void dispatch(const ComputeContext& ctx, const ComputePipeline& pipeline,
              uint32_t group_count_x, uint32_t group_count_y = 1,
              uint32_t group_count_z = 1, const void* push_constants = nullptr);

}  // namespace bit_physics::common_cpp::vkcompute
