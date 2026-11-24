// Murmuration — the near-bird cull (near-birds.wgsl draws them): each bird's
// cross-fade weight w from its projected wingspan, and the instance list and
// indirect draw count of the birds drawn as meshes. A full list leaves the
// rest in the optical-depth medium (w = 0), so nothing is lost or doubled.
#import bp/view3d

struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

struct Near {
  // x = birds, y = list capacity, z = target width, w = target height
  counts: vec4<u32>,
  // x = wingspan (model units), y = px where the fade starts, z = px where it ends, w = time (s)
  shape: vec4<f32>,
  // falcon: xyz (model), w = wingspan (model units, before its minimum size)
  falcon: vec4<f32>,
  // falcon: heading xyz, w = bank
  falcon_h: vec4<f32>,
  // x = the falcon's least wingspan in px, y = 1 when it flies, z = birds' tint, w = rim strength
  look: vec4<f32>,
}

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> N: Near;
@group(0) @binding(2) var<storage, read> agents: array<Agent>;
// per-bird weight; the instance list (id, weight bits); draw args [verts, count, 0, 0]
@group(0) @binding(3) var<storage, read_write> near_w: array<f32>;
@group(0) @binding(4) var<storage, read_write> list: array<vec2<u32>>;
@group(0) @binding(5) var<storage, read_write> args: array<atomic<u32>, 4>;

/// Projected wingspan of a bird at model point p, in target pixels (and clip w).
fn wing_px(p: vec3<f32>, wingspan: f32) -> vec2<f32> {
  let c = V.mvp * vec4<f32>(p, 1.0);
  let fpx = V.proj.y * V.viewport.y * 0.5;
  return vec2<f32>(wingspan * V.eye_model.w * fpx / max(c.w, 1e-4), c.w);
}

@compute @workgroup_size(64)
fn cull(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= N.counts.x) { return; }
  let p = agents[i].position_speed.xyz;
  let wp = wing_px(p, N.shape.x);
  var w = 0.0;
  if (wp.y > V.proj.z * 2.0) {
    w = smoothstep(N.shape.y, N.shape.z, wp.x);
    // off screen (with a margin of a wingspan) needs no mesh
    let c = V.mvp * vec4<f32>(p, 1.0);
    let ndc = c.xy / c.w;
    let margin = wp.x * V.viewport.z * 2.0;
    if (any(abs(ndc) > vec2<f32>(1.0 + margin))) { w = 0.0; }
  }
  if (w > 0.0) {
    let slot = atomicAdd(&args[1], 1u);
    if (slot < N.counts.y) {
      list[slot] = vec2<u32>(i, bitcast<u32>(w));
    } else {
      // the list is full: this bird stays in the medium
      w = 0.0;
    }
  }
  near_w[i] = w;
}
