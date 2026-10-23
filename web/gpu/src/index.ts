// @bp/gpu — device, capability tier, WGSL loader, buffers, profiling.
import fullscreenWgsl from "./wgsl/fullscreen.wgsl?raw";
import hashWgsl from "./wgsl/hash.wgsl?raw";
import { defineWgsl } from "./wgsl.js";

defineWgsl("bp/fullscreen", fullscreenWgsl);
defineWgsl("bp/hash", hashWgsl);

export * from "./device.js";
export * from "./tier.js";
export * from "./wgsl.js";
export * from "./buffers.js";
export * from "./profiler.js";
export * from "./sort.js";
