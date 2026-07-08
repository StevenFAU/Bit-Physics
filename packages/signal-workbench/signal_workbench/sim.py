"""SimRunner adapter — signal-workbench canonical captures.

Determinism strategy (spec-ref section 8):

1. **Pure array math.** Generators are elementwise closed forms; the analysis
   FFT is pocketfft. No atomics, no scatter, no reduction-order hazards. The
   cross-BUILD caveat is numeric equivalence, not byte identity; same-build
   same-hw is bit-exact and witnessed by the internal 2-run comparison.
2. **No RNG on the gated paths.** Both canonical scenes are analytic; ``seed``
   is kept in the runner signature for SimRunner Protocol parity only.
3. **Single-frame capture** (step 0): a signal frame is the sim's unit of
   time; there is no time-stepping loop to checkpoint.

The canonical capture carries BOTH gated analysis paths (the heat-equation
two-path precedent, spec-ref section 13.1):

- ``x_fm`` / ``X_fm_re`` / ``X_fm_im`` — the coherent Chowning FM scene
  (rectangular window, every sideband on-bin): measured DFT vs the exact
  J_n(I) line spectrum, machine-exact in f64.
- ``x_leak`` / ``X_leak_re`` / ``X_leak_im`` — the incoherent hann-windowed
  tone: measured DFT vs the exact shifted-Dirichlet window-DTFT skirt
  (the discrete-spectrum discipline made a gate, section 3.2).
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference import parseval_residual, peak_rms_crest
from .synthesis import fm_expected_dft, fm_signal, sine
from .windows import tone_windowed_dft, window

CANONICAL_DESCRIPTOR: Final[str] = "fm-bessel-plus-hann-leak-N4096"
CANONICAL_SEED: Final[int] = 42
CANONICAL_N: Final[int] = 4096
CANONICAL_FS: Final[float] = 48000.0

# FM scene: all lines on-bin (kc, km integer; gcd(kc, km) = 1), audible
# carrier 6 kHz, modulator ~434 Hz, index deep enough for rich sidebands.
CANONICAL_FM_KC: Final[int] = 512
CANONICAL_FM_KM: Final[int] = 37
CANONICAL_FM_INDEX: Final[float] = 3.2
CANONICAL_FM_AMPLITUDE: Final[float] = 1.0

# Leakage scene: deliberately off-bin tone under a hann window; the golden
# is the exact window-DTFT skirt, not a line.
CANONICAL_LEAK_F0_BINS: Final[float] = 100.37
CANONICAL_LEAK_AMPLITUDE: Final[float] = 0.8
CANONICAL_LEAK_PHASE: Final[float] = 0.3
CANONICAL_LEAK_WINDOW: Final[str] = "hann"

# Web-gate scene = the canonical scene (spec-ref section 13.1): one frame is
# cheap enough for a browser and the live f64 re-run inside verify.py.
GATE_DESCRIPTOR: Final[str] = "fm-bessel-plus-hann-leak-N4096-webgate"


@dataclass(frozen=True)
class WorkbenchConfig:
    n: int = CANONICAL_N
    fm_kc: int = CANONICAL_FM_KC
    fm_km: int = CANONICAL_FM_KM
    fm_index: float = CANONICAL_FM_INDEX
    fm_amplitude: float = CANONICAL_FM_AMPLITUDE
    leak_f0_bins: float = CANONICAL_LEAK_F0_BINS
    leak_amplitude: float = CANONICAL_LEAK_AMPLITUDE
    leak_phase: float = CANONICAL_LEAK_PHASE
    leak_window: str = CANONICAL_LEAK_WINDOW


@dataclass
class WorkbenchResult:
    config: WorkbenchConfig
    x_fm: np.ndarray = field(default_factory=lambda: np.empty(0))
    spec_fm: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=complex))
    x_leak: np.ndarray = field(default_factory=lambda: np.empty(0))
    spec_leak: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=complex))
    golden_fm: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=complex))
    golden_leak: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=complex))
    determinism_witness_sha256: str = ""


def canonical_config(n: int | None = None) -> WorkbenchConfig:
    return WorkbenchConfig(n=CANONICAL_N if n is None else n)


def gate_config() -> WorkbenchConfig:
    return WorkbenchConfig()


def _evaluate(cfg: WorkbenchConfig) -> WorkbenchResult:
    res = WorkbenchResult(config=cfg)
    res.x_fm = fm_signal(cfg.n, cfg.fm_kc, cfg.fm_km, cfg.fm_index, cfg.fm_amplitude)
    res.spec_fm = np.fft.fft(res.x_fm)
    res.golden_fm = fm_expected_dft(
        cfg.n, cfg.fm_kc, cfg.fm_km, cfg.fm_index, cfg.fm_amplitude
    )
    res.x_leak = sine(cfg.n, cfg.leak_f0_bins, cfg.leak_amplitude, cfg.leak_phase)
    w = window(cfg.leak_window, cfg.n)
    res.spec_leak = np.fft.fft(w * res.x_leak)
    res.golden_leak = tone_windowed_dft(
        cfg.leak_window,
        cfg.n,
        cfg.leak_f0_bins,
        cfg.leak_amplitude,
        cfg.leak_phase,
    )
    return res


def max_rel_of_peak(measured: np.ndarray, golden: np.ndarray) -> float:
    """max_abs(measured - golden) / max_abs(golden) — the gate metric."""
    scale = float(np.max(np.abs(golden)))
    return float(np.max(np.abs(measured - golden))) / max(scale, 1e-300)


def run_canonical(cfg: WorkbenchConfig | None = None) -> WorkbenchResult:
    """Evaluate the canonical scene TWICE and assert bit-identity before
    returning (the section-8 determinism witness)."""
    cfg = cfg or canonical_config()
    r1 = _evaluate(cfg)
    r2 = _evaluate(cfg)
    for name in ("x_fm", "spec_fm", "x_leak", "spec_leak"):
        if not np.array_equal(getattr(r1, name), getattr(r2, name)):
            raise AssertionError(f"{name} run-twice bit-identity violated")
    h = hashlib.sha256()
    for name in ("x_fm", "spec_fm", "x_leak", "spec_leak"):
        h.update(getattr(r1, name).tobytes())
    r1.determinism_witness_sha256 = h.hexdigest()
    return r1


def _states_from_result(res: WorkbenchResult) -> list[StepState]:
    diags: dict[str, float] = {
        "parseval_rel_err_fm": parseval_residual(res.x_fm),
        "parseval_rel_err_leak": parseval_residual(res.x_leak),
        "max_line_err_fm": max_rel_of_peak(res.spec_fm, res.golden_fm),
        "max_skirt_err_leak": max_rel_of_peak(res.spec_leak, res.golden_leak),
    }
    peak, rms, crest = peak_rms_crest(res.x_fm)
    diags["peak_fm"] = peak
    diags["rms_fm"] = rms
    diags["crest_fm"] = crest
    state = {
        "x_fm": res.x_fm,
        "X_fm_re": np.real(res.spec_fm),
        "X_fm_im": np.imag(res.spec_fm),
        "x_leak": res.x_leak,
        "X_leak_re": np.real(res.spec_leak),
        "X_leak_im": np.imag(res.spec_leak),
    }
    return [StepState(step=0, state=state, diagnostics=diags)]


def _build_manifest(
    *,
    descriptor: str,
    seed: int,
    cfg: WorkbenchConfig,
    wall_clock_seconds: float,
    tier: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "signal-workbench",
            "category": "signal-processing",
            "variant": "fm-bessel-plus-window-leakage",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "phase-6-signal-workbench",
        },
        config={
            "tier": tier,
            "dims": [cfg.n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "n": cfg.n,
                "fs": CANONICAL_FS,
                "fm_kc": cfg.fm_kc,
                "fm_km": cfg.fm_km,
                "fm_index": cfg.fm_index,
                "fm_amplitude": cfg.fm_amplitude,
                "leak_f0_bins": cfg.leak_f0_bins,
                "leak_amplitude": cfg.leak_amplitude,
                "leak_phase": cfg.leak_phase,
                "leak_window": cfg.leak_window,
            },
        },
        run={
            "step_count": 1,
            "capture_interval": 1,
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-07-08T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": f"{descriptor}.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — the canonical fm-bessel + hann-leak capture."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = canonical_config()
    t0 = time.perf_counter()
    res = run_canonical(cfg)
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=CANONICAL_DESCRIPTOR,
        seed=seed,
        cfg=cfg,
        wall_clock_seconds=wall,
        tier="test",
    )
    return write_capture(_states_from_result(res), manifest, out_dir)


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic-tier SimRunner — N=1024 for gate-11 cost."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = WorkbenchConfig(n=1024, fm_kc=128, fm_km=9)
    t0 = time.perf_counter()
    res = run_canonical(cfg)
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor="fm-bessel-plus-hann-leak-N1024-diagnostic",
        seed=seed,
        cfg=cfg,
        wall_clock_seconds=wall,
        tier="diagnostic",
    )
    return write_capture(_states_from_result(res), manifest, out_dir)


__all__ = [
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_FM_AMPLITUDE",
    "CANONICAL_FM_INDEX",
    "CANONICAL_FM_KC",
    "CANONICAL_FM_KM",
    "CANONICAL_FS",
    "CANONICAL_LEAK_AMPLITUDE",
    "CANONICAL_LEAK_F0_BINS",
    "CANONICAL_LEAK_PHASE",
    "CANONICAL_LEAK_WINDOW",
    "CANONICAL_N",
    "CANONICAL_SEED",
    "GATE_DESCRIPTOR",
    "WorkbenchConfig",
    "WorkbenchResult",
    "canonical_config",
    "gate_config",
    "max_rel_of_peak",
    "run_canonical",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
]
