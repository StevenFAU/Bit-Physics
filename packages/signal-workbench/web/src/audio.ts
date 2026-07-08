// signal-workbench — WebAudio playback bridge (spec-ref § 5.2).
//
// The repo's FIRST AUDIBLE sim: the worklet synthesizes the same analytic
// generator the display dissects. Playback is ungated (a rendering, § 8).
// Platform rules pinned here: ctx.resume() only inside the play gesture;
// worklet loaded from public/ via BASE_URL; constants derived from
// ctx.sampleRate; no SharedArrayBuffer (GitHub Pages has no COOP/COEP) —
// AudioParams only, control-rate.

export class AudioBridge {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private ready = false;

  get isPlaying(): boolean {
    return this.ready && this.ctx?.state === "running";
  }

  /** Must be called from a user gesture (the play button). */
  async start(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 48000 });
      const base = import.meta.env.BASE_URL ?? "./";
      await this.ctx.audioWorklet.addModule(`${base}worklet-processor.js`);
      this.node = new AudioWorkletNode(this.ctx, "sw-synth", {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      this.node.connect(this.ctx.destination);
      this.ready = true;
    }
    await this.ctx.resume();
  }

  async stop(): Promise<void> {
    if (this.ctx && this.ctx.state === "running") await this.ctx.suspend();
  }

  /** Map the current generator params (bin units at the nominal 48k/4096
   * frame) onto audio-rate parameters; derive Hz from the frame geometry. */
  update(params: {
    mode: number;
    kcBins: number;
    kmBins: number;
    index: number;
    harmonics: number;
    gain: number;
    frameN: number;
  }): void {
    if (!this.node || !this.ctx) return;
    const hzPerBin = 48000 / params.frameN; // the visual frame's mapping
    const p = this.node.parameters;
    p.get("carrierHz")?.setValueAtTime(params.kcBins * hzPerBin, this.ctx.currentTime);
    p.get("modHz")?.setValueAtTime(params.kmBins * hzPerBin, this.ctx.currentTime);
    p.get("index")?.setValueAtTime(params.index, this.ctx.currentTime);
    p.get("mode")?.setValueAtTime(params.mode, this.ctx.currentTime);
    p.get("harmonics")?.setValueAtTime(params.harmonics, this.ctx.currentTime);
    p.get("gain")?.setTargetAtTime(params.gain, this.ctx.currentTime, 0.02);
  }
}
