// Eulerian smoke — Stam-Fedkiw stable fluids 2D, WGSL compute port (Stack B).
//
// A faithful port of the verified NumPy reference
// (packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py):
// MacCormack-corrected semi-Lagrangian velocity advection (limiter OFF on the
// gated path, matching the reference), explicit 5-point diffusion, fixed-count
// zero-initialized Jacobi pressure projection with 2nd-order centered
// divergence/gradient on a fully periodic collocated grid, then plain
// bilinear semi-Lagrangian density advection with the projected velocity.
//
// Memory layout matches the reference's (Nx, Ny) row-major convention:
// axis 0 = x (slow), axis 1 = y (fast) — idx = i * n + j, u along x, v along y.
// Velocity is array<vec2<f32>> (u = .x, v = .y).
//
// FP-EDGE GUARD (load-bearing; discovered by this port): the periodic wrap
// x - floor(x/n)*n can return exactly n for tiny negative x (rounding). The
// NumPy reference guards the derived integer INDEX but not the interpolation
// FRACTION, so fx = x_back - i0 becomes n — a ×n bilinear extrapolation. That
// unguarded fraction fired in the f64 reference on the committed lid-shear
// canonical's own IC (see the web demo's post-mortem panel; the backend fix
// landed at P6-FPEDGE and the canonicals were regenerated). This port wraps
// the COORDINATE itself (x >= n -> 0), which is the
// limit the intended semantics compute and is identical to the reference on
// every non-edge input.
//
// No atomics, no subgroup ops, no wall-clock: same-device replay is
// byte-identical (browser determinism claim: epsilon vs the f64 reference).

struct Params {
  n: u32,        // grid side (cells per axis)
  flags: u32,    // bit 0: MacCormack limiter (exploratory; 0 on the gated path)
  dt: f32,
  dx: f32,
  nu: f32,
  rho: f32,
  dt_dx: f32,    // dt / dx — backtrace displacement scale (grid units)
  dx2: f32,      // dx * dx
  inv_dx2: f32,  // 1 / dx^2
  inv_2dx: f32,  // 0.5 / dx
  c_rhs: f32,    // rho / dt — Jacobi RHS scale (matches the reference's rhs)
  c_grad: f32,   // dt / rho — gradient-subtract scale
};

@group(0) @binding(0) var<uniform> params: Params;

// Field bindings (bind groups are built per entry point; unused slots are
// bound to a 16-byte dummy buffer):
//   vel_in      — velocity read (the advecting field / stencil source)
//   vel_out     — velocity write
//   vel_aux     — second velocity read (MacCormack predictor)
//   scalar_in   — scalar read (pressure ping / density in)
//   scalar_out  — scalar write (pressure pong / density out / divergence)
//   scalar_aux  — scalar read (Jacobi RHS divergence) or second write (curl)
@group(0) @binding(1) var<storage, read> vel_in: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> vel_out: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> vel_aux: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read> scalar_in: array<f32>;
@group(0) @binding(5) var<storage, read_write> scalar_out: array<f32>;
@group(0) @binding(6) var<storage, read_write> scalar_aux: array<f32>;

