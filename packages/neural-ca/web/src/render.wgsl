// Growing-NCA presentation shader (verification-demo-spec § 3.4 RENDER).
//
// Display-only and GATE-SAFE: the correctness gate reads the `rgba` buffer
// readback (verify.py `_gate_neural_ca` → `_stack_field(bundles[0], "rgba")`),
// never canvas pixels, so every mode here is presentation over the unmodified
// state buffer. All overlays are BRANCHES OF ONE fullscreen fragment pass keyed
// by a `mode`/`channel` uniform — no extra compute passes (spec § 3.5).
//
// Modes:
//   0 organism     — premultiplied RGBA over white (the poster look; the exact
//                    v1 visualisation, kept bit-for-bit as mode 0)
//   1 hidden       — false-color one of the 12 unbounded hidden channels
//                    (arctan-squashed → shared colormap): the invisible
//                    "chemical" state that drives growth (spec-ref § 3)
//   2 alive        — the kernel's own alive proxy (alpha > 0.1) over dark,
//                    colored by alpha magnitude
//   3 delta        — per-cell |Δ| between the LIVE rgba and the committed
//                    canonical FINAL frame, colormapped. On a matching backend
//                    a mature organism converges toward all-dark here.
//   4 tiled        — 2×2 multi-panel (organism · hidden · alive · Δ) in ONE
//                    pass — the "many effects on screen" ask, at one draw call.
//
// The colormap sampler `cmap_sample` is spliced in by main.ts via the shared
// common-web/src/colormap emitColormapWgsl() (uniform-driven; switching maps is
// a queue.writeBuffer, never a pipeline rebuild).

const PI : f32 = 3.14159265358979;

struct RP {
  // dims: grid, cn, mode, channel        ctrl: tileN, hiddenScale, deltaGain, hasRef
  dims : vec4<f32>,
  ctrl : vec4<f32>,
  cmap : array<vec4<f32>, 8>,
  cmap_meta : vec4<f32>,
};
@group(0) @binding(0) var<uniform> rp : RP;
@group(0) @binding(1) var<storage, read> state : array<f32>;
@group(0) @binding(2) var<storage, read> canon : array<f32>; // rgba final frame

struct VSOut { @builtin(position) pos : vec4<f32>, @location(0) uv : vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi : u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o : VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = 0.5 * (p[vi] + vec2<f32>(1.0, 1.0));
  return o;
}

fn cell_of(uv : vec2<f32>, g : u32) -> vec2<u32> {
  let i = u32(clamp(uv.x, 0.0, 0.999) * f32(g));
  let j = u32(clamp(1.0 - uv.y, 0.0, 0.999) * f32(g));
  return vec2<u32>(i, j);
}

// mode 0 — premultiplied RGBA over white (verbatim v1 look)
fn organism(base : u32) -> vec3<f32> {
  let r = clamp(state[base + 0u], 0.0, 1.0);
  let g = clamp(state[base + 1u], 0.0, 1.0);
  let b = clamp(state[base + 2u], 0.0, 1.0);
  let a = clamp(state[base + 3u], 0.0, 1.0);
  return vec3<f32>(1.0) - a * (vec3<f32>(1.0) - vec3<f32>(r, g, b));
}

// mode 1 — one hidden channel, arctan-squashed to (0,1) then colormapped
fn hidden(base : u32, ch : u32, scale : f32) -> vec3<f32> {
  let v = state[base + ch];
  let t = 0.5 + atan(v * scale) / PI;
  return cmap_sample(t);
}

// mode 2 — alive proxy: alpha>0.1 colored by magnitude, dead cells near-black
fn alive_view(base : u32) -> vec3<f32> {
  let a = state[base + 3u];
  if (a <= 0.1) { return vec3<f32>(0.03, 0.04, 0.06); }
  return cmap_sample(clamp(a, 0.0, 1.0));
}

// mode 3 — |Δ| live vs committed canonical final frame, colormapped
fn delta_view(base : u32, cbase : u32, gain : f32, hasRef : f32) -> vec3<f32> {
  if (hasRef < 0.5) { return vec3<f32>(0.03, 0.04, 0.06); }
  var d : f32 = 0.0;
  for (var c : u32 = 0u; c < 4u; c = c + 1u) {
    d = max(d, abs(clamp(state[base + c], 0.0, 1.0) - canon[cbase + c]));
  }
  return cmap_sample(clamp(d * gain, 0.0, 1.0));
}

fn shade(mode : u32, uv : vec2<f32>) -> vec3<f32> {
  let g = u32(rp.dims.x);
  let cn = u32(rp.dims.y);
  let ch = u32(rp.dims.w);
  let c = cell_of(uv, g);
  let base = (c.y * g + c.x) * cn;
  let cbase = (c.y * g + c.x) * 4u;
  switch (mode) {
    case 1u: { return hidden(base, ch, rp.ctrl.y); }
    case 2u: { return alive_view(base); }
    case 3u: { return delta_view(base, cbase, rp.ctrl.z, rp.ctrl.w); }
    default: { return organism(base); }
  }
}

@fragment
fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
  let mode = u32(rp.dims.z);
  if (mode == 4u) {
    // 2×2 panels: organism · hidden · alive · Δ, remapping to full-cell uv
    let sub = fract(in.uv * 2.0);
    let top = in.uv.y >= 0.5;
    let left = in.uv.x < 0.5;
    var panelMode : u32 = 0u;
    if (top && left) { panelMode = 0u; }        // organism (upper-left)
    else if (top && !left) { panelMode = 1u; }  // hidden
    else if (!top && left) { panelMode = 2u; }  // alive
    else { panelMode = 3u; }                     // delta
    var col = shade(panelMode, sub);
    // thin separators
    let e = 0.006;
    if (abs(in.uv.x - 0.5) < e || abs(in.uv.y - 0.5) < e) { col = vec3<f32>(0.10, 0.12, 0.16); }
    return vec4<f32>(col, 1.0);
  }
  return vec4<f32>(shade(mode, in.uv), 1.0);
}
