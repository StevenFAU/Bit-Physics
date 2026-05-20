// Phase 1 Stage 1 — ImGui hooks (header surface only).
//
// Per charter § 7.1 deliverable D: ImGui integration ships as a
// header-only surface. The actual ImGui vendoring + Vulkan back-end
// integration lands in the per-sim implementation phase that needs it
// (recommended: any Stack C sim that wants a runtime control panel).

#pragma once

#include <cstdint>

namespace bit_physics::common_cpp::imgui {

struct OverlayState {
    bool show_perf_panel = true;
    bool show_capture_controls = true;
    float scale = 1.0f;
};

// Phase 1 stub. Implementations may forward to ImGui::Render once
// ImGui is vendored.
inline void begin_frame() {
    // intentionally empty
}
inline void end_frame() {
    // intentionally empty
}
inline void render_overlay(const OverlayState&) {
    // intentionally empty
}

}  // namespace bit_physics::common_cpp::imgui
