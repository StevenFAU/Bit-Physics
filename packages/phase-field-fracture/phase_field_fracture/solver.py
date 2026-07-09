"""Explicit-dynamic phase-field fracture solver (dtype-preserving).

One class drives every gated scenario: velocity-Verlet (kick-drift-kick,
one force evaluation per step) with lumped mass and mass-proportional
damping, KE/IE-disciplined quasi-static loading (spec-ref.md § 3.6), the
hybrid momentum pass, the Miehe strain-spectral driving force, and either
damage update from spec-ref.md § 3.5 (``gf`` browser baseline or ``ell``
converged-elliptic reference).

The SENT notch is a traction-free slit in the material stiffness field
(``e_mult`` cells at E_VOID) — NOT a damage/history seed: the spike
(2026-07-09) measured the void notch at 694 N vs the 701 N published peak
(1.0 %) where an H-seeded band notch sat 9.9 % low (its smeared band adds
spurious compliance and fracture energy). The driving force scales with the
local stiffness multiplier, so voids never nucleate damage.

Energy ledger per step (gate G-energy): external work W_ext accumulates
F_reaction * dU; damping dissipation D_damp and gradient-flow dissipation
D_gf = sum (delta d)^2 h^2 / m accumulate explicitly, so the disclosed
finite-mobility Gamma(v) cost is itself a measured observable (§ 5.4 lens).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .reference import (
    E_TILDE_MIEHE,
    L_TILDE_MIEHE,
    NU_MIEHE,
    center_strain,
    dilatational_speed,
    elliptic_damage_solve,
    gradient_flow_damage,
    plane_strain_lame,
    psi_plus_miehe,
    q1_gradient_tables,
    q1_internal_forces,
)

E_VOID = 1e-6  # stiffness multiplier inside voids/notches (traction-free)
K_RES = 1e-6  # residual g(d) so broken cells keep a stable explicit step


@dataclass(frozen=True)
class FractureConfig:
    """Non-dimensional scene (spec-ref.md § 9 units: ell = 1, Gc/ell = 1,
    rho = 1). Defaults are the Miehe SENT steel groups."""

    n: int = 128
    l_domain: float = L_TILDE_MIEHE
    e_tilde: float = E_TILDE_MIEHE
    nu: float = NU_MIEHE
    u_end: float = 0.42
    vload_frac: float = 1e-4  # v_load / c_d (§ 3.6 KE/IE discipline)
    t_ramp: float = 10.0
    cfl: float = 0.4
    c_damp: float = 1.5
    mobility_m: float = 1.0  # m = chi * dt_cfl (gradient-flow knob)
    damage_mode: str = "gf"  # "gf" | "ell"
    notch: str = "void"  # "void" | "none"
    capture_every: int = 2500  # full-state checkpoints (h5 size budget)
    diag_every: int = 50  # F-delta / energy-ledger samples

    @property
    def h(self) -> float:
        return self.l_domain / self.n

    @property
    def lame(self) -> tuple[float, float]:
        return plane_strain_lame(self.e_tilde, self.nu)

    @property
    def dt(self) -> float:
        lam, mu = self.lame
        return self.cfl * self.h / dilatational_speed(lam, mu)

    @property
    def vload(self) -> float:
        lam, mu = self.lame
        return self.vload_frac * dilatational_speed(lam, mu)

    @property
    def step_count(self) -> int:
        t_end = self.t_ramp * 0.5 + abs(self.u_end) / self.vload
        return int(t_end / self.dt) + 1


@dataclass
class StepDiagnostics:
    step: int
    t: float
    u_applied: float
    reaction: float
    ke: float
    ie: float
    e_frac: float
    w_ext: float
    d_damp: float
    d_gf: float
    d_max: float


@dataclass
class SolverState:
    ux: np.ndarray
    uy: np.ndarray
    vx: np.ndarray
    vy: np.ndarray
    d: np.ndarray
    h_field: np.ndarray


@dataclass
class TraceResult:
    config: FractureConfig
    diagnostics: list[StepDiagnostics] = field(default_factory=list)
    capture_steps: list[int] = field(default_factory=list)
    captures: list[SolverState] = field(default_factory=list)


class FractureSolver:
    """Dtype-preserving explicit solver; ``dtype=np.float32`` is the faithful
    WGSL-arithmetic proxy used for the tolerance measurement."""

    def __init__(self, cfg: FractureConfig, dtype: type = np.float64) -> None:
        self.cfg = cfg
        self.ft = np.dtype(dtype)
        n = cfg.n
        self.h = self._c(cfg.h)
        lam, mu = cfg.lame
        self.lam = lam
        self.mu = mu
        self.dt = self._c(cfg.dt)
        self.dndx, self.dndy = q1_gradient_tables(cfg.h, self.ft)
        sh_n = (n + 1, n + 1)
        self.ux = np.zeros(sh_n, self.ft)
        self.uy = np.zeros(sh_n, self.ft)
        self.vx = np.zeros(sh_n, self.ft)
        self.vy = np.zeros(sh_n, self.ft)
        self.ax = np.zeros(sh_n, self.ft)
        self.ay = np.zeros(sh_n, self.ft)
        self.d = np.zeros((n, n), self.ft)
        self.h_field = np.zeros((n, n), self.ft)
        # material fields (draw-your-own obstacles surface, § 5.2): stiffness
        # multiplier E(x)/E0 and toughness multiplier Gc(x)/Gc0
        self.e_mult = np.ones((n, n), self.ft)
        self.gc_mult = np.ones((n, n), self.ft)
        if cfg.notch == "void":
            j0 = n // 2
            self.e_mult[: n // 2, j0] = self._c(E_VOID)
        self.t = 0.0
        self.step_index = 0
        self.reaction = 0.0
        self.ie = 0.0
        self.w_ext = 0.0
        self.d_damp = 0.0
        self.d_gf = 0.0
        self._u_prev_applied = 0.0
        self._force_eval()  # prime velocity-Verlet acceleration

    def _c(self, x: float) -> np.ndarray:
        return np.asarray(x, dtype=self.ft)

    def u_applied(self, t: float) -> float:
        """Smooth start ramp then constant loading rate (§ 3.6). The sign of
        ``u_end`` selects tension (+) or compression (-) — gate G-split."""
        cfg = self.cfg
        sign = -1.0 if cfg.u_end < 0.0 else 1.0
        if t <= 0.0:
            return 0.0
        if t < cfg.t_ramp:
            return sign * 0.5 * cfg.vload * t * t / cfg.t_ramp
        return sign * cfg.vload * (t - 0.5 * cfg.t_ramp)

    def _g_stiff(self) -> np.ndarray:
        one = self._c(1.0)
        return (np.square(one - self.d) + self._c(K_RES)) * self.e_mult

    def _force_eval(self) -> None:
        fx, fy, ie = q1_internal_forces(
            self.ux,
            self.uy,
            self._g_stiff(),
            self.dndx,
            self.dndy,
            self.lam,
            self.mu,
            float(self.h),
        )
        self.ie = ie
        # reaction on the constrained top row (per unit thickness, force
        # unit Gc): the constraint supplies -f_int there
        self.reaction = -float(np.sum(fy[:, -1], dtype=np.float64))
        inv_mass = self._c(1.0 / (float(self.h) * float(self.h)))
        c_damp = self._c(self.cfg.c_damp)
        self.ax = fx * inv_mass - c_damp * self.vx
        self.ay = fy * inv_mass - c_damp * self.vy

    def _apply_bc_u(self, u_top: float) -> None:
        self.ux[:, 0] = 0.0
        self.uy[:, 0] = 0.0
        self.ux[:, -1] = 0.0
        self.uy[:, -1] = self._c(u_top)

    def _apply_bc_v(self, v_top: float) -> None:
        self.vx[:, 0] = 0.0
        self.vy[:, 0] = 0.0
        self.vx[:, -1] = 0.0
        self.vy[:, -1] = self._c(v_top)

    def step(self) -> None:
        """One velocity-Verlet (KDK) step + history + damage update."""
        dt = self.dt
        half_dt = self._c(0.5 * float(dt))
        # kick (half) with the carried acceleration
        self.vx = self.vx + half_dt * self.ax
        self.vy = self.vy + half_dt * self.ay
        # drift
        t_new = self.t + float(dt)
        u_top = self.u_applied(t_new)
        self.ux = self.ux + dt * self.vx
        self.uy = self.uy + dt * self.vy
        self._apply_bc_u(u_top)
        # force at the new configuration, then closing half-kick
        self._force_eval()
        self.vx = self.vx + half_dt * self.ax
        self.vy = self.vy + half_dt * self.ay
        v_top = (self.u_applied(t_new + float(dt)) - u_top) / float(dt)
        self._apply_bc_v(v_top)
        # external work: reaction force through the applied increment
        du = u_top - self._u_prev_applied
        self.w_ext += self.reaction * du
        self._u_prev_applied = u_top
        # damping dissipation (mass-proportional): c * |v|^2 * mass * dt
        h2 = float(self.h) * float(self.h)
        self.d_damp += (
            self.cfg.c_damp
            * float(np.sum(self.vx * self.vx + self.vy * self.vy, dtype=np.float64))
            * h2
            * float(dt)
        )
        # history + damage
        exx, eyy, exy = center_strain(self.ux, self.uy, float(self.h))
        psi = psi_plus_miehe(exx, eyy, exy, self.lam, self.mu) * self.e_mult
        self.h_field = np.maximum(self.h_field, psi)
        d_old = self.d
        if self.cfg.damage_mode == "gf":
            self.d = gradient_flow_damage(
                self.d,
                self.h_field,
                self.cfg.mobility_m,
                float(self.h),
                gc=self.gc_mult,
            )
            delta = (self.d - d_old).astype(np.float64)
            self.d_gf += float(np.sum(delta * delta)) * h2 / self.cfg.mobility_m
        else:
            self.d, _ = elliptic_damage_solve(
                self.d, self.h_field, float(self.h), gc=self.gc_mult
            )
        self.t = t_new
        self.step_index += 1

    # -- observables -------------------------------------------------------

    def kinetic_energy(self) -> float:
        h2 = float(self.h) * float(self.h)
        return (
            0.5
            * float(np.sum(self.vx * self.vx + self.vy * self.vy, dtype=np.float64))
            * h2
        )

    def fracture_energy(self) -> float:
        """Regularized AT2 surface energy (Gc = 1): equals crack length in
        ell units once the profile is converged (gate G-gamma)."""
        d64 = self.d.astype(np.float64)
        gx, gy = np.gradient(d64, float(self.h))
        gc64 = self.gc_mult.astype(np.float64)
        dens = 0.5 * gc64 * (d64 * d64 + gx * gx + gy * gy)
        return float(np.sum(dens)) * float(self.h) ** 2

    def diagnostics(self) -> StepDiagnostics:
        return StepDiagnostics(
            step=self.step_index,
            t=self.t,
            u_applied=self._u_prev_applied,
            reaction=self.reaction,
            ke=self.kinetic_energy(),
            ie=self.ie,
            e_frac=self.fracture_energy(),
            w_ext=self.w_ext,
            d_damp=self.d_damp,
            d_gf=self.d_gf,
            d_max=float(self.d.max()),
        )

    def state(self) -> SolverState:
        return SolverState(
            ux=self.ux.copy(),
            uy=self.uy.copy(),
            vx=self.vx.copy(),
            vy=self.vy.copy(),
            d=self.d.copy(),
            h_field=self.h_field.copy(),
        )


def run_trace(cfg: FractureConfig, dtype: type = np.float64) -> TraceResult:
    """Run the full loading protocol, capturing state at the fixed cadence
    (step-index order — determinism per conventions § F) plus the final step."""
    solver = FractureSolver(cfg, dtype=dtype)
    res = TraceResult(config=cfg)

    def capture() -> None:
        res.capture_steps.append(solver.step_index)
        res.captures.append(solver.state())

    capture()
    res.diagnostics.append(solver.diagnostics())
    for i in range(1, cfg.step_count + 1):
        solver.step()
        if i % cfg.diag_every == 0 or i == cfg.step_count:
            res.diagnostics.append(solver.diagnostics())
        if i % cfg.capture_every == 0 or i == cfg.step_count:
            capture()
    return res
