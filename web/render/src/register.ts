// Registers @bp/render's shared WGSL modules with the @bp/gpu #import loader.
import { defineWgsl } from "@bp/gpu";
import tonemapWgsl from "./wgsl/tonemap.wgsl?raw";
import colorWgsl from "./wgsl/color.wgsl?raw";
import view3dWgsl from "./wgsl/view3d.wgsl?raw";

defineWgsl("bp/tonemap", tonemapWgsl);
defineWgsl("bp/color", colorWgsl);
defineWgsl("bp/view3d", view3dWgsl);
