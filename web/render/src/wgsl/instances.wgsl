// Instances (F3): many copies of a procedural mesh, culled and LOD-sorted on
// the GPU. `cull` tests each instance's bounding sphere against the frustum,
// picks a level of detail by its projected radius and appends its index to
// that level's visible list; `args` writes one drawIndexedIndirect record per
// level. The vertex stage reads the instance through the visible list.
#import bp/view3d

struct Instance {
  // xyz centre (model units), w = radius (the mesh is inside the unit sphere)
  pos_radius: vec4<f32>,
  // orientation quaternion (x, y, z, w)
  rot: vec4<f32>,
  // rgb albedo (linear), w = emissive strength
  color: vec4<f32>,
};

struct CullParams {
  // x = instances, y = levels, z = list capacity per level (u32s)
  dims: vec4<u32>,
  // projected-radius thresholds in px, finest level first (up to 4 levels)
  lod_px: vec4<f32>,
  // per level: index count, first index, base vertex (x, y, z) — up to 4 levels
  ranges: array<vec4<u32>, 4>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> C: CullParams;
@group(0) @binding(2) var<storage, read> inst: array<Instance>;
@group(0) @binding(3) var<storage, read_write> visible: array<u32>;
@group(0) @binding(4) var<storage, read_write> counts: array<atomic<u32>, 4>;
@group(0) @binding(5) var<storage, read_write> args: array<u32>;

@compute @workgroup_size(64)
fn cull(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= C.dims.x) {
    return;
  }
  let s = inst[i].pos_radius;
  let c = s.xyz;
  let r = s.w;
  for (var k = 0u; k < 6u; k = k + 1u) {
    let p = view3d_plane(V.mvp, k);
    if (dot(p.xyz, c) + p.w < -r) {
      return;
    }
  }
  let w = (V.mvp * vec4<f32>(c, 1.0)).w;
  let px = select(1e9, r * V.eye_model.w * V.proj.y * V.viewport.y * 0.5 / w, w > 1e-6);
  var lod = C.dims.y - 1u;
  for (var k = 0u; k + 1u < C.dims.y; k = k + 1u) {
    if (px >= C.lod_px[k]) {
      lod = k;
      break;
    }
  }
  let slot = atomicAdd(&counts[lod], 1u);
  visible[lod * C.dims.z + slot] = i;
}

@compute @workgroup_size(4)
fn write_args(@builtin(local_invocation_id) id: vec3<u32>) {
  let lod = id.x;
  if (lod >= C.dims.y) {
    return;
  }
  let r = C.ranges[lod];
  let o = lod * 5u;
  args[o + 0u] = r.x;
  args[o + 1u] = atomicLoad(&counts[lod]);
  args[o + 2u] = r.y;
  args[o + 3u] = r.z;
  args[o + 4u] = 0u;
}

// ---- draw -------------------------------------------------------------

struct DrawLevel {
  // x = this level's list start (u32s)
  base: vec4<u32>,
};

struct Look {
  // xyz key light direction in view space (towards the light), w = ambient
  key: vec4<f32>,
  // x = key strength, y = rim strength, z = rim exponent, w = overall gain
  shade: vec4<f32>,
};

@group(1) @binding(0) var<uniform> L: DrawLevel;
@group(1) @binding(1) var<uniform> K: Look;
@group(1) @binding(2) var<storage, read> list: array<u32>;
@group(1) @binding(3) var<storage, read> items: array<Instance>;

struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) n_view: vec3<f32>,
  @location(1) p_view: vec3<f32>,
  @location(2) color: vec4<f32>,
};

fn qrot(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> {
  let t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}

@vertex
fn vs(@location(0) pos: vec3<f32>, @location(1) nrm: vec3<f32>, @builtin(instance_index) ii: u32) -> VOut {
  let it = items[list[L.base.x + ii]];
  let q = it.rot;
  let p = it.pos_radius.xyz + qrot(q, pos) * it.pos_radius.w;
  let n = qrot(q, nrm);
  var o: VOut;
  o.clip = V.mvp * vec4<f32>(p, 1.0);
  o.p_view = (V.mv * vec4<f32>(p, 1.0)).xyz;
  o.n_view = (V.mv * vec4<f32>(n, 0.0)).xyz;
  o.color = it.color;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let n = normalize(in.n_view);
  let v = normalize(-in.p_view);
  let diffuse = max(dot(n, normalize(K.key.xyz)), 0.0) * K.shade.x;
  // hemispheric ambient: brighter where the normal faces up (view-space y)
  let ambient = K.key.w * (0.6 + 0.4 * n.y);
  let rim = pow(1.0 - max(dot(n, v), 0.0), K.shade.z) * K.shade.y;
  let c = in.color.rgb * (ambient + diffuse) + vec3<f32>(rim) * in.color.rgb + in.color.rgb * in.color.w;
  return vec4<f32>(c * K.shade.w, 1.0);
}
