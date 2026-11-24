// Listen (05-strange-attractors.md, scenes; M3): x → pitch, z → brightness,
// a wing switch → a click. The sound follows a CPU-side f64 trajectory at the
// sim's own pace (no GPU readback). Sound is off until the visitor turns it
// on: no AudioContext exists before that gesture, so a page that never asks
// for sound — the headless capture driver included — never opens one.

import { h, slider, toggle } from "@bp/studio";
import type { LorenzParams, V3 } from "./model/lorenz.js";
import { DT, rk4Step } from "./model/lorenz.js";

/** Pitch: x semitones-ish around A3 (x ∈ ±20 → about ±15 semitones). */
export const pitchOf = (x: number): number => 220 * 2 ** ((0.75 * x) / 12);
/** Brightness: z sets a low-pass cutoff, an octave per 8 units of z (z 5 → 300 Hz, z 45 → ~9.6 kHz). */
export const cutoffOf = (z: number): number => 300 * 2 ** ((z - 5) / 8);

/** The trajectory being heard: f64 RK4 at the gated Δt, a switch wherever x changes sign. */
export class ListenTrajectory {
  x: V3;
  t = 0;
  switches = 0;
  /** Recent samples for the trace: [t, x, switched]. */
  readonly trace: { t: number; x: number; sw: boolean }[] = [];

  constructor(readonly start: V3 = [1, 1, 20]) {
    this.x = [...start];
  }

  reset(): void {
    this.x = [...this.start];
    this.t = 0;
    this.switches = 0;
    this.trace.length = 0;
  }

  /** Step `n` RK4 steps; return the fractions (0–1) of the way through where switches fell. */
  advance(p: LorenzParams, n: number): number[] {
    const at: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const before = this.x[0];
      this.x = rk4Step(p, this.x, DT).next;
      this.t += DT;
      const sw = before !== 0 && Math.sign(before) !== Math.sign(this.x[0]);
      if (sw) {
        this.switches += 1;
        at.push((i + 1) / n);
      }
      if (i % 4 === 0 || sw) this.trace.push({ t: this.t, x: this.x[0], sw });
    }
    while (this.trace.length > 0 && this.trace[0]!.t < this.t - 30) this.trace.shift();
    return at;
  }
}

/** The sound: a sawtooth through a low-pass, and a panned click per switch. Built on the first "on". */
class Voice {
  readonly ctx: AudioContext;
  private readonly osc: OscillatorNode;
  private readonly filter: BiquadFilterNode;
  private readonly master: GainNode;
  private readonly noise: AudioBuffer;

  constructor(volume: number) {
    this.ctx = new AudioContext();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    this.filter = c.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 4;
    this.filter.connect(this.master);
    this.osc = c.createOscillator();
    this.osc.type = "sawtooth";
    const tone = c.createGain();
    tone.gain.value = 0.18;
    this.osc.connect(tone).connect(this.filter);
    this.osc.start();
    // a short noise burst, decaying: the click
    this.noise = c.createBuffer(1, Math.round(c.sampleRate * 0.03), c.sampleRate);
    const d = this.noise.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < d.length; i += 1) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      d[i] = ((seed / 2 ** 32) * 2 - 1) * Math.exp(-i / (d.length * 0.18));
    }
    this.setVolume(volume);
  }

  setVolume(v: number): void {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  set(x: number, z: number): void {
    const t = this.ctx.currentTime;
    this.osc.frequency.setTargetAtTime(pitchOf(x), t, 0.02);
    this.filter.frequency.setTargetAtTime(Math.min(cutoffOf(z), 12000), t, 0.02);
  }

  click(when: number, side: number): void {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const g = c.createGain();
    g.gain.value = 0.9;
    const pan = c.createStereoPanner();
    pan.pan.value = 0.6 * side;
    src.connect(g).connect(pan).connect(this.master);
    src.start(Math.max(when, c.currentTime));
  }
}

