// signal-workbench — interaction templates (spec-ref § 5.4): ship templates,
// not a blank canvas. Every preset defines a generator (JS f64) AND its
// exact analytic overlay; the default view is a usable instrument.

import type { ViewMode } from "./renderer.js";

export interface PresetSpec {
  key: string;
  label: string;
  title: string;
  view: ViewMode;
  /** generator kind dispatched by main.ts */
  gen: "fm" | "leak" | "additive" | "naive-vs-bandlimited" | "chirp" | "xy";
  params: Record<string, number | string>;
}

export const PRESETS: PresetSpec[] = [
  {
    key: "fm",
    label: "FM sidebands",
    title:
      "Chowning FM: measured spectrum vs the exact J_n(I) Bessel stems — the moat in one screen. Drag the index through 2.4048 to null the carrier.",
    view: "spectrum",
    gen: "fm",
    params: { kc: 512, km: 37, index: 3.2, amplitude: 1.0, window: "rectangular" },
  },
  {
    key: "leak",
    label: "Window / leakage",
    title:
      "Off-bin tone: the 'spread' IS the window's own transform. The overlay is the exact shifted-Dirichlet skirt W(w - w0), not a fit.",
    view: "spectrum",
    gen: "leak",
    params: { f0: 100.37, amplitude: 0.8, phase: 0.3, window: "hann" },
  },
  {
    key: "additive",
    label: "Additive builder",
    title:
      "Truncated Fourier saw: exact harmonic lines 2/(pi k); bandlimited by construction, Gibbs overshoot predicted at 8.95%.",
    view: "spectrum",
    gen: "additive",
    params: { f0: 31, kind: "saw", harmonics: 16, window: "rectangular" },
  },
  {
    key: "alias",
    label: "Aliasing / Nyquist",
    title:
      "NEGATIVE LESSON (ungated): the naive sampled saw grows aliased lines the bandlimited golden lacks. The discretization is shown, not hidden.",
    view: "spectrum",
    gen: "naive-vs-bandlimited",
    params: { f0: 331, harmonics: 6, window: "rectangular" },
  },
  {
    key: "chirp",
    label: "Chirp / spectrogram",
    title:
      "Linear chirp through the batched-STFT waterfall; instantaneous frequency is analytic.",
    view: "spectrogram",
    gen: "chirp",
    params: { f0: 40, f1: 1600, window: "hann" },
  },
  {
    key: "persist",
    label: "Persistence phosphor",
    title:
      "DPX-style decaying hit-count histogram of the live spectrum (display-only rendering of gated data).",
    view: "persistence",
    gen: "fm",
    params: { kc: 512, km: 37, index: 3.2, amplitude: 1.0, window: "rectangular", sweep: 1 },
  },
  {
    key: "xy",
    label: "XY / Lissajous beam",
    title:
      "woscope CRT model: each segment is the closed-form Gaussian-beam erf integral; slow beam = brighter. Rational p:q closes the figure.",
    view: "xy",
    gen: "xy",
    params: { p: 3, q: 2, phase: 0.5 },
  },
];

export function presetByKey(key: string): PresetSpec {
  const p = PRESETS.find((s) => s.key === key);
  if (!p) throw new Error(`unknown preset ${key}`);
  return p;
}