fn wrap(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

fn idx_of(i: i32, j: i32) -> u32 {
  let n = i32(params.n);
  return u32(wrap(i, n)) * params.n + u32(wrap(j, n));
}

// Periodic backtrace coordinate in grid units, fraction-complete FP-edge guard.
fn backtrace(pos: f32, velcomp: f32, dt_dx: f32) -> f32 {
  let n = f32(params.n);
  var x = pos - velcomp * dt_dx;
  x = x - floor(x / n) * n;      // np.mod semantics: x in [0, n], n at the FP edge
  if (x >= n) { x = 0.0; }       // the guarded limit (see header note)
  return x;
}

struct BilinearCoords {
  i0: i32,
  j0: i32,
  fx: f32,
  fy: f32,
};

fn backtrace_coords(i: u32, j: u32, vel: vec2<f32>, dt_dx: f32) -> BilinearCoords {
  let xb = backtrace(f32(i), vel.x, dt_dx);
  let yb = backtrace(f32(j), vel.y, dt_dx);
  var c: BilinearCoords;
  c.i0 = i32(floor(xb));
  c.j0 = i32(floor(yb));
  c.fx = xb - f32(c.i0);
  c.fy = yb - f32(c.j0);
  return c;
}

// Lex (i, j) bilinear vertex ordering — the reference's determinism clause 2.
fn bilinear_vel_in(c: BilinearCoords) -> vec2<f32> {
  let f00 = vel_in[idx_of(c.i0, c.j0)];
  let f01 = vel_in[idx_of(c.i0, c.j0 + 1)];
  let f10 = vel_in[idx_of(c.i0 + 1, c.j0)];
  let f11 = vel_in[idx_of(c.i0 + 1, c.j0 + 1)];
  return (1.0 - c.fx) * (1.0 - c.fy) * f00
       + (1.0 - c.fx) * c.fy * f01
       + c.fx * (1.0 - c.fy) * f10
       + c.fx * c.fy * f11;
}

fn bilinear_vel_aux(c: BilinearCoords) -> vec2<f32> {
  let f00 = vel_aux[idx_of(c.i0, c.j0)];
  let f01 = vel_aux[idx_of(c.i0, c.j0 + 1)];
  let f10 = vel_aux[idx_of(c.i0 + 1, c.j0)];
  let f11 = vel_aux[idx_of(c.i0 + 1, c.j0 + 1)];
  return (1.0 - c.fx) * (1.0 - c.fy) * f00
       + (1.0 - c.fx) * c.fy * f01
       + c.fx * (1.0 - c.fy) * f10
       + c.fx * c.fy * f11;
}

fn bilinear_scalar_in(c: BilinearCoords) -> f32 {
  let f00 = scalar_in[idx_of(c.i0, c.j0)];
  let f01 = scalar_in[idx_of(c.i0, c.j0 + 1)];
  let f10 = scalar_in[idx_of(c.i0 + 1, c.j0)];
  let f11 = scalar_in[idx_of(c.i0 + 1, c.j0 + 1)];
  return (1.0 - c.fx) * (1.0 - c.fy) * f00
       + (1.0 - c.fx) * c.fy * f01
       + c.fx * (1.0 - c.fy) * f10
       + c.fx * c.fy * f11;
}

// --- 1. Semi-Lagrangian velocity self-advection (the MacCormack predictor,
//        and the whole advection when the exploratory plain-SL toggle is on):
//        vel_out = SL_backtrace(vel_in, vel_in, +dt).
@compute @workgroup_size(8, 8, 1)
fn advect_vel_sl(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let idx = gid.x * params.n + gid.y;
  let c = backtrace_coords(gid.x, gid.y, vel_in[idx], params.dt_dx);
  vel_out[idx] = bilinear_vel_in(c);
}

// --- 2. MacCormack corrector: vel_out = pred + 0.5*(orig - SL(pred, orig, -dt)).
//        vel_in = the ORIGINAL velocity (also the advecting field),
//        vel_aux = the predictor. Limiter (flags bit 0, exploratory — OFF on
//        the gated path, matching the reference's deliberate omission): clamp
//        to the min/max of the four forward-trace interpolation corners
//        (GPU Gems 3 ch. 30 clamp variant of Selle et al. 2008).
@compute @workgroup_size(8, 8, 1)
fn advect_vel_maccormack_correct(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let idx = gid.x * params.n + gid.y;
  let orig = vel_in[idx];
  // backward trace of the predictor through the SAME original velocity field
  let cb = backtrace_coords(gid.x, gid.y, orig, -params.dt_dx);
  let corr_back = bilinear_vel_aux(cb);
  let pred = vel_aux[idx];
  var result = pred + 0.5 * (orig - corr_back);
  if ((params.flags & 1u) != 0u) {
    let cf = backtrace_coords(gid.x, gid.y, orig, params.dt_dx);
    let f00 = vel_in[idx_of(cf.i0, cf.j0)];
    let f01 = vel_in[idx_of(cf.i0, cf.j0 + 1)];
    let f10 = vel_in[idx_of(cf.i0 + 1, cf.j0)];
    let f11 = vel_in[idx_of(cf.i0 + 1, cf.j0 + 1)];
    let lo = min(min(f00, f01), min(f10, f11));
    let hi = max(max(f00, f01), max(f10, f11));
    result = clamp(result, lo, hi);
  }
  vel_out[idx] = result;
}

// --- 3. Explicit diffusion: vel_out = vel_in + dt*nu*lap5(vel_in).
@compute @workgroup_size(8, 8, 1)
fn diffuse_vel(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let idx = gid.x * params.n + gid.y;
  let center = vel_in[idx];
  let lap = (vel_in[idx_of(i - 1, j)] + vel_in[idx_of(i + 1, j)]
           + vel_in[idx_of(i, j - 1)] + vel_in[idx_of(i, j + 1)]
           - 4.0 * center) * params.inv_dx2;
  vel_out[idx] = center + params.dt * params.nu * lap;
}

// --- 4. Fused centered divergence + curl (div feeds the projection; curl is a
//        data-derived diagnostic/render field — no extra solver work).
//        scalar_out = divergence, scalar_aux = curl_z.
@compute @workgroup_size(8, 8, 1)
fn divergence_curl(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let idx = gid.x * params.n + gid.y;
  let xp = vel_in[idx_of(i + 1, j)];
  let xm = vel_in[idx_of(i - 1, j)];
  let yp = vel_in[idx_of(i, j + 1)];
  let ym = vel_in[idx_of(i, j - 1)];
  scalar_out[idx] = (xp.x - xm.x) * params.inv_2dx + (yp.y - ym.y) * params.inv_2dx;
  scalar_aux[idx] = (xp.y - xm.y) * params.inv_2dx - (yp.x - ym.x) * params.inv_2dx;
}

// --- 5. Jacobi sweep: p_out = 0.25*(neighbors(p_in) - dx^2 * rhs) with
//        rhs = (rho/dt) * div — the reference's operation order (rhs scaled
//        first, then dx^2·rhs subtracted). scalar_in = p ping, scalar_out =
//        p pong, scalar_aux = divergence (read only).
@compute @workgroup_size(8, 8, 1)
fn jacobi(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let idx = gid.x * params.n + gid.y;
  let rhs = params.c_rhs * scalar_aux[idx];
  scalar_out[idx] = 0.25 * (
      scalar_in[idx_of(i - 1, j)] + scalar_in[idx_of(i + 1, j)]
    + scalar_in[idx_of(i, j - 1)] + scalar_in[idx_of(i, j + 1)]
    - params.dx2 * rhs);
}

// --- 6. Gradient subtract: vel_out = vel_in - (dt/rho) * grad(p) (centered).
//        scalar_in = pressure.
@compute @workgroup_size(8, 8, 1)
fn gradient_subtract(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let idx = gid.x * params.n + gid.y;
  let dpdx = (scalar_in[idx_of(i + 1, j)] - scalar_in[idx_of(i - 1, j)]) * params.inv_2dx;
  let dpdy = (scalar_in[idx_of(i, j + 1)] - scalar_in[idx_of(i, j - 1)]) * params.inv_2dx;
  vel_out[idx] = vel_in[idx] - params.c_grad * vec2<f32>(dpdx, dpdy);
}

// --- 7. Density advection: plain bilinear SL with the PROJECTED velocity
//        (post-projection, matching sim.py's canonical loop; deliberately NOT
//        MacCormack — the reference's asymmetry is part of the canonical).
//        scalar_in = density_in, scalar_out = density_out, vel_in = velocity.
@compute @workgroup_size(8, 8, 1)
fn advect_density(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.n || gid.y >= params.n) { return; }
  let idx = gid.x * params.n + gid.y;
  let c = backtrace_coords(gid.x, gid.y, vel_in[idx], params.dt_dx);
  scalar_out[idx] = bilinear_scalar_in(c);
}
