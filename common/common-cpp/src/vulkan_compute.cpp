// Vulkan headless compute substrate implementation (Stage 1a; gate C-3).
// See include/bit_physics/common/vulkan_compute.hpp for the contract.
//
// Modelled on the verified Stage-0 ephemeral probe (same instance/device/
// buffer/pipeline/dispatch call sequence that produced the determinism baseline
// digest a7f85bd4…2844f05), wrapped in RAII classes with VkResult→exception
// propagation in place of the probe's std::exit().

#include "bit_physics/common/vulkan_compute.hpp"

#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

namespace bit_physics::common_cpp::vkcompute {

namespace {

const char* result_string(VkResult r) {
    switch (r) {
        case VK_SUCCESS: return "VK_SUCCESS";
        case VK_NOT_READY: return "VK_NOT_READY";
        case VK_TIMEOUT: return "VK_TIMEOUT";
        case VK_ERROR_OUT_OF_HOST_MEMORY: return "VK_ERROR_OUT_OF_HOST_MEMORY";
        case VK_ERROR_OUT_OF_DEVICE_MEMORY: return "VK_ERROR_OUT_OF_DEVICE_MEMORY";
        case VK_ERROR_INITIALIZATION_FAILED: return "VK_ERROR_INITIALIZATION_FAILED";
        case VK_ERROR_DEVICE_LOST: return "VK_ERROR_DEVICE_LOST";
        case VK_ERROR_LAYER_NOT_PRESENT: return "VK_ERROR_LAYER_NOT_PRESENT";
        case VK_ERROR_EXTENSION_NOT_PRESENT: return "VK_ERROR_EXTENSION_NOT_PRESENT";
        case VK_ERROR_FEATURE_NOT_PRESENT: return "VK_ERROR_FEATURE_NOT_PRESENT";
        case VK_ERROR_INCOMPATIBLE_DRIVER: return "VK_ERROR_INCOMPATIBLE_DRIVER";
        default: return "VK_ERROR_<other>";
    }
}

void check(VkResult r, const char* what) {
    if (r != VK_SUCCESS) {
        throw VulkanError(std::string("Vulkan call failed: ") + what + " -> " +
                          result_string(r));
    }
}

constexpr const char* kValidationLayer = "VK_LAYER_KHRONOS_validation";

bool instance_layer_available(const char* name) {
    uint32_t count = 0;
    if (vkEnumerateInstanceLayerProperties(&count, nullptr) != VK_SUCCESS || count == 0) {
        return false;
    }
    std::vector<VkLayerProperties> layers(count);
    if (vkEnumerateInstanceLayerProperties(&count, layers.data()) != VK_SUCCESS) {
        return false;
    }
    for (const auto& l : layers) {
        if (std::strcmp(l.layerName, name) == 0) return true;
    }
    return false;
}

VKAPI_ATTR VkBool32 VKAPI_CALL debug_callback(
    VkDebugUtilsMessageSeverityFlagBitsEXT severity,
    VkDebugUtilsMessageTypeFlagsEXT /*types*/,
    const VkDebugUtilsMessengerCallbackDataEXT* data, void* /*user*/) {
    if (severity >= VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT) {
        std::fprintf(stderr, "[vulkan-validation] %s\n",
                     data && data->pMessage ? data->pMessage : "(no message)");
    }
    return VK_FALSE;  // do not abort the offending call
}

// Select a memory type satisfying `type_bits` (from VkMemoryRequirements) and
// carrying every flag in `want`. Returns UINT32_MAX if none match.
uint32_t find_memory_type(VkPhysicalDevice phys, uint32_t type_bits,
                          VkMemoryPropertyFlags want) {
    VkPhysicalDeviceMemoryProperties mp;
    vkGetPhysicalDeviceMemoryProperties(phys, &mp);
    for (uint32_t i = 0; i < mp.memoryTypeCount; ++i) {
        if ((type_bits & (1u << i)) &&
            (mp.memoryTypes[i].propertyFlags & want) == want) {
            return i;
        }
    }
    return UINT32_MAX;
}

}  // namespace

// ----------------------------------------------------------------------------
// ComputeContext
// ----------------------------------------------------------------------------

ComputeContext ComputeContext::create(const ComputeContextConfig& config) {
    ComputeContext ctx;  // default (all VK_NULL_HANDLE); destructor cleans up on throw
    try {
        // ---- Instance (+ optional validation layer / debug messenger) ----
        VkApplicationInfo app{VK_STRUCTURE_TYPE_APPLICATION_INFO};
        app.pApplicationName = config.app_name.c_str();
        app.apiVersion =
            VK_MAKE_API_VERSION(0, config.api_version_major, config.api_version_minor, 0);

        std::vector<const char*> layers;
        std::vector<const char*> extensions;
        const bool want_validation =
            config.enable_validation && instance_layer_available(kValidationLayer);
        if (want_validation) {
            layers.push_back(kValidationLayer);
            extensions.push_back(VK_EXT_DEBUG_UTILS_EXTENSION_NAME);
        }

        VkInstanceCreateInfo ici{VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO};
        ici.pApplicationInfo = &app;
        ici.enabledLayerCount = static_cast<uint32_t>(layers.size());
        ici.ppEnabledLayerNames = layers.empty() ? nullptr : layers.data();
        ici.enabledExtensionCount = static_cast<uint32_t>(extensions.size());
        ici.ppEnabledExtensionNames = extensions.empty() ? nullptr : extensions.data();
        check(vkCreateInstance(&ici, nullptr, &ctx.instance_), "vkCreateInstance");
        ctx.validation_enabled_ = want_validation;

        if (want_validation) {
            auto create_messenger =
                reinterpret_cast<PFN_vkCreateDebugUtilsMessengerEXT>(
                    vkGetInstanceProcAddr(ctx.instance_,
                                          "vkCreateDebugUtilsMessengerEXT"));
            if (create_messenger) {
                VkDebugUtilsMessengerCreateInfoEXT mci{
                    VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT};
                mci.messageSeverity =
                    VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
                    VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
                mci.messageType =
                    VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
                    VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
                    VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
                mci.pfnUserCallback = debug_callback;
                check(create_messenger(ctx.instance_, &mci, nullptr, &ctx.messenger_),
                      "vkCreateDebugUtilsMessengerEXT");
            }
        }

        // ---- Physical device: first enumerated (lavapipe under VK_DRIVER_FILES) ----
        uint32_t ndev = 0;
        check(vkEnumeratePhysicalDevices(ctx.instance_, &ndev, nullptr),
              "vkEnumeratePhysicalDevices(count)");
        if (ndev == 0) {
            throw VulkanError("no Vulkan physical device (is VK_DRIVER_FILES set?)");
        }
        std::vector<VkPhysicalDevice> devs(ndev);
        check(vkEnumeratePhysicalDevices(ctx.instance_, &ndev, devs.data()),
              "vkEnumeratePhysicalDevices(list)");
        ctx.physical_ = devs[0];

        VkPhysicalDeviceProperties props;
        vkGetPhysicalDeviceProperties(ctx.physical_, &props);
        ctx.device_name_ = props.deviceName;
        ctx.device_type_ = props.deviceType;

        VkPhysicalDeviceFeatures features{};
        vkGetPhysicalDeviceFeatures(ctx.physical_, &features);

        // ---- Compute queue family ----
        uint32_t nqf = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(ctx.physical_, &nqf, nullptr);
        std::vector<VkQueueFamilyProperties> qfs(nqf);
        vkGetPhysicalDeviceQueueFamilyProperties(ctx.physical_, &nqf, qfs.data());
        uint32_t cq = UINT32_MAX;
        for (uint32_t i = 0; i < nqf; ++i) {
            if (qfs[i].queueFlags & VK_QUEUE_COMPUTE_BIT) { cq = i; break; }
        }
        if (cq == UINT32_MAX) throw VulkanError("no compute-capable queue family");
        ctx.queue_family_ = cq;

        // ---- Logical device (+ optional shaderFloat64) ----
        float priority = 1.0f;
        VkDeviceQueueCreateInfo qci{VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO};
        qci.queueFamilyIndex = cq;
        qci.queueCount = 1;
        qci.pQueuePriorities = &priority;

        VkPhysicalDeviceFeatures enabled{};
        if (config.require_float64) {
            if (!features.shaderFloat64) {
                throw VulkanError("shaderFloat64 requested but not supported by device");
            }
            enabled.shaderFloat64 = VK_TRUE;
            ctx.float64_enabled_ = true;
        }

        VkDeviceCreateInfo dci{VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO};
        dci.queueCreateInfoCount = 1;
        dci.pQueueCreateInfos = &qci;
        dci.pEnabledFeatures = &enabled;
        check(vkCreateDevice(ctx.physical_, &dci, nullptr, &ctx.device_),
              "vkCreateDevice");
        vkGetDeviceQueue(ctx.device_, cq, 0, &ctx.queue_);

        // ---- Command pool (transient: command buffers are one-time-submit) ----
        VkCommandPoolCreateInfo cpci{VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO};
        cpci.flags = VK_COMMAND_POOL_CREATE_TRANSIENT_BIT;
        cpci.queueFamilyIndex = cq;
        check(vkCreateCommandPool(ctx.device_, &cpci, nullptr, &ctx.command_pool_),
              "vkCreateCommandPool");

        return ctx;
    } catch (...) {
        ctx.destroy();  // unwind any partially-created handles in reverse order
        throw;
    }
}

void ComputeContext::destroy() noexcept {
    if (command_pool_ != VK_NULL_HANDLE) {
        vkDestroyCommandPool(device_, command_pool_, nullptr);
        command_pool_ = VK_NULL_HANDLE;
    }
    if (device_ != VK_NULL_HANDLE) {
        vkDestroyDevice(device_, nullptr);
        device_ = VK_NULL_HANDLE;
    }
    if (messenger_ != VK_NULL_HANDLE) {
        auto destroy_messenger =
            reinterpret_cast<PFN_vkDestroyDebugUtilsMessengerEXT>(
                vkGetInstanceProcAddr(instance_, "vkDestroyDebugUtilsMessengerEXT"));
        if (destroy_messenger) destroy_messenger(instance_, messenger_, nullptr);
        messenger_ = VK_NULL_HANDLE;
    }
    if (instance_ != VK_NULL_HANDLE) {
        vkDestroyInstance(instance_, nullptr);
        instance_ = VK_NULL_HANDLE;
    }
    queue_ = VK_NULL_HANDLE;
    physical_ = VK_NULL_HANDLE;
}

ComputeContext::FloatControls ComputeContext::query_float_controls() const {
    VkPhysicalDeviceFloatControlsProperties fc{
        VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FLOAT_CONTROLS_PROPERTIES};
    VkPhysicalDeviceProperties2 props2{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_PROPERTIES_2};
    props2.pNext = &fc;
    vkGetPhysicalDeviceProperties2(physical_, &props2);
    FloatControls out;
    out.rounding_mode_rte_f32 = fc.shaderRoundingModeRTEFloat32 == VK_TRUE;
    out.signed_zero_inf_nan_preserve_f32 =
        fc.shaderSignedZeroInfNanPreserveFloat32 == VK_TRUE;
    out.denorm_preserve_f32 = fc.shaderDenormPreserveFloat32 == VK_TRUE;
    out.denorm_flush_to_zero_f32 = fc.shaderDenormFlushToZeroFloat32 == VK_TRUE;
    return out;
}

void ComputeContext::assert_deterministic_float_controls() const {
    FloatControls fc = query_float_controls();
    if (!fc.rounding_mode_rte_f32) {
        throw VulkanError(
            "FloatControls: shaderRoundingModeRTEFloat32 not advertised (RTE rounding "
            "is the NumPy-match contract; contradicts S0-CPPB2)");
    }
    if (!fc.signed_zero_inf_nan_preserve_f32) {
        throw VulkanError(
            "FloatControls: shaderSignedZeroInfNanPreserveFloat32 not advertised "
            "(contradicts S0-CPPB2)");
    }
    // Denorm preserve/FTZ are NOT pinnable on lavapipe (S0-CPPB2) — not asserted;
    // banked as a residual near-zero cross-stack risk for the quirks catalog.
}

ComputeContext::~ComputeContext() { destroy(); }

ComputeContext::ComputeContext(ComputeContext&& o) noexcept
    : instance_(o.instance_),
      messenger_(o.messenger_),
      physical_(o.physical_),
      device_(o.device_),
      queue_(o.queue_),
      command_pool_(o.command_pool_),
      queue_family_(o.queue_family_),
      device_name_(std::move(o.device_name_)),
      device_type_(o.device_type_),
      float64_enabled_(o.float64_enabled_),
      validation_enabled_(o.validation_enabled_) {
    o.instance_ = VK_NULL_HANDLE;
    o.messenger_ = VK_NULL_HANDLE;
    o.physical_ = VK_NULL_HANDLE;
    o.device_ = VK_NULL_HANDLE;
    o.queue_ = VK_NULL_HANDLE;
    o.command_pool_ = VK_NULL_HANDLE;
}

ComputeContext& ComputeContext::operator=(ComputeContext&& o) noexcept {
    if (this != &o) {
        destroy();
        instance_ = o.instance_;
        messenger_ = o.messenger_;
        physical_ = o.physical_;
        device_ = o.device_;
        queue_ = o.queue_;
        command_pool_ = o.command_pool_;
        queue_family_ = o.queue_family_;
        device_name_ = std::move(o.device_name_);
        device_type_ = o.device_type_;
        float64_enabled_ = o.float64_enabled_;
        validation_enabled_ = o.validation_enabled_;
        o.instance_ = VK_NULL_HANDLE;
        o.messenger_ = VK_NULL_HANDLE;
        o.physical_ = VK_NULL_HANDLE;
        o.device_ = VK_NULL_HANDLE;
        o.queue_ = VK_NULL_HANDLE;
        o.command_pool_ = VK_NULL_HANDLE;
    }
    return *this;
}

// ----------------------------------------------------------------------------
// StorageBuffer
// ----------------------------------------------------------------------------

StorageBuffer::StorageBuffer(const ComputeContext& ctx, VkDeviceSize size_bytes)
    : device_(ctx.device()), size_(size_bytes) {
    if (size_bytes == 0) throw VulkanError("StorageBuffer size must be > 0");
    try {
        VkBufferCreateInfo bci{VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO};
        bci.size = size_bytes;
        bci.usage = VK_BUFFER_USAGE_STORAGE_BUFFER_BIT;
        bci.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
        check(vkCreateBuffer(device_, &bci, nullptr, &buffer_), "vkCreateBuffer");

        VkMemoryRequirements mr;
        vkGetBufferMemoryRequirements(device_, buffer_, &mr);
        const VkMemoryPropertyFlags want = VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT |
                                           VK_MEMORY_PROPERTY_HOST_COHERENT_BIT;
        uint32_t mt = find_memory_type(ctx.physical(), mr.memoryTypeBits, want);
        if (mt == UINT32_MAX) {
            throw VulkanError("no HOST_VISIBLE|HOST_COHERENT memory type");
        }
        VkMemoryAllocateInfo mai{VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO};
        mai.allocationSize = mr.size;
        mai.memoryTypeIndex = mt;
        check(vkAllocateMemory(device_, &mai, nullptr, &memory_), "vkAllocateMemory");
        check(vkBindBufferMemory(device_, buffer_, memory_, 0), "vkBindBufferMemory");
        check(vkMapMemory(device_, memory_, 0, size_bytes, 0, &mapped_), "vkMapMemory");
    } catch (...) {
        destroy();
        throw;
    }
}

void StorageBuffer::destroy() noexcept {
    if (memory_ != VK_NULL_HANDLE && mapped_ != nullptr) {
        vkUnmapMemory(device_, memory_);
        mapped_ = nullptr;
    }
    if (memory_ != VK_NULL_HANDLE) {
        vkFreeMemory(device_, memory_, nullptr);
        memory_ = VK_NULL_HANDLE;
    }
    if (buffer_ != VK_NULL_HANDLE) {
        vkDestroyBuffer(device_, buffer_, nullptr);
        buffer_ = VK_NULL_HANDLE;
    }
    size_ = 0;
}

StorageBuffer::~StorageBuffer() { destroy(); }

StorageBuffer::StorageBuffer(StorageBuffer&& o) noexcept
    : device_(o.device_),
      buffer_(o.buffer_),
      memory_(o.memory_),
      size_(o.size_),
      mapped_(o.mapped_) {
    o.buffer_ = VK_NULL_HANDLE;
    o.memory_ = VK_NULL_HANDLE;
    o.mapped_ = nullptr;
    o.size_ = 0;
}

StorageBuffer& StorageBuffer::operator=(StorageBuffer&& o) noexcept {
    if (this != &o) {
        destroy();
        device_ = o.device_;
        buffer_ = o.buffer_;
        memory_ = o.memory_;
        size_ = o.size_;
        mapped_ = o.mapped_;
        o.buffer_ = VK_NULL_HANDLE;
        o.memory_ = VK_NULL_HANDLE;
        o.mapped_ = nullptr;
        o.size_ = 0;
    }
    return *this;
}

void StorageBuffer::upload(const void* src, std::size_t bytes, std::size_t offset) {
    if (offset + bytes > size_) throw VulkanError("StorageBuffer::upload out of range");
    std::memcpy(static_cast<uint8_t*>(mapped_) + offset, src, bytes);
}

void StorageBuffer::download(void* dst, std::size_t bytes, std::size_t offset) const {
    if (offset + bytes > size_) throw VulkanError("StorageBuffer::download out of range");
    std::memcpy(dst, static_cast<const uint8_t*>(mapped_) + offset, bytes);
}

void StorageBuffer::fill_zero() {
    std::memset(mapped_, 0, static_cast<size_t>(size_));
}

// ----------------------------------------------------------------------------
// ComputePipeline
// ----------------------------------------------------------------------------

ComputePipeline::ComputePipeline(const ComputeContext& ctx, const Options& options)
    : device_(ctx.device()), push_constant_bytes_(options.push_constant_bytes) {
    if (options.spirv == nullptr || options.spirv_word_count == 0) {
        throw VulkanError("ComputePipeline: empty SPIR-V");
    }
    if (options.binding_count == 0) {
        throw VulkanError("ComputePipeline: binding_count must be >= 1");
    }
    try {
        // Shader module.
        VkShaderModuleCreateInfo smci{VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO};
        smci.codeSize = options.spirv_word_count * sizeof(uint32_t);
        smci.pCode = options.spirv;
        check(vkCreateShaderModule(device_, &smci, nullptr, &module_),
              "vkCreateShaderModule");

        // Descriptor set layout: N storage-buffer bindings (compute stage).
        std::vector<VkDescriptorSetLayoutBinding> bindings(options.binding_count);
        for (uint32_t i = 0; i < options.binding_count; ++i) {
            bindings[i] = {};
            bindings[i].binding = i;
            bindings[i].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
            bindings[i].descriptorCount = 1;
            bindings[i].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        }
        VkDescriptorSetLayoutCreateInfo dslci{
            VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO};
        dslci.bindingCount = static_cast<uint32_t>(bindings.size());
        dslci.pBindings = bindings.data();
        check(vkCreateDescriptorSetLayout(device_, &dslci, nullptr, &set_layout_),
              "vkCreateDescriptorSetLayout");

        // Pipeline layout (+ optional compute push-constant range).
        VkPushConstantRange pcr{};
        pcr.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        pcr.offset = 0;
        pcr.size = options.push_constant_bytes;
        VkPipelineLayoutCreateInfo plci{VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO};
        plci.setLayoutCount = 1;
        plci.pSetLayouts = &set_layout_;
        if (options.push_constant_bytes > 0) {
            plci.pushConstantRangeCount = 1;
            plci.pPushConstantRanges = &pcr;
        }
        check(vkCreatePipelineLayout(device_, &plci, nullptr, &layout_),
              "vkCreatePipelineLayout");

        // Compute pipeline.
        VkComputePipelineCreateInfo cpci{VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO};
        cpci.pNext = options.pipeline_pnext;  // additive extension point (1b+)
        cpci.stage.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
        cpci.stage.stage = VK_SHADER_STAGE_COMPUTE_BIT;
        cpci.stage.module = module_;
        cpci.stage.pName = options.entry_point;
        cpci.layout = layout_;
        check(vkCreateComputePipelines(device_, VK_NULL_HANDLE, 1, &cpci, nullptr,
                                       &pipeline_),
              "vkCreateComputePipelines");

        // Descriptor pool + single descriptor set.
        VkDescriptorPoolSize ps{VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, options.binding_count};
        VkDescriptorPoolCreateInfo dpci{VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO};
        dpci.maxSets = 1;
        dpci.poolSizeCount = 1;
        dpci.pPoolSizes = &ps;
        check(vkCreateDescriptorPool(device_, &dpci, nullptr, &pool_),
              "vkCreateDescriptorPool");
        VkDescriptorSetAllocateInfo dsai{VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO};
        dsai.descriptorPool = pool_;
        dsai.descriptorSetCount = 1;
        dsai.pSetLayouts = &set_layout_;
        check(vkAllocateDescriptorSets(device_, &dsai, &descriptor_set_),
              "vkAllocateDescriptorSets");
    } catch (...) {
        destroy();
        throw;
    }
}

void ComputePipeline::destroy() noexcept {
    if (pool_ != VK_NULL_HANDLE) {
        vkDestroyDescriptorPool(device_, pool_, nullptr);  // frees its sets
        pool_ = VK_NULL_HANDLE;
        descriptor_set_ = VK_NULL_HANDLE;
    }
    if (pipeline_ != VK_NULL_HANDLE) {
        vkDestroyPipeline(device_, pipeline_, nullptr);
        pipeline_ = VK_NULL_HANDLE;
    }
    if (layout_ != VK_NULL_HANDLE) {
        vkDestroyPipelineLayout(device_, layout_, nullptr);
        layout_ = VK_NULL_HANDLE;
    }
    if (set_layout_ != VK_NULL_HANDLE) {
        vkDestroyDescriptorSetLayout(device_, set_layout_, nullptr);
        set_layout_ = VK_NULL_HANDLE;
    }
    if (module_ != VK_NULL_HANDLE) {
        vkDestroyShaderModule(device_, module_, nullptr);
        module_ = VK_NULL_HANDLE;
    }
}

ComputePipeline::~ComputePipeline() { destroy(); }

ComputePipeline::ComputePipeline(ComputePipeline&& o) noexcept
    : device_(o.device_),
      module_(o.module_),
      set_layout_(o.set_layout_),
      layout_(o.layout_),
      pipeline_(o.pipeline_),
      pool_(o.pool_),
      descriptor_set_(o.descriptor_set_),
      push_constant_bytes_(o.push_constant_bytes_) {
    o.module_ = VK_NULL_HANDLE;
    o.set_layout_ = VK_NULL_HANDLE;
    o.layout_ = VK_NULL_HANDLE;
    o.pipeline_ = VK_NULL_HANDLE;
    o.pool_ = VK_NULL_HANDLE;
    o.descriptor_set_ = VK_NULL_HANDLE;
}

ComputePipeline& ComputePipeline::operator=(ComputePipeline&& o) noexcept {
    if (this != &o) {
        destroy();
        device_ = o.device_;
        module_ = o.module_;
        set_layout_ = o.set_layout_;
        layout_ = o.layout_;
        pipeline_ = o.pipeline_;
        pool_ = o.pool_;
        descriptor_set_ = o.descriptor_set_;
        push_constant_bytes_ = o.push_constant_bytes_;
        o.module_ = VK_NULL_HANDLE;
        o.set_layout_ = VK_NULL_HANDLE;
        o.layout_ = VK_NULL_HANDLE;
        o.pipeline_ = VK_NULL_HANDLE;
        o.pool_ = VK_NULL_HANDLE;
        o.descriptor_set_ = VK_NULL_HANDLE;
    }
    return *this;
}

void ComputePipeline::bind(uint32_t binding, const StorageBuffer& buffer) {
    VkDescriptorBufferInfo dbi{buffer.handle(), 0, buffer.size()};
    VkWriteDescriptorSet w{VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET};
    w.dstSet = descriptor_set_;
    w.dstBinding = binding;
    w.descriptorCount = 1;
    w.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    w.pBufferInfo = &dbi;
    vkUpdateDescriptorSets(device_, 1, &w, 0, nullptr);
}

// ----------------------------------------------------------------------------
// dispatch
// ----------------------------------------------------------------------------

void dispatch(const ComputeContext& ctx, const ComputePipeline& pipeline,
              uint32_t group_count_x, uint32_t group_count_y, uint32_t group_count_z,
              const void* push_constants) {
    VkDevice device = ctx.device();

    VkCommandBufferAllocateInfo cbai{VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO};
    cbai.commandPool = ctx.command_pool();
    cbai.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    cbai.commandBufferCount = 1;
    VkCommandBuffer cmd = VK_NULL_HANDLE;
    check(vkAllocateCommandBuffers(device, &cbai, &cmd), "vkAllocateCommandBuffers");

    VkCommandBufferBeginInfo bi{VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO};
    bi.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
    check(vkBeginCommandBuffer(cmd, &bi), "vkBeginCommandBuffer");
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_COMPUTE, pipeline.pipeline());
    VkDescriptorSet set = pipeline.descriptor_set();
    vkCmdBindDescriptorSets(cmd, VK_PIPELINE_BIND_POINT_COMPUTE, pipeline.layout(), 0, 1,
                            &set, 0, nullptr);
    if (push_constants != nullptr && pipeline.push_constant_bytes() > 0) {
        vkCmdPushConstants(cmd, pipeline.layout(), VK_SHADER_STAGE_COMPUTE_BIT, 0,
                           pipeline.push_constant_bytes(), push_constants);
    }
    vkCmdDispatch(cmd, group_count_x, group_count_y, group_count_z);
    check(vkEndCommandBuffer(cmd), "vkEndCommandBuffer");

    VkFenceCreateInfo fci{VK_STRUCTURE_TYPE_FENCE_CREATE_INFO};
    VkFence fence = VK_NULL_HANDLE;
    check(vkCreateFence(device, &fci, nullptr, &fence), "vkCreateFence");
    VkSubmitInfo si{VK_STRUCTURE_TYPE_SUBMIT_INFO};
    si.commandBufferCount = 1;
    si.pCommandBuffers = &cmd;
    VkResult submit = vkQueueSubmit(ctx.queue(), 1, &si, fence);
    if (submit != VK_SUCCESS) {
        vkDestroyFence(device, fence, nullptr);
        vkFreeCommandBuffers(device, ctx.command_pool(), 1, &cmd);
        check(submit, "vkQueueSubmit");
    }
    VkResult waited = vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
    vkDestroyFence(device, fence, nullptr);
    vkFreeCommandBuffers(device, ctx.command_pool(), 1, &cmd);
    check(waited, "vkWaitForFences");
}

}  // namespace bit_physics::common_cpp::vkcompute
