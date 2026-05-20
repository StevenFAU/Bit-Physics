// Phase 1 Stage 1 — Vulkan device init / descriptor / swap chain
// header surface (charter § 7.1 deliverable D, spec § 4.3).
//
// Stage 1 ships the declarations only. Implementations land in a
// subsequent per-sim Stack C implementation phase that actually
// creates a window + swap chain.
//
// Compiles only when Vulkan is found (BIT_PHYSICS_HAS_VULKAN == 1);
// the rest of common-cpp does NOT depend on this header.

#pragma once

#include <cstdint>
#include <string>
#include <vector>

#ifndef BIT_PHYSICS_HAS_VULKAN
#define BIT_PHYSICS_HAS_VULKAN 0
#endif

#if BIT_PHYSICS_HAS_VULKAN
#include <vulkan/vulkan.h>
#endif

namespace bit_physics::common_cpp::vulkan {

struct DeviceConfig {
    std::string app_name = "bit-physics";
    uint32_t api_version_major = 1;
    uint32_t api_version_minor = 3;  // Vulkan 1.3 per spec § 4.3
    bool require_subgroups = true;
    bool require_timeline_semaphores = true;
    bool require_dynamic_rendering = true;
    bool enable_validation = false;
};

struct SwapchainConfig {
    uint32_t width = 1280;
    uint32_t height = 720;
    // Caller-configurable present-mode policy per charter
    // § 7.1 D. The default is "prefer mailbox, fall back to FIFO."
    enum class PresentModePolicy { PreferMailbox, ForceFifo };
    PresentModePolicy present_mode = PresentModePolicy::PreferMailbox;
};

#if BIT_PHYSICS_HAS_VULKAN

class Device {
public:
    // Phase 2+ implementation: create instance, pick physical device,
    // create logical device with the requested features, etc.
    static Device create(const DeviceConfig& config);

    Device() = default;
    ~Device();

    Device(const Device&) = delete;
    Device& operator=(const Device&) = delete;
    Device(Device&&) noexcept = default;
    Device& operator=(Device&&) noexcept = default;

    VkInstance       instance() const { return instance_; }
    VkPhysicalDevice physical() const { return physical_; }
    VkDevice         logical()  const { return logical_; }

private:
    VkInstance       instance_ = VK_NULL_HANDLE;
    VkPhysicalDevice physical_ = VK_NULL_HANDLE;
    VkDevice         logical_  = VK_NULL_HANDLE;
};

class Swapchain {
public:
    // Phase 2+ implementation: create surface, swap chain, image views.
    // choosePresentMode is caller-configurable via config.present_mode
    // per charter § 7.1 D.
    static Swapchain create(const Device& device, const SwapchainConfig& config);

    VkSwapchainKHR raw() const { return raw_; }

private:
    VkSwapchainKHR raw_ = VK_NULL_HANDLE;
};

class DescriptorAllocator {
public:
    // Phase 2+ implementation: pool-of-pools allocator that tracks
    // exhaustion and grows on demand.
    void allocate(VkDescriptorSetLayout layout, VkDescriptorSet* out);
    void reset();

private:
    std::vector<VkDescriptorPool> pools_;
};

#else

// Vulkan was not found at configure time. Provide stub declarations
// that fail to link when called so missing-Vulkan errors surface
// clearly at integration time rather than silently no-op'ing.
class Device;
class Swapchain;
class DescriptorAllocator;

#endif  // BIT_PHYSICS_HAS_VULKAN

}  // namespace bit_physics::common_cpp::vulkan
