import arenaEvents from "../shaders/arena_events.wgsl?raw";
import arenaPerceive from "../shaders/arena_perceive.wgsl?raw";
import ecosystemFlow from "../shaders/ecosystem_flow.wgsl?raw";
import ecosystemMutation from "../shaders/ecosystem_mutation.wgsl?raw";
import organismPack from "../shaders/organism_pack.wgsl?raw";
import organismSpectral from "../shaders/organism_spectral.wgsl?raw";
import ecosystemGather from "../shaders/reintegrate_ecosystem.wgsl?raw";
import arenaRender from "../shaders/render_arena.wgsl?raw";

export async function arenaShaderSha256(): Promise<string> {
  const source = [organismPack, organismSpectral, arenaPerceive, ecosystemFlow, ecosystemGather, ecosystemMutation, arenaEvents, arenaRender].join("\n// --- flow-lenia shader boundary ---\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