export interface ListenPanel {
  el: HTMLElement;
  /** Advance the heard trajectory by the frame's steps (frame length `dtSec`); sound if on. */
  frame(p: LorenzParams, steps: number, dtSec: number): void;
  /** Start again from the trajectory's start (a scene load, new parameters). */
  restart(): void;
  draw(): void;
  /** Turn the sound off (leaving the scene). */
  silence(): void;
  readonly trajectory: ListenTrajectory;
  /** The audio context, once the visitor has asked for sound (tests). */
  context(): AudioContext | null;
}

export function buildListenPanel(): ListenPanel {
  const traj = new ListenTrajectory();
  let voice: Voice | null = null;
  let on = false;
  let volume = 0.35;
  const status = h("p", { class: "cx-panel-status", role: "status" }, "");
  const sound = toggle(
    "Sound",
    false,
    (v) => {
      on = v;
      if (on && !voice) voice = new Voice(volume);
      if (voice) {
        if (on) void voice.ctx.resume();
        voice.setVolume(on ? volume : 0);
      }
    },
    "Turn the sound on or off",
  );
  sound.el.dataset["cx"] = "sound";
  const vol = slider({
    label: "Volume",
    min: 0,
    max: 1,
    step: 0.05,
    value: volume,
    format: (v) => `${Math.round(v * 100)}%`,
    onInput: (v) => {
      volume = v;
      if (voice && on) voice.setVolume(v);
    },
  });
  const canvas = h("canvas", { class: "cx-listen-trace", role: "img", "aria-label": "x against time, with a tick at every wing switch" });
  const el = h(
    "section",
    { class: "cx-panel bp-surface", "aria-label": "Listen", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
    h("h2", { class: "cx-panel-title" }, "Wing switches, heard"),
    status,
    h("div", { class: "cx-panel-row" }, sound.el),
    vol.el,
    canvas,
    h(
      "p",
      { class: "cx-panel-note" },
      "Pitch follows x (left wing low, right wing high), brightness follows z, and each switch of wing is a click, panned to the wing it lands on. The switches never settle into a rhythm. Sound stays off until you turn it on.",
    ),
  );
  const draw = (): void => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const hh = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== hh) {
      canvas.width = w;
      canvas.height = hh;
    }
    const c = canvas.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, w, hh);
    const tr = traj.trace;
    if (tr.length < 2) return;
    const t1 = traj.t;
    const t0 = t1 - 30;
    const X = (t: number): number => ((t - t0) / 30) * w;
    const Y = (x: number): number => hh * (0.5 - x / 44);
    c.strokeStyle = "rgba(255,255,255,0.18)";
    c.beginPath();
    c.moveTo(0, hh / 2);
    c.lineTo(w, hh / 2);
    c.stroke();
    c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--bp-accent").trim() || "#e8c88f";
    c.lineWidth = 1.2 * dpr;
    c.beginPath();
    tr.forEach((s, i) => (i === 0 ? c.moveTo(X(s.t), Y(s.x)) : c.lineTo(X(s.t), Y(s.x))));
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.75)";
    for (const s of tr) if (s.sw) c.fillRect(X(s.t) - 0.5 * dpr, hh - 8 * dpr, 1 * dpr, 8 * dpr);
  };
  let lastStatus = 0;
  return {
    el,
    trajectory: traj,
    frame(p, steps, dtSec) {
      if (steps <= 0) return;
      const at = traj.advance(p, steps);
      if (voice && on) {
        voice.set(traj.x[0], traj.x[2]);
        const t = voice.ctx.currentTime;
        for (const f of at) voice.click(t + f * dtSec, Math.sign(traj.x[0]));
      }
      const now = performance.now();
      if (now - lastStatus > 250) {
        lastStatus = now;
        status.textContent = `${traj.switches} wing switch${traj.switches === 1 ? "" : "es"} in ${traj.t.toFixed(0)} time units · x ${traj.x[0].toFixed(1)}, z ${traj.x[2].toFixed(1)}`;
      }
    },
    restart() {
      traj.reset();
    },
    draw,
    silence() {
      if (on) {
        on = false;
        sound.set(false);
        voice?.setVolume(0);
      }
    },
    context: () => voice?.ctx ?? null,
  };
}
