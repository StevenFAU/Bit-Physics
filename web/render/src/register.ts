// Registers @bp/render's shared WGSL modules with the @bp/gpu #import loader.
import { defineWgsl } from "@bp/gpu";
import tonemapWgsl from "./wgsl/tonemap.wgsl?raw";
import colorWgsl from "./wgsl/color.wgsl?raw";

defineWgsl("bp/tonemap", tonemapWgsl);
defineWgsl("bp/color", colorWgsl);
