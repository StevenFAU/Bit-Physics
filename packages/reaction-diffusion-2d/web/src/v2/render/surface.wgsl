// Turing Patterns — "On a Shape" renderer (01-reaction-diffusion.md § The look:
// "PBR material driven by V (albedo blend + normal from height), studio
// environment light"). Two compute passes turn the simulation state into a
// raised, glossy surface — each cell is pushed out along its normal by the
// pattern's coverage, then its shading normal is rebuilt from its displaced
// neighbour ring — and a render pass draws a studio backdrop with a soft
// contact shadow, then the surface under a key, fill and rim light with a
// procedural softbox reflection. Display only: the state is read, never
// written.

struct View {
  view_proj: mat4x4<f32>,
  eye: vec4<f32>,      // xyz camera position
  backdrop: vec4<f32>, // backdrop colour (linear), a = grain
  base: vec4<f32>,     // bare-surface colour (linear), a = its gloss
  ink: vec4<f32>,      // pattern colour (linear), a = its gloss
  accent: vec4<f32>,   // specular tint, a = shininess
  rim: vec4<f32>,      // subsurface rim tint, a = amount
  light: vec4<f32>,    // key light direction (world, unit), w = relief (world units)
  ramp: vec4<f32>,     // coverage lo, hi, cell count, channel
  shadow: vec4<f32>,   // contact shadow centre (px) and radii (px)
  dims: vec4<f32>,     // viewport px w, h; tone (0 dark, 1 light); unused
};

@group(0) @binding(0) var<uniform> V: View;

// ---------------------------------------------------------------- prep ----

@group(0) @binding(1) var<storage, read> state: array<f32>;
@group(0) @binding(2) var<storage, read> pos: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> nrm: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> nbr: array<vec4<u32>>;
@group(0) @binding(5) var<storage, read_write> disp: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> shade: array<vec4<f32>>;

fn coverage(x: f32) -> f32 {
  return smoothstep(V.ramp.x, V.ramp.y, x);
}

@compute @workgroup_size(64, 1, 1)
fn displace(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= u32(V.ramp.z)) { return; }
  let cov = coverage(state[c * 2u + u32(V.ramp.w)]);
  disp[c] = vec4<f32>(pos[c].xyz + nrm[c].xyz * (V.light.w * cov), cov);
}

@compute @workgroup_size(64, 1, 1)
fn normals(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= u32(V.ramp.z)) { return; }
  let a = nbr[c * 2u];
  let b = nbr[c * 2u + 1u];
  let ring = array<u32, 6>(a.x, a.y, a.z, a.w, b.x, b.y);
  let deg = b.z;
  let p = disp[c].xyz;
  var n = vec3<f32>(0.0);
  for (var q = 0u; q < deg; q = q + 1u) {
    let e0 = disp[ring[q]].xyz - p;
    let e1 = disp[ring[(q + 1u) % deg]].xyz - p;
    n = n + cross(e0, e1);
  }
  // fall back to the shape's own normal where the ring degenerates
  let base_n = nrm[c].xyz;
  let nn = select(base_n, normalize(n), dot(n, n) > 1e-20);
  shade[c] = vec4<f32>(select(-nn, nn, dot(nn, base_n) >= 0.0), state[c * 2u + u32(V.ramp.w)]);
}

// ---------------------------------------------------------------- draw ----

@group(0) @binding(7) var<storage, read> disp_r: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read> shade_r: array<vec4<f32>>;

struct BackOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_back(@builtin(vertex_index) vi: u32) -> BackOut {
  let x = f32((vi << 1u) & 2u);
  let y = f32(vi & 2u);
  var o: BackOut;
  o.pos = vec4<f32>(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  o.uv = vec2<f32>(x, y);
  return o;
}

@fragment
fn fs_back(in: BackOut) -> @location(0) vec4<f32> {
  let px = in.uv * V.dims.xy;
  // a studio sweep: lighter behind the object, falling off to the edges
  let r = length((px - 0.5 * V.dims.xy) / V.dims.y);
  var c = V.backdrop.rgb * (1.12 - 0.42 * r * r) * mix(1.0, 0.86, in.uv.y);
  // soft contact shadow under the object
  let s = (px - V.shadow.xy) / max(V.shadow.zw, vec2<f32>(1.0));
  let shadow = exp(-2.2 * dot(s, s));
  c = c * (1.0 - 0.38 * shadow);
  return vec4<f32>(c, 1.0);
}

struct SurfOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) world: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) value: f32,
};

@vertex
fn vs_surf(@builtin(vertex_index) vi: u32) -> SurfOut {
  let d = disp_r[vi];
  var o: SurfOut;
  o.pos = V.view_proj * vec4<f32>(d.xyz, 1.0);
  o.world = d.xyz;
  o.normal = shade_r[vi].xyz;
  o.value = shade_r[vi].w;
  return o;
}

// the studio, as seen in a reflection: dark floor, bright sky, one softbox
fn studio(r: vec3<f32>) -> vec3<f32> {
  let sky = mix(vec3<f32>(0.18), vec3<f32>(0.9), smoothstep(-0.25, 0.65, r.y));
  let box = pow(max(dot(r, V.light.xyz), 0.0), 48.0) * 5.0;
  let strip = pow(max(dot(r, normalize(vec3<f32>(-0.8, 0.2, -0.4))), 0.0), 24.0) * 1.2;
  return sky + vec3<f32>(box + strip);
}

@fragment
fn fs_surf(in: SurfOut) -> @location(0) vec4<f32> {
  let n = normalize(in.normal);
  let v = normalize(V.eye.xyz - in.world);
  // coverage per fragment from the interpolated field: smooth pattern edges
  // even where a feature spans only a few cells
  let cov = coverage(in.value);
  let albedo = mix(V.base.rgb, V.ink.rgb, cov);
  let gloss = mix(V.base.a, V.ink.a, cov);
  let key = V.light.xyz;
  let fill = normalize(vec3<f32>(-0.7, 0.25, 0.55));
  let back = normalize(vec3<f32>(0.15, 0.55, -1.0));
  // hemispheric ambient + three lights
  let hemi = mix(0.22, 0.55, 0.5 + 0.5 * n.y);
  var c = albedo * (hemi + 0.95 * max(dot(n, key), 0.0) + 0.25 * max(dot(n, fill), 0.0));
  // specular highlight (normalised Blinn-Phong) and the softbox reflection, Fresnel-weighted
  let h = normalize(key + v);
  let shin = V.accent.a;
  c = c + V.accent.rgb * gloss * pow(max(dot(n, h), 0.0), shin) * (shin + 8.0) / 50.0;
  let fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  c = c + studio(reflect(-v, n)) * fres * gloss * 0.5;
  // back light rim and a thin translucent edge where the pattern thins out
  c = c + V.rim.rgb * pow(1.0 - max(dot(n, v), 0.0), 3.0) * max(dot(n, back) + 0.3, 0.0) * 0.35;
  c = c + V.rim.rgb * (cov * (1.0 - cov) * 4.0) * V.rim.a * 0.6;
  return vec4<f32>(c, 1.0);
}
