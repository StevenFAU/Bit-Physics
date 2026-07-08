// signal-workbench — AudioWorkletProcessor (spec-ref § 5.2 platform rules).
//
// Dependency-free plain JS in public/ (the Vite worklet-bundling trap:
// vitejs/vite#9606/#9952 — a bundled/transpiled worklet breaks inside
// AudioWorkletGlobalScope). Loaded via
// audioWorklet.addModule(import.meta.env.BASE_URL + "worklet-processor.js").
//
// Synthesis runs the SAME analytic generator definitions as the reference
// and the WGSL — never OscillatorNode/BiquadFilterNode (vendor internals,
// unverifiable). Playback is a RENDERING of the signal (like a colormap):
// explicitly ungated (spec-ref § 8). Every constant derives from the global
// `sampleRate` and the actual block length — never hardcoded 48000/128.

class SwSynthProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "carrierHz", defaultValue: 440, minValue: 0, maxValue: 20000, automationRate: "k-rate" },
      { name: "modHz", defaultValue: 110, minValue: 0, maxValue: 20000, automationRate: "k-rate" },
      { name: "index", defaultValue: 0, minValue: 0, maxValue: 16, automationRate: "k-rate" },
      { name: "gain", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "a-rate" },
      // 0 = FM (index 0 degenerates to a sine), 1 = additive saw,
      // 2 = additive square, 3 = naive saw (the aliasing negative lesson,
      //     audible), 4 = silence
      { name: "mode", defaultValue: 0, minValue: 0, maxValue: 4, automationRate: "k-rate" },
      { name: "harmonics", defaultValue: 16, minValue: 1, maxValue: 64, automationRate: "k-rate" },
    ];
  }

  constructor() {
    super();
    this.phaseC = 0; // carrier phase in cycles
    this.phaseM = 0; // modulator phase in cycles
  }

  process(_inputs, outputs, parameters) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const ch0 = out[0];
    const blockLen = ch0.length; // read, never assume 128 (renderSizeHint)
    const fs = sampleRate; // AudioWorkletGlobalScope global
    const fc = parameters.carrierHz[0];
    const fm = parameters.modHz[0];
    const index = parameters.index[0];
    const mode = Math.round(parameters.mode[0]);
    const nHarm = Math.round(parameters.harmonics[0]);
    const gains = parameters.gain;
    const incC = fc / fs;
    const incM = fm / fs;
    const TAU = 2 * Math.PI;

    for (let i = 0; i < blockLen; i++) {
      let v = 0;
      if (mode === 0) {
        v = Math.sin(TAU * this.phaseC + index * Math.sin(TAU * this.phaseM));
      } else if (mode === 1 || mode === 2) {
        // exact truncated Fourier series, partials clamped below Nyquist
        const kMax = Math.min(nHarm, Math.floor(fs / 2 / Math.max(fc, 1e-6)));
        for (let k = 1; k <= kMax; k++) {
          if (mode === 1) {
            v += (((k % 2 === 1 ? 1 : -1) * 2) / (Math.PI * k)) * Math.sin(TAU * k * this.phaseC);
          } else if (k % 2 === 1) {
            v += (4 / (Math.PI * k)) * Math.sin(TAU * k * this.phaseC);
          }
        }
        v *= 0.5; // headroom
      } else if (mode === 3) {
        v = 2 * (this.phaseC - Math.floor(this.phaseC)) - 1; // aliases, on purpose
        v *= 0.5;
      }
      const g = gains.length > 1 ? gains[i] : gains[0];
      ch0[i] = v * g;
      this.phaseC += incC;
      this.phaseM += incM;
      if (this.phaseC >= 1) this.phaseC -= Math.floor(this.phaseC);
      if (this.phaseM >= 1) this.phaseM -= Math.floor(this.phaseM);
    }
    for (let c = 1; c < out.length; c++) out[c].set(ch0);
    return true;
  }
}

registerProcessor("sw-synth", SwSynthProcessor);
