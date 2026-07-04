// Debug/honesty particle view — instanced sphere impostors (WebGPU has no
// point size; each particle is a camera-facing quad, shaded as a sphere,
// with per-fragment depth from the view-space offset reprojection).
// Colormap: packed common-web stops (piecewise-linear sampler appended by
// render.ts via emitColormapWgsl).

struct CamU {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  eye: vec4<f32>,
  // x: particle world radius, y: color mode (0 speed, 1 density, 2 neighbors, 3 solver err), z/w: scalar range
  params: vec4<f32>,
  stops: array<vec4<f32>, 8>,
  cmeta: vec4<f32>, // x: stop count
};

@group(0) @binding(0) var<uniform> CAM: CamU;
@group(0) @binding(1) var<storage, read> rpos: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> rvel: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> raux: array<vec4<f32>>;

struct VSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) viewz: f32,
  @location(2) scalar: f32,
};

const CORNERS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
);

@vertex
fn vs_particle(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let corner = CORNERS[vid];
  let r = CAM.params.x;
  let center = (CAM.view * vec4<f32>(rpos[iid].xyz, 1.0)).xyz;
  let offs = center + vec3<f32>(corner * r, 0.0);
  var out: VSOut;
  out.clip = CAM.proj * vec4<f32>(offs, 1.0);
  out.uv = corner;
  out.viewz = center.z;
  let mode = CAM.params.y;
  var v = 0.0;
  if (mode < 0.5) { v = length(rvel[iid].xyz); }
  else if (mode < 1.5) { v = raux[iid].x; }
  else if (mode < 2.5) { v = raux[iid].z; }
  else { v = raux[iid].w; }
  out.scalar = clamp((v - CAM.params.z) / max(CAM.params.w - CAM.params.z, 1e-9), 0.0, 1.0);
  return out;
}

struct FSOut {
  @location(0) color: vec4<f32>,
  @builtin(frag_depth) depth: f32,
};

@fragment
fn fs_particle(in: VSOut) -> FSOut {
  let d2 = dot(in.uv, in.uv);
  if (d2 > 1.0) { discard; }
  let nz = sqrt(1.0 - d2);
  let n = vec3<f32>(in.uv, nz);
  let r = CAM.params.x;
  // reproject the sphere surface point for honest depth
  let zs = in.viewz + nz * r;
  let clip = CAM.proj * vec4<f32>(0.0, 0.0, zs, 1.0);
  let l = normalize(vec3<f32>(0.4, 0.55, 0.73));
  let diff = 0.3 + 0.7 * max(dot(n, l), 0.0);
  let spec = pow(max(dot(n, normalize(l + vec3<f32>(0.0, 0.0, 1.0))), 0.0), 42.0) * 0.35;
  let base = cmap_sample(in.scalar);
  var out: FSOut;
  out.color = vec4<f32>(base * diff + vec3<f32>(spec), 1.0);
  out.depth = clip.z / clip.w;
  return out;
}

// --- container / helper lines ------------------------------------------------
@group(0) @binding(1) var<storage, read> line_verts: array<vec4<f32>>;

@vertex
fn vs_line(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
  return CAM.proj * (CAM.view * vec4<f32>(line_verts[vid].xyz, 1.0));
}

@fragment
fn fs_line() -> @location(0) vec4<f32> {
  return vec4<f32>(0.42, 0.5, 0.54, 0.5);
}
