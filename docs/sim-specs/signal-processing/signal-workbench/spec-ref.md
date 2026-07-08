# signal-workbench — Reference Spec

> **Status:** Phase-6 candidate spec sheet — **research draft v0.2 (2026-07-08)**. v0.1:
> deep-web-research pass (5-angle fan-out, 21 primary/secondary sources, 25
> adversarially-verified claims: 23 confirmed / 2 refuted) + gap-closing pass
> (metrology, communications, Web Audio, prior-art). **v0.2 same-day review pass**
> (repo-anchor verification + independent primary-source re-verification + prior-art
> deepening + instrument-visual/platform research): Harris Table I **errata** corrections —
> goldens re-derived, never hand-copied (§ 4.2); THD formula dimensional fix (§ 4.7); COLA
> endpoint-convention pinning (§ 4.2); EVM peak-vs-RMS normalization caveat (§ 4.6);
> coherent sampling restated as coprimality (§ 3.2); FFT anchor corrected to the shared
> `common/common-web/src/fft-wgsl.ts` (§ 2, § 5.2); AnalyserNode claim narrowed (§ 2
> anchor 18); moat wording hardened + four adjacent first-in-browser gaps claimed (§ 2.1,
> § 14); instrument-grade visual system specified — persistence engine, XY beam, Pro-Q
> filter grammar (§ 5.5); GitHub-Pages WebAudio platform rules pinned (§ 5.2, § 11).
> NOT executed. Gate rows below
> are **declared targets** to be MEASURED at build per `docs/architecture.md` § 2.6 /
> Appendix D (measured-then-declared).
>
> **Category:** signal-processing / instrumentation (see § 13.2 operator decision 1 —
> new `signal-processing` category recommended; `closed-form` is the zero-new-category
> fallback since every ground truth here is a closed-form transform).
> **Primary surface:** web-deployable (Stack B / WebGPU + TypeScript, f32, **plus
> WebAudio for playback**) driven by a verified **f64 NumPy / SciPy reference**, reusing
> the repo's Stockham radix-2 WGSL FFT + polynomial-trig kernels from
> `packages/schrodinger-smoke/web/src/isf_core.wgsl`.
> **Strategic role:** the repo's first **audible** sim and first **instrumentation** sim
> — a signal generator + analyzer where every displayed time/frequency quantity is gated
> against the closed-form transform of the signal's own generator.

---

## 1. Scope

`signal-workbench` is an interactive DSP instrument: a **signal chain**
(`source → modulate/synthesize → process → analyze`, the GNU Radio
source→block→sink model) whose defining property is that, because every signal is
generated from **analytic primitives**, the workbench knows the **exact closed-form
transform** and overlays it on the measured display, gating the deviation.

Three families are **lenses on one chain**, not three apps (§ 3): **audio synthesis**
(oscillators, FM/AM, additive, subtractive), **filter design** (biquad/pole-zero/Bode),
and **communications / vector signal analysis** (I/Q, digital modulation, pulse
shaping). One FFT, one scope rack, one gate concept spans all three.

The signal is single-channel, real (or analytic-signal complex for the comms lens), at
an audio sample rate (default 48 kHz). Displays: **oscilloscope** (time, trigger +
**XY/Lissajous beam mode**, § 5.5), **spectrum analyzer** (windowed FFT, with
**persistence/density mode**, § 5.5), **spectrogram / waterfall** (STFT),
**phase / group delay**, **pole-zero (z-plane)**, **Bode / frequency response**,
**constellation / IQ**, **eye diagram** (persistence-accumulated), **histogram**,
**autocorrelation / cepstrum**;
plus live **metrology** (THD, SNR, SINAD, SFDR, ENOB, EVM, peak/RMS/crest).

### 1.1 Load-bearing honesty boundary (repeated in web copy)

v1 is a **verified single-channel, audio-rate DSP instrument**, not a
software-defined-radio stack or a filter-design CAD suite. GNU Radio (the flowgraph SDR
baseline) authors arbitrary block graphs, drives real RF hardware, and runs multichannel
at RF sample rates; MATLAB's DSP System Toolbox generates fixed-point/HDL, designs
arbitrary FIR/IIR, and streams multichannel scopes. v1 covers the **verified pedagogical
floor**: a fixed, preset signal chain (not a blank-canvas graph authoring tool),
floating-point only, single channel, audio-rate. The comms lens is **baseband/audio-rate
pedagogy** (I/Q at audio rate), explicitly not real RF.

**Non-goals for v1:**

- Real SDR / hardware I/O (no RTL-SDR, no sound-card RF).
- User-authored arbitrary DSP flowgraphs (v1 ships fixed chain presets, § 5.4).
- Fixed-point / HDL / code generation.
- Multichannel or true-RF sample rates; channel models, fading, real synchronization.
- Arbitrary filter-design CAD (v1 ships the RBJ biquad family + windowed-sinc FIR; not
  Parks-McClellan / elliptic / arbitrary-order cascades — a later track).

Those are later tracks. v1 earns its place by being a verified, interactive, **audible**
DSP instrument whose every display is falsifiable against a closed-form reference.

### 1.2 Landing order (each increment independently gate-green)

Per `docs/architecture.md` append-only landing discipline, the superset ships in four
gate-green increments (§ 13.2 operator decision 6):

1. **v1 core** — chain + oscilloscope + spectrum(+windows) + spectrogram, **plus the
   § 5.5 persistence engine and XY/Lissajous beam render** (the landing visual); sources
   (sine, bandlimited saw/square/triangle, noise, chirp) + AM/FM; goldens = Chowning FM
   Bessel spectrum (§ 4.4), window figures-of-merit + leakage-as-convolution (§ 4.2), the
   Rayleigh energy gate (§ 4.1).
2. **v1.1 filter lab** — biquad + pole-zero + Bode/group-delay, in the § 5.5 Pro-Q-grammar
   filter view; gate = closed-form
   `H(e^{jω})` from RBJ coefficients (§ 4.5).
3. **v1.2 comms** — analytic signal / Hilbert I/Q + PSK/QAM + constellation +
   persistence-accumulated eye, **plus the live BER-vs-Eb/N0 waterfall** (seeded AWGN,
   measured BER points accumulating onto the closed-form Q-function curve, § 4.6); gate =
   ideal constellation geometry + EVM (§ 4.6) + seeded-BER exact error count.
4. **v1.3 metrology** — THD/SNR/SINAD/SFDR/ENOB, autocorrelation/cepstrum pitch, an
   explicit Nyquist/aliasing negative-lesson (§ 4.7, § 3.6).

## 2. Upstream and reference anchors

This is a from-scratch Bit-Physics sim. No upstream code is vendored.

**Local anchors already in the repo:**

- `common/common-web/src/fft-wgsl.ts` — the **shared** Stockham radix-2 WGSL FFT source
  (`FFT_PRECISION_TRIG_WGSL` / `FFT_BUTTERFLY_WGSL` / `FFT_COMMON_WGSL`): polynomial-trig
  twiddles (`sin_poly4`/`cos_poly4`/`cs_p`) plus the coordinate-agnostic butterfly.
  Consumers supply a `coord_of()` mapping and inject via a `//__COMMON_FFT__` marker —
  `packages/schrodinger-smoke/web/src/isf_core.wgsl` (3D) and the heat-equation web demo
  (2D) are the two shipped consumers. The workbench adds a **1D + batched-STFT
  `coord_of`** over the same shared source (§ 5.2) — not a rewrite, not a new dependency.
  (**v0.2 correction:** v0.1 called this "a port of the schrodinger-smoke kernel"; the
  poly-trig FFT actually lives in common-web and is injected into isf_core at build. The
  f64 multiplier tables cited in v0.1 are schrodinger's CPU-precomputed buffers — the
  workbench's analog is CPU-f64-precomputed window/decay buffers, § 5.2.)
- `common/common-web/src/panel-shell.ts` (`createPanelShell`, `PresetSpec`, `VerdictSpec`)
  and `common/common-web/src/capture-export.ts` (`exposeCapture`, `runCaptureExclusive`) —
  the landed Play/Study chrome, preset-template plumbing, gate-verdict display, and
  browser-capture helpers that § 5.6's layers ride on; reuse, don't hand-roll.
- `packages/heat-equation/heat_equation/spectral.py` — the repo's NumPy f64 FFT reference
  pattern (`np.fft`, mode conventions); the workbench reference mirrors its
  measured-then-declared discipline.
- `common/common-web/src/colormap.ts` — shared perceptually-uniform colormaps (viridis /
  inferno / magma / turbo + house ramps) for the spectrogram/waterfall (§ 5.5); never
  forked.
- `common/common-web/` INTERACT/EXPLAIN/PROVE/RENDER four-layer web pattern (landed rd2d /
  schrodinger-smoke / heat-equation demos), reused verbatim (§ 5.6).

**External research anchors (Cat-1 citations; verified in the 2026-07-08 research pass —
vote recorded where adversarially checked):**

*Spectral analysis / windows.*

1. **Harris, F.J. (1978).** "On the use of windows for harmonic analysis with the discrete
   Fourier transform." *Proc. IEEE* 66(1):51–83. DOI 10.1109/PROC.1978.10837. **Table I**
   anchors the figure-of-merit **definitions and column semantics** (§ 4.2, § 7 A) and the
   leakage-as-convolution framing (verified 3-0). **v0.2 errata caveat (load-bearing):
   Harris's printed numbers are NOT golden.** Nuttall 1981 documents errors in the paper
   itself ("Some of the windows presented by Harris are not correct in terms of their
   reported peak sidelobes"): Hann side-lobe −32 → true **−31.47 dB**; "minimum" 3-term
   Blackman-Harris −67 → **−70.83 dB**; exact Blackman −51 → **−68.24 dB**; the printed
   4-term coefficients do not sum to 1; and Harris's "minimum" windows are not minimal
   (true minima −71.48 / −98.17 dB). Golden table A is therefore **re-derived numerically
   from the committed coefficients** and anchored to Nuttall Table II + Heinzel (anchors
   2, 24); Harris supplies definitions only. PDF:
   https://www.cs.cmu.edu/afs/cs/user/bhiksha/WWW/courses/dsp/spring2013/WWW/schedule/readings/windows_comparison2_harris.pdf
2. **Nuttall, A.H. (1981).** "Some windows with very good sidelobe behavior." *IEEE Trans.
   ASSP* 29(1):84–91. DOI 10.1109/TASSP.1981.1163506. Canonical for the minimum 4-term
   Blackman-Harris / Nuttall windows AND the corrections to Harris (anchor 1); its eq.
   (10a) is the exact continuous closed-form DTFT for all sum-of-cosine windows (§ 4.2).
   Continuous-first-derivative window (Nuttall's eq. 34, Heinzel's **Nuttall4b**):
   `a0=0.355768, a1=0.487396, a2=0.144232, a3=0.012604`, three equal side lobes at
   **−93.32 dB**, fall-off **−18 dB/oct** (endpoint sum a0−a1+a2−a3 = 0 exactly).
   Minimum-sidelobe window (eq. 37, **Nuttall4c**): `a0=0.3635819, a1=0.4891775,
   a2=0.1365995, a3=0.0106411`, four equal side lobes at **−98.17 dB**, −6 dB/oct.
   **Cross-validation trap (v0.2):** `scipy.signal.windows.nuttall` and MATLAB
   `nuttallwin` both implement **Nuttall4c** (the 0.3635819… set), while Wikipedia's
   "Nuttall window, continuous first derivative" is the 4b set — validating the 4b
   coefficients against scipy's `nuttall` fails by construction; the f64 reference must
   commit its own coefficient tables and name both windows explicitly.
3. **Smith, J.O. III.** *Spectral Audio Signal Processing* (CCRMA). Rectangular-window DTFT
   = Dirichlet/aliased-sinc kernel `W_R(ω)=sin(Mω/2)/sin(ω/2)`; window figures-of-merit;
   Hamming `α=25/46≈0.54`, peak side-lobe ≈−42.76 dB (family-optimal `0.53836` → −43.19 dB);
   COLA perfect-reconstruction (verified 3-0). https://ccrma.stanford.edu/~jos/sasp/
   (mirror https://www.dsprelated.com/freebooks/sasp/) **v0.2 pins:** the generator commits
   `α = 0.54` exactly, NOT the exact rational 25/46 — 25/46 nulls the *first* side lobe but
   a later lobe rises to **−41.69 dB**, worse than 0.54's −42.67 dB (numerically verified);
   and JOS's COLA statement for Hann refers to the endpoint-**excluded** symmetric form
   (MATLAB `hanning`) — see the § 4.2 endpoint-convention table.
4. **Smith, J.O. III.** *Mathematics of the DFT* (CCRMA). DFT definition (unnormalized
   forward `X(ω_k)=Σ_{n=0}^{N−1} x(t_n)e^{−jω_k t_n}`) and the **Rayleigh/Parseval energy
   theorem** `Σ|x(n)|²=(1/N)Σ|X(k)|²` — the machine-exact FFT energy gate (verified 3-0).
   https://ccrma.stanford.edu/~jos/st/

*Synthesis with closed-form spectra.*

5. **Chowning, J. (1973).** "The synthesis of complex audio spectra by means of frequency
   modulation." *JAES* 21(7):526–534. `e=A·sin(αt+I·sin βt)`, `I=d/m`; sidebands exactly
   `J_n(I)` at `α±nβ` (odd lower sidebands negative); Carson `BW≈2(d+m)` — Chowning states
   the bandwidth rule and the sign structure verbatim (verified 3-0 against the paper
   text). **Citation split (v0.2):** the energy identity `J_0²+2Σ_{n≥1}J_n²=1` is **DLMF
   10.23.3** (anchor 25) — Chowning states it only qualitatively ("energy stolen from the
   carrier"); the `J_0` zeros 2.4048 / 5.5201 come from Bessel-zero tables, not the paper.
   https://yamahasynth.com/wp-content/uploads/images/fm_synthesispaper-2.pdf
6. **Stilson, T. & Smith, J.O. (1996).** "Alias-free digital synthesis of classic analog
   waveforms" (BLIT). *ICMC* pp.332–335. Naive saw/square alias (round-off = one-sample
   rectangular pulse → infinite sinc-weighted harmonics, ~6 dB/oct); BLIT
   `Sinc_M(x)=sin(πx)/(M·sin(πx/M))`, `M=2⌊P/2⌋+1`; saw via `z/(z−1)` integration
   (verified 3-0). https://ccrma.stanford.edu/~stilti/papers/blit.pdf
7. **Välimäki, V. & Huovilainen, A. (2007).** "Antialiasing oscillators in subtractive
   synthesis." *IEEE Signal Processing Mag.* 24(2):116–125. ISSN 1053-5888. PolyBLEP /
   BLEP-corrected oscillators; confirms trivial-saw ~6 dB/oct decay + Nyquist-mirrored
   aliasing (verified 3-0). DOI 10.1109/MSP.2007.323276.
8. **Smith, J.O. III (Nam, J.).** CCRMA virtual-analog synthesis notes — BLIT as building
   block via the Discrete Summation Formulae periodic-sinc series.
   https://ccrma.stanford.edu/~juhan/vas.html

*Filters.*

9. **Bristow-Johnson, R.** "Audio EQ Cookbook" (W3C Technical Report; author is the
   formula's originator). Exact biquad `H(z)=(b0+b1z⁻¹+b2z⁻²)/(a0+a1z⁻¹+a2z⁻²)`,
   Direct-Form-I difference equation, and the `ω0=2π f0/Fs`, `A=10^{dBgain/40}`,
   `α=sin ω0/(2Q)` (and BW / shelf-slope) intermediates for
   LPF/HPF/BPF/notch/APF/peaking/shelf (verified 3-0). https://www.w3.org/TR/audio-eq-cookbook/
   (ASCII original on musicdsp.org; HTML mirror webaudio.github.io — independent renderings.)
10. **Smith, J.O. III.** *Introduction to Digital Filters, with Audio Applications*
    (CCRMA). `H(e^{jω})` evaluation, pole-zero geometry → magnitude/phase, group delay
    `−dφ/dω`, bilinear transform + frequency warping, stability (poles inside unit circle).
    https://ccrma.stanford.edu/~jos/filters/
11. **Oppenheim, A.V. & Schafer, R.W.** *Discrete-Time Signal Processing* (3rd ed.).
    Textbook anchor for the DFT/DTFT, windowed-sinc FIR design, group delay, and the
    sign/normalization conventions the spec pins (§ 4). ISBN 978-0131988422.

*Communications / VSA.*

12. **Proakis, J.G. & Salehi, M.** *Digital Communications* (5th ed.). ISBN
    978-0072957167. Analytic signal / Hilbert I/Q; BPSK/QPSK/M-PSK/M-QAM constellation
    geometry + Gray coding; raised-cosine / RRC and the Nyquist ISI-free criterion; matched
    filtering.
13. **Root-raised-cosine / raised-cosine filter** — RC satisfies the Nyquist ISI
    criterion (zero at `±nT`); RRC² = RC so cascaded Tx/Rx RRC is the matched-filter
    ISI-free pair; roll-off `β` sets excess bandwidth. https://en.wikipedia.org/wiki/Root-raised-cosine_filter
    ; ISI/RRC tutorial https://complextoreal.com/wp-content/uploads/2013/01/isi.pdf ;
    MATLAB `rcosdesign` https://www.mathworks.com/help/signal/ref/rcosdesign.html
14. **Error Vector Magnitude (EVM).** RMS error vector between measured and ideal symbol
    positions, normalized to a reference (max symbol magnitude *or* RMS-average constellation
    magnitude — convention must be pinned). Keysight 89600 digital-demod help
    https://rfmw.em.keysight.com/wireless/helpfiles/89600b/webhelp/subsystems/digdemod/content/digdemod_symtblerrdata_evm.htm
    ; Rohde-Schwarz "Understanding EVM"
    https://www.rohde-schwarz.com/us/products/test-and-measurement/analyzers/signal-spectrum-analyzers/understanding-error-vector-magnitude_258370.html
    ; NIST "EVM Calculation for Broadband Modulated Signals"
    https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=31813 ; Wikipedia
    https://en.wikipedia.org/wiki/Error_vector_magnitude
15. **QAM normalization + Gray coding.** Average-energy normalization (QPSK unit energy;
    16-/64-QAM corner-normalized scaling `5/9`, `3/7`), Gray mapping = single-bit change
    between nearest neighbors. GNU Radio Constellation Object
    https://wiki.gnuradio.org/index.php/Constellation_Object ; MATLAB `qammod`
    https://www.mathworks.com/help/comm/ref/qammod.html ; DSPlog scaling
    https://dsplog.com/2007/09/23/scaling-factor-in-qam/

*Metrology.*

16. **Analog Devices, MT-003 Tutorial.** "Understand SINAD, ENOB, SNR, THD, THD+N, and
    SFDR so you don't get lost in the noise floor." Ideal `SNR=6.02N+1.76` dB;
    `ENOB=(SINAD−1.76)/6.02`; `THD = √(ΣV_h²)/V_1 = √(ΣP_h/P_1)` (rms-amplitude ratio —
    **v0.2 fix**: v0.1's `√(ΣP)/P` form was dimensionally wrong); `SFDR`=signal-to-worst-spur
    (verified against IEEE 1241 methodology). https://www.analog.com/media/en/training-seminars/tutorials/MT-003.pdf
17. **IEEE Std 1241-2010** (ADC terminology and test methods) and **IEEE Std 1057** —
    normative definitions of SNR/SINAD/SFDR/ENOB, coherent-sampling and windowing
    methodology, and noise-power-bandwidth correction. **AES17** for audio-specific THD+N.
    DOI 10.1109/IEEESTD.2011.5692956.

*Substrate / reference implementations.*

18. **W3C, Web Audio API 1.1** https://www.w3.org/TR/webaudio-1.1/ + MDN `AnalyserNode`
    https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode . Normative (v0.2
    narrowed to the exact spec text): `getFloatFrequencyData()` applies a **fixed,
    non-defeatable Blackman window** (classic α=0.16: a0=0.42, a1=0.5, a2=0.08), FFT,
    **linear-magnitude time-smoothing** (`smoothingTimeConstant`, default 0.8 — **can** be
    set to 0, contra v0.1's "no way to disable"), then dB — **magnitude only, no phase, no
    complex bins** (WebAudio-v2 issue #107
    https://github.com/WebAudio/web-audio-api-v2/issues/107). The frequency path is
    therefore still **unsuitable for the moat** (forced window, no phase). Nuance worth
    keeping: `getFloatTimeDomainData()` is a **raw, unsmoothed** time-domain ring buffer
    (up to `fftSize` 32768) — a legitimate main-thread tap that can feed the workbench's
    own gated FFT. `AudioWorklet` (custom DSP on the audio rendering thread) handles
    sample-accurate playback
    https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet .
19. **GNU Radio qtgui** https://www.gnuradio.org/doc/doxygen/page_qtgui.html — the
    industry-standard sink taxonomy the scope rack mirrors: time / frequency / waterfall /
    constellation / histogram / time-raster / eye. Displays, but does not overlay an analytic
    reference or gate deviation (§ 2.1).
20. **FFTW accuracy** http://www.fftw.org/accuracy/method.html + Burrus, *Fast Fourier
    Transforms*, "Numerical Accuracy in FFTs"
    https://eng.libretexts.org/Bookshelves/Electrical_Engineering/Signal_Processing_and_Modeling/Fast_Fourier_Transforms_(Burrus)/10%3A_Implementing_FFTs_in_Practice/10.08%3A_Numerical_Accuracy_in_FFTs
    — FFT relative RMS error grows only ~`O(√log N)` on average (Schatzman, anchor 26) /
    `O(log N)` worst-case (Gentleman & Sande 1966), so a pure tone's transform is near
    machine-exact; the empirical basis for the Rayleigh/leakage gates being sharp. **v0.2
    attribution fix:** the `O(√N)` direct-DFT comparison is Schatzman's result, not
    FFTW's page (whose `O(√N)`/`O(N)` figures concern trig-recurrence error).
21. **Lloyd, D.B., Boyd, C. & Govindaraju, N. (2008).** "Fast computation of general Fourier
    transforms on GPUs." Microsoft Research TR-2008-62. Stockham auto-sort = the standard GPU
    FFT (no bit-reversal; fixed ping-pong pass order → the § 8 determinism property).
    **v0.2 — the "immature WGSL FFT" claim, made citable:** no public WGSL FFT is
    maintained, reference-validated, and metrology-grade as of 2026-07 — VkFFT has no
    WebGPU backend (https://github.com/DTolm/VkFFT/issues/144 open, unanswered since
    2023-11), ONNX Runtime Web ships **zero** spectral ops on its WebGPU EP, tfjs's WebGPU
    backend lacks RFFT and is in maintenance mode; standalone WGSL FFT repos are
    zero-adoption experiments or app-embedded demos validated by visual plausibility only.

*Added at v0.2 review (independent re-verification pass).*

24. **Heinzel, G., Rüdiger, A. & Schilling, R. (2002).** "Spectrum and spectral density
    estimation by the DFT, including a comprehensive list of window functions and some new
    flat-top windows." MPI für Gravitationsphysik. The metrology-grade window reference:
    ENBW, amplitude-vs-PSD normalization, and the Nuttall4b/4c naming this spec uses.
    https://holometer.fnal.gov/GH_FFT.pdf
25. **NIST DLMF § 10.23.** https://dlmf.nist.gov/10.23 — the FM energy identity
    `J_0²(I)+2Σ_{n≥1}J_n²(I)=1` is DLMF **10.23.3** (special case of Neumann's addition
    theorem); `J_0` zeros 2.4048, 5.5201 per DLMF/MathWorld Bessel-zero tables (anchor 5
    citation split).
26. **Schatzman, J.C. (1996).** "Accuracy of the discrete Fourier transform and the fast
    Fourier transform." *SIAM J. Sci. Comput.* 17(5):1150–1166. The `O(√N)`-direct-DFT vs
    `O(√log N)`-average-FFT RMS-error result (anchor 20 attribution fix).
27. **Render-layer technique anchors (RENDER only — never gate anchors):** m1el, "How
    oscilloscopes draw" (woscope) — closed-form Gaussian-beam segment integral for XY
    rendering, § 5.5 — https://m1el.github.io/woscope-how/ ; Tektronix DPX primer —
    density/persistence display = decaying per-pixel hit-count histogram —
    https://download.tek.com/document/37W_19638_7_DPX%20Acquisition%20for%20RSA.pdf ;
    Fitz, K. & Fulop, S., "A unified theory of time-frequency reassignment,"
    arXiv:0903.3080 (reassigned spectrogram, § 5.5 later-increment polish); FabFilter
    Pro-Q analyzer UX (spectrum-grab / piano-axis / dB-per-oct tilt grammar)
    https://www.fabfilter.com/help/pro-q/using/analyzer .

*Prior art (added in the gap-closing pass; deepened at v0.2 — see § 2.1).*

22. **RF spectrum-analyzer limit-line / spectral-emission-mask (SEM) testing** — Keysight
    "Making fast pass/fail testing with spectrum analyzers"
    https://www.keysight.com/us/en/assets/7018-04069/application-notes/5991-2930.pdf ;
    Keysight SEM https://helpfiles.keysight.com/csg/tdscdma/Spectrum_Emission_Mask_(SEM)_Measurement.htm
    ; MATLAB 802.11ad SEM https://www.mathworks.com/help/wlan/ug/802-11ad-transmitter-spectral-emission-mask-testing.html
    . The **nearest prior art**: instruments overlay a reference and show pass/fail — but the
    reference is a **regulatory tolerance mask**, not the closed-form transform of the signal's
    own generator (§ 2.1).
23. **"Free Signal Processing Tool"** (simulations4all) — a browser DSP tool (FFT,
    spectrogram, filter designer, pole-zero, phase, group delay, convolution) whose math is
    stated to be "verified against Smith's DSP Guide / Oppenheim & Willsky / MIT OCW 6.003."
    https://simulations4all.com/simulations/signal-processing-tool . This is
    **verification-during-development**, not a **live per-run gate** with a displayed
    error metric (§ 2.1).

**Do NOT claim (refuted or convention-caveated in the research pass — votes recorded):**

- **"The rectangular window's main-lobe width is `2π/M`"** — refuted 0-3. `2π/M` is the
  **half-width** (peak to first zero); the correct encodable full-width golden is **`4π/M`**
  (§ 4.2, § 7 A). Baking `2π/M` in would halve every resolution claim.
- **"Carson's rule gives the exact FM bandwidth / spectral support"** — over-reach. `BW≈2(d+m)`
  is an empirical ~98%-power **approximation** (FM has infinitely many nonzero Bessel
  sidebands). Use `≈`; the *exact* golden is the per-sideband `J_n(I)` amplitude set (§ 4.4).
- **"The minimum 4-term Blackman-Harris bounds the achievable side-lobe/ENBW trade-off"** —
  over-reach (2-1). Nuttall (−98 dB), Kaiser, and Dolph-Chebyshev reach other points; the
  numeric figures (−92 dB, ENBW 2.00 bins) are solid but are one point, not a bound.
- **"Hann meets COLA at hop `R=(M+1)/2`" (or at `(M−1)/2`) — stated without pinning the
  endpoint convention** — either bare claim is wrong half the time. Numerically verified
  trio (v0.2, ripple ≤1e-15): symmetric Hann **with zero endpoints included** →
  `R=(M−1)/2`; symmetric with endpoints **excluded** (MATLAB `hanning`, the form JOS's
  statement refers to) → `R=(M+1)/2`; **periodic/DFT-even** → `R=M/2`. v0.1's refutation
  item had itself picked the wrong pairing (§ 4.2 pins the trio).
- **"Harris Table I values can be hand-copied as goldens"** — refuted: the paper has
  documented errata corrected by Nuttall 1981 (Hann −32 → −31.47 dB; min-3-term BH −67 →
  −70.83 dB; exact Blackman −51 → −68.24 dB; 4-term coefficients don't sum to 1). Table A
  values are re-derived numerically from committed coefficients (§ 2 anchor 1, § 4.2, § 7 A).
- **"`scipy.signal.windows.nuttall` validates the Nuttall4b coefficients"** — refuted:
  scipy and MATLAB `nuttallwin` implement the **minimum-sidelobe Nuttall4c**
  (a0=0.3635819…, −98.17 dB), not the CFD 4b set (§ 2 anchor 2).
- **"Hamming `α=25/46` exactly is the best 2-term choice"** — trap: the exact rational
  nulls the first side lobe but a later lobe rises to −41.69 dB, *worse* than plain 0.54
  (−42.67 dB) and the family-optimal 0.53836 (−43.19 dB). The generator pins `α=0.54`
  (§ 2 anchor 3).
- **"Web Audio's `AnalyserNode` can supply the analysis spectrum for gating"** — still
  refuted, on narrowed grounds (v0.2): its smoothing **is** defeatable
  (`smoothingTimeConstant=0` is normative — v0.1 overclaimed), but the **fixed Blackman
  window** and **magnitude-only dB output (no phase, no complex bins)** are not. The
  workbench runs its **own** FFT on the raw generated signal; `getFloatTimeDomainData()`
  (raw, unsmoothed) is an acceptable *time-domain* tap (§ 2 anchor 18, § 5.2).
- **"The measured DFT of a windowed tone equals the continuous-time analytic transform"** —
  false and the #1 integrity trap. The measured DFT equals the analytic spectrum **convolved
  with the window's DTFT and sampled on the DFT bin grid** (`F_a=F*W`, § 4.2); the golden must
  be that windowed-discrete transform, not the idealized continuous line spectrum (the
  **discrete-spectrum discipline**, § 3.2 — the direct analog of heat-equation's two-spectra
  trap).
- **"Naive saw/square oscillators are fine"** — refuted: round-off to nearest sample = a
  one-sample rectangular pulse whose spectrum aliases infinitely at ~6 dB/oct; the sim ships
  bandlimited (BLIT/PolyBLEP) oscillators and keeps the naive one only as a negative-lesson
  toggle (§ 3.6).

### 2.1 Prior art — DSP scopes / teaching tools (surveyed 2026-07-08) and the gap

- **GNU Radio qtgui sinks** (anchor 19) — the industry taxonomy the scope rack mirrors
  (time/freq/waterfall/constellation/histogram/eye). They **display** the FFT of whatever
  arrives; there is no analytic ground truth and no error metric — a scope, not a gate.
- **MATLAB `spectrumAnalyzer` / `fvtool` / `zplane` / `freqz` / `grpdelay`** — compute
  responses and even measurements (THD/SINAD/SFDR); `fvtool` plots a *designed* filter's exact
  `H(e^{jω})`. But the spectrum analyzer's measured trace is not overlaid on, and gated
  against, the closed-form transform of the source that produced it.
- **RF spectrum analyzers — limit lines / SEM mask testing** (anchor 22) — the **closest**
  prior art, and the one to disclaim honestly: they overlay a reference envelope on the
  measured PSD and report pass/fail. But the reference is a **hand-authored regulatory
  compliance mask** (an emissions envelope), **not the exact analytic transform of the signal's
  own generator**. Mask testing asks "is the signal inside the legal box?"; the workbench asks
  "does the measured spectrum equal the mathematics that generated it, to a measured
  tolerance?"
- **Browser DSP tools** (anchor 23; plus Web Audio spectrum analyzers, Audacity, Tone.js
  visualizers, `scipy.signal` in notebooks) — display FFTs/spectrograms; the most rigorous
  (simulations4all) states its math is "verified against references," i.e.
  **verified-during-development**, not a **live per-run gate** with a displayed
  measured-vs-analytic error.
- **Interactive teaching tools (v0.2 deepened survey)** — Jack Schaedler's *Seeing
  Circles, Sines and Signals* (https://jackschaedler.github.io/circles-sines-signals/,
  the visual-primer quality bar; self-disclaims rigor); **Falstad** Fourier-series applet
  (drag harmonic bars, hear the result — bidirectional editing worth stealing) and
  `dfilter` (response + pole-zero + impulse + live filtered audio, one-parameter-updates-
  all-views coherence, https://www.falstad.com/dfilter/); **earlevel Biquad Calculator
  v3** (https://www.earlevel.com/main/2021/09/02/biquad-calculator-v3/) and
  **fiiir.com** — theory-only curves computed from coefficients, **no measurement leg at
  all**; **Abex FM spectrum calculator** — interactive `J_n(β)` stems, likewise
  theory-only. None overlays theory ON a measurement.
- **labAlive (UniBw München)** (https://www.etti.unibw.de/labalive/experiment/eye-and-constellation-diagrams/)
  — the closest comms workbench: pulse shaping, Eb/N0 slider, live eye + constellation and
  a **live BER meter**. Java-launched (not web-native); no theoretical-curve overlay, no
  gate. The BER-points-onto-Q-curve pattern (GaussianWaves' static figures) has **no live
  browser implementation** — § 5.4's BER waterfall claims it.
- **Desktop audio analyzers with limit-line pass/fail** (QuantAsylum QA403, Audio
  Precision APx, Virtins, REW) — user-drawn tolerance masks over measured spectra;
  same mask-not-generator-transform structure as SEM testing. **web-platform-tests**
  WebAudio suites do in-browser numeric FFT tolerance checks — dev-time, non-interactive,
  computed-reference-not-closed-form. **WaveForms Live** (Digilent), the one product-grade
  browser instrument, was discontinued 2021 with cursors-only measurements. **In-browser
  THD/SINAD/ENOB or EVM computation: found nowhere** (2026-07-08 survey).

**The gap this spec occupies (stated conjunctively — each clause is load-bearing):**
surveyed tools either plot the **analytic curve alone** (earlevel, fiiir, Abex), plot the
**measured display alone** (scopes, visualizers, waterfalls), gate against a
**hand-authored mask** (SEM / limit lines / QA403 / APx), or check numerics
**off-line/dev-time** (simulations4all, web-platform-tests). We found **no deployed
interactive web tool** that overlays the exact closed-form transform of **its own
generator** on the measured display and **live-gates the deviation** against a declared
tolerance on the visitor's device and in CI. Four adjacent firsts ride along: in-browser
THD/SINAD/SFDR/ENOB metrology, live in-browser EVM, live BER-points-converging-onto-the-
closed-form-Q-curve, and an interactive Bessel-sideband overlay on a measured FM spectrum
(§ 14). Honesty rails: static textbook overlays exist (JOS FM figures, GaussianWaves BER
plots); claim "no deployed interactive web tool," never "no artifact ever."

## 3. Algorithm

### 3.1 The unified chain

One frame produces `N` samples `x[n]` of a real signal at rate `Fs`, from a chain whose
every stage has a closed-form spectral effect:

1. **Source** — `sin`, bandlimited saw/square/triangle (BLIT/PolyBLEP, § 3.5), noise with
   known PSD (white/pink/brown), impulse/step, linear/log chirp, multitone. ADSR envelope.
2. **Modulate / synthesize** — AM (`(1+m·cos ω_m t)·cos ω_c t`), FM/PM (Chowning, § 4.4),
   ring mod, additive Fourier partials; (comms lens) PSK/QAM symbol mapping + RRC pulse
   shaping (§ 4.6).
3. **Process** — RBJ biquad (§ 4.5), windowed-sinc FIR, mixer, delay, Hilbert→analytic
   signal (§ 4.6), resampler (aliasing demo).
4. **Analyze** — window `w[n]` (§ 4.2) → FFT (§ 5.2) → magnitude/phase; STFT for the
   spectrogram; per-display transforms (autocorrelation, cepstrum, constellation, eye).

The **generator parameters are known**, so for each display the workbench computes the
**closed-form transform of exactly the discrete signal it generated** and overlays it.

### 3.2 The discrete-spectrum discipline (the moat's integrity — analog of heat's two-spectra trap)

The single most important correctness rule. The measured DFT `X[k]` of a **windowed,
sampled, finite** signal is **not** the continuous-time analytic transform `F(ω)`. It is

$$
X[k] \;=\; \big(F * W\big)\big(\omega_k\big),\qquad \omega_k = 2\pi k/N,
$$

the analytic spectrum **convolved with the window's DTFT `W`** (Harris Eq. 6; JOS SASP;
§ 4.2), sampled on the DFT bin grid, with sampling-induced aliasing folded in. The golden
overlay must be this **windowed-discrete** transform, computed analytically, **not** the
idealized continuous line spectrum. Two regimes, both exact:

- **Coherent sampling** (metrology mode; IEEE 1241) — choose `f_0 = k_0·Fs/N` with `k_0`
  and `N` **coprime** (IEEE 1241's "mutually prime" condition; for power-of-two `N` this
  reduces to "odd `k_0`" — coprimality is the primitive requirement, oddness the special
  case). Integer periods fit the window AND the `N` samples land on `N` distinct phases
  (quantizer code coverage for the metrology bench, § 4.7). A pure tone lands exactly on
  bin `k_0`; with a rectangular window the DFT is a **single exact line** (all leakage
  nulls fall on other bins). This is the regime for THD/SINAD/SFDR (§ 4.7), where leakage
  would otherwise corrupt the noise floor.
- **Incoherent / off-bin** (leakage-demo mode) — the tone sits between bins; the golden is
  the **exact window-DTFT skirt** `W(ω−ω_0)` (§ 4.2). Overlaying it proves the "spread" is
  not a bug but the window's own transform.

Comparing a measured DFT against the **continuous** line spectrum instead of the
**windowed-discrete** `F*W` leaks the window's main-lobe/leakage bias into what should be a
machine-exact check — exactly the bug the § 6.2 gate table and the § 6.5 negative control
exist to catch. (This is the workbench's `g_h^N`-vs-`exp` moment, per heat-equation § 3.2.)

### 3.3 Analysis-path definitions

DFT (unnormalized forward, JOS/FFTW/NumPy convention — pinned, § 2 anchor 4):
`X[k]=Σ_{n=0}^{N−1} x[n]·w[n]·e^{−j2πkn/N}`. STFT: hop `R`, window length `M`, overlap
`1−R/M`; frames stacked into the spectrogram. Amplitude normalization uses the window's
**coherent gain** (Harris Table I) so a unit sinusoid reads its true amplitude; power/PSD
normalization uses the window's **ENBW** (§ 4.2, § 4.7).

### 3.4 Filter path

Biquad at audio rate — Direct Form I in the f64 reference (the RBJ-canonical form),
transposed Direct Form II in the f32 runtime (§ 4.5 f32 trap; `H(e^{jω})` is
form-independent, so the golden is unchanged); the response overlay evaluates the
closed-form `H(e^{jω})` from the same coefficients. Pole-zero placement (drag a
pole/zero) recomputes coefficients → both the analytic curve and a measured swept-sine /
impulse-response FFT update, locked together (§ 6.2).

### 3.5 Bandlimited oscillators (default) — BLIT / PolyBLEP

Saw/square/triangle are generated bandlimited (§ 4.3): BLIT
`Sinc_M(x)=sin(πx)/(M·sin(πx/M))` integrated via `z/(z−1)` (with a slightly-leaky
integrator + DC block, since the ideal pole sits on the unit circle — Stilson-Smith), or
the cheaper PolyBLEP residual correction at discontinuities (Välimäki-Huovilainen). The
additive-synthesis lens generates the same waveforms as **exact truncated Fourier series**
(saw `Σ (−1)^{k+1}/k · sin kω t`, square odd harmonics `1/k`, triangle `1/k²`), whose
harmonic amplitudes are the analytic golden and whose truncation makes the **Gibbs
overshoot** a measurable, predicted ~8.95% (§ 4.3).

### 3.6 Negative-lesson modes (NOT gates — the discretization shown, not hidden)

- **Naive (non-bandlimited) oscillator** — `saw = 2(f·t mod 1)−1` sampled directly. Run it
  next to the bandlimited version and *watch the aliases fold down* as the fundamental
  sweeps up; the measured spectrum grows spurious lines the analytic bandlimited golden does
  not have. Negative control (§ 6.5), never a product default.
- **Incoherent-sampling metrology error** — measure THD with the tone off-bin and no window:
  leakage smears the harmonics and the reading is wrong. Toggling coherent sampling / a proper
  window fixes it live — the IEEE-1241 lesson made visible (§ 4.7).
- **`AnalyserNode` as the wrong tool** — an EXPLAIN-only side-by-side: the browser's built-in
  frequency readout vs the workbench's own FFT, showing why the former cannot gate (no
  phase / no complex bins, Blackman-forced; smoothing defaults on at τ=0.8 though it *can*
  be zeroed) (§ 2 anchor 18).

## 4. Algebraic form

### 4.1 Rayleigh / Parseval energy gate (machine-exact, all lenses)

With the unnormalized forward DFT (§ 3.3):

$$
\sum_{n=0}^{N-1}|x[n]|^2 \;=\; \frac{1}{N}\sum_{k=0}^{N-1}|X[k]|^2 .
$$

The workbench's own FFT must satisfy this to f64 machine precision (`≤1e-13`); it is the
sharpest, cheapest FFT-correctness gate and is independent of the signal (§ 2 anchor 4,
verified 3-0).

### 4.2 Window transforms, figures-of-merit, and leakage (golden table A)

Rectangular window DTFT (zero-phase form; the causal window adds a linear-phase factor
`e^{−j(M−1)ω/2}` — pinned):

$$
W_R(\omega) \;=\; \frac{\sin(M\omega/2)}{\sin(\omega/2)}\quad(\text{Dirichlet / aliased-sinc}),
$$

main-lobe **full** width `4π/M` (not `2π/M`), first side-lobe ≈ −13.26 dB, roll-off ≈ −6
dB/oct. Leakage is exactly the convolution `X = F * W` (§ 3.2).

**Exact skirt for every shipped window (v0.2 — not just rectangular):** all shipped
windows are sum-of-cosine, `w[n]=Σ_k a_k cos(2πkn/N)`, so the DTFT has the exact closed
form of shifted Dirichlet kernels (Nuttall eq. 10a / 15b):

$$
W(\omega) = a_0 D_N(\omega) + \sum_{k\ge1}\frac{a_k}{2}\Big[D_N\big(\omega-\tfrac{2\pi k}{N}\big) + D_N\big(\omega+\tfrac{2\pi k}{N}\big)\Big],
\qquad D_N(\omega)=e^{-j\omega(N-1)/2}\,\frac{\sin(N\omega/2)}{\sin(\omega/2)},
$$

so the incoherent-tone leakage golden is **exact** for Hann, Hamming, Blackman-Harris,
and Nuttall alike.

Figures-of-merit rows (coherent gain, ENBW [bins], scalloping loss [dB], worst-case
process loss [dB], highest side-lobe [dB], fall-off [dB/oct]) — column order pinned to
avoid the ENBW-vs-3-dB-BW misread; **scallop column is scalloping loss, NOT WCPL** (they
coincide only for the rectangle, whose ENBW is exactly 1). **v0.2: values below are
corrected truth (dense-FFT numeric, matching Nuttall Table II), NOT Harris's printed
numbers** — Harris's −32 (Hann) and −67 (BH min-3) rows would fail a measured gate:

| Window | Side-lobe (dB) | Fall-off (dB/oct) | Coherent gain | ENBW (bins) | Scallop (dB) |
|---|---|---|---|---|---|
| Rectangular | −13.26 | −6 | 1.00 | 1.00 | 3.92 |
| Triangle (Bartlett) | −26.5 | −12 | 0.50 | 1.33 | 1.82 |
| Hann | **−31.5** (Harris: −32) | −18 | 0.50 | 1.50 | 1.42 |
| Hamming (`α=0.54` pinned) | −42.7 | −6 | 0.54 | 1.36 | 1.75 |
| Blackman-Harris (min 3-term) | **−70.8** (Harris: −67) | −6 | 0.42 | 1.71 | 1.13 |
| Blackman-Harris (min 4-term) | −92.0 | −6 | 0.36 | 2.00 | 0.83 |
| Nuttall4b (CFD) | −93.3 (three equal lobes) | −18 | — | — | — |

Coefficients pinned: Hamming `α=0.54` **exactly** (not 25/46 → −41.69 dB, not the
family-optimal 0.53836 → −43.19 dB — one α must reproduce the whole row; v0.1's mixed-α
row was internally inconsistent); Nuttall4b `a0=0.355768, a1=0.487396, a2=0.144232,
a3=0.012604` (≠ min-sidelobe Nuttall4c = scipy/MATLAB `nuttall`, § 2 anchor 2). Values
re-derived by the generator (§ 7 A) and anchored to Nuttall 1981 Table II + Heinzel
(anchor 24); Harris anchors definitions only.

COLA (perfect STFT reconstruction): `Σ_{m} w(n−mR)=1 ∀n`; `R=1` always. **Endpoint
convention is load-bearing — pinned trio (numerically verified at v0.2, ripple ≤1e-15):**
periodic/DFT-even Hann → `R=M/2` (the STFT default this sim ships); symmetric Hann **with
zero endpoints included** → `R=(M−1)/2`; symmetric with endpoints **excluded** (MATLAB
`hanning`; the form JOS's `R=(M+1)/2` statement refers to) → `R=(M+1)/2`. Classic
Blackman (zero-endpoint symmetric) → `R=(M−1)/3`; L-term Blackman-Harris family →
`R≈M/L` (§ 2 anchor 3).

### 4.3 Bandlimited / additive oscillators (golden table B)

BLIT (Stilson-Smith): `Sinc_M(x)=sin(πx)/(M·sin(πx/M))`, `M=2⌊P/2⌋+1` (largest odd integer
≤ period `P`); saw `Saw(z)=z/(z−1)·(BLIT(z)−C_2)` (leaky integrator + DC block in practice).
Exact Fourier series (additive golden): sawtooth `x(t)=Σ_{k≥1}(−1)^{k+1}\frac{2}{k}\sin kω_0
t`; square `Σ_{k \text{ odd}}\frac{4}{π k}\sin kω_0 t`; triangle `Σ_{k \text{ odd}}
\frac{8}{π^2 k^2}(−1)^{(k−1)/2}\sin kω_0 t`. Gibbs overshoot at a jump → ≈ 8.95% of the step,
independent of truncation order `N` (measurable golden). Naive-oscillator aliasing is the
negative control (§ 3.6).

### 4.4 FM/AM closed-form spectra (golden table C — the v1 hero)

Chowning FM: `e(t)=A·sin(ω_c t + I·sin ω_m t)`, modulation index `I=d/m` (peak deviation ÷
modulator freq). Exact spectrum:

$$
e(t)=A\sum_{n=-\infty}^{\infty} J_n(I)\,\sin\big((\omega_c+n\omega_m)t\big),
$$

lines at `f_c ± n·f_m` with amplitudes `J_n(I)` (odd lower sidebands negative), carrier
`J_0(I)` nulls at the Bessel zeros (`I≈2.4048, 5.5201, …` — Bessel tables, anchor 25),
energy identity
`J_0² + 2Σ_{n≥1} J_n² = 1` (DLMF 10.23.3, anchor 25), Carson `BW ≈ 2(d+m)`
(**approximation**, ≥98%-power by convention). AM/DSB: exact lines at
`f_c` and `f_c ± f_m` with amplitudes `1`, `m/2`, `m/2`. Golden generator: `scipy.special.jv`
(f64). This is the display where the analytic Bessel stems overlay the measured FFT and the
gate reports max deviation.

### 4.5 Biquad transfer function + response (golden table D)

RBJ (W3C): `H(z)=(b_0+b_1 z^{-1}+b_2 z^{-2})/(a_0+a_1 z^{-1}+a_2 z^{-2})`, Direct Form I
`y[n]=(b_0/a_0)x[n]+(b_1/a_0)x[n-1]+(b_2/a_0)x[n-2]-(a_1/a_0)y[n-1]-(a_2/a_0)y[n-2]`.
Intermediates: `ω_0=2π f_0/Fs`, `A=10^{dBgain/40}`, `α=sin ω_0/(2Q)` (or bandwidth /
shelf-slope forms). Response overlay:

$$
H(e^{j\omega}) = \frac{b_0 + b_1 e^{-j\omega} + b_2 e^{-2j\omega}}{a_0 + a_1 e^{-j\omega} + a_2 e^{-2j\omega}},
\qquad
\tau_g(\omega) = -\frac{d\,\arg H(e^{j\omega})}{d\omega}.
$$

Magnitude `|H|`, phase `arg H`, and group delay `τ_g` are the analytic goldens; the
measured swept-sine / impulse-response FFT must match to f32 tolerance. Stability: poles
(roots of the denominator) strictly inside the unit circle (checked and displayed).
**v0.2 stability pins:** the RBJ family is unconditionally stable **in exact arithmetic
on the open interval** `f_0∈(0,Fs/2), Q>0, any dBgain` (Jury criterion: `a_0>0`,
`D(±1)>0`, `|a_2|<a_0` hold for every variant); at the endpoints `sin ω_0=0 ⇒ α=0` puts
poles ON the unit circle, and `Q→∞` drives pole radius →1 — the UI clamps away from both.
**f32 trap (documented, real):** at low `f_0/Fs` poles cluster near `z=1` and coefficient/
state quantization causes limit cycles and gross response error. Rule: coefficients
computed in **f64 on the CPU**, runtime filtering in **transposed Direct Form II**, and
the gate scene avoids `f_0/Fs ≲ 1e-3` with high Q (or ships it as a labeled negative
lesson, § 3.6).

### 4.6 Communications closed forms (golden table E)

Analytic signal `x_a(t)=x(t)+j·\mathcal{H}\{x\}(t)` (Hilbert transform) → I/Q. Ideal
constellations (unit-average-energy normalized, Gray-coded): QPSK `{±1±j}/√2`; M-QAM
square grid `{(2i−1−√M)+j(2k−1−√M)}` scaled by `√(3/(2(M−1)))` (average energy 1). Raised
cosine (Nyquist ISI-free, zero at `±nT`): frequency response flat to `(1−β)/2T`, cosine
roll-off to `(1+β)/2T`; RRC is `√`(RC) so cascaded Tx·Rx = RC (matched filter).
**Implementation pin (v0.2):** the RRC time-domain tap formula has removable
singularities at `t=0` and `t=±T/(4β)` — naive evaluation is 0/0; the generator commits
the exact special-case values `h(0)=(1/T)(1+β(4/π−1))` and
`h(±T/(4β))=(β/(T√2))[(1+2/π)sin(π/4β)+(1−2/π)cos(π/4β)]`. EVM (pinned
normalization = RMS-average constellation magnitude — matches 802.11a "relative
constellation error" and 3GPP LTE/NR; **caveat:** Keysight 89600's *default* is
peak-referenced "Constellation Maximum," which differs by exactly the peak/avg ratio for
multi-ring constellations — ×√(9/5)≈1.34 for 16-QAM — so any cross-check against a VSA
must switch the VSA to RMS normalization first):

$$
\text{EVM}_{\text{rms}} = \sqrt{\frac{\frac1K\sum_{k}|s_k^{\text{meas}}-s_k^{\text{ideal}}|^2}{\frac1K\sum_{k}|s_k^{\text{ideal}}|^2}}.
$$

Goldens: exact ideal symbol coordinates, the RC/RRC closed-form taps (generator vs MATLAB
`rcosdesign`), EVM against a known injected error, and — for the § 5.4 BER waterfall —
the **seeded-AWGN exact error count**: with the noise generator's PRNG seed pinned, the
number of bit errors at each Eb/N0 point is a deterministic integer the f64 reference
computes exactly, while the closed-form `Q`-function curve (`P_b = Q(√(2E_b/N_0))` for
BPSK/QPSK Gray) is the analytic overlay the accumulating measured points converge onto
(§ 2 anchors 12–15).

### 4.7 Metrology (golden table F)

Ideal `SNR = 6.02·N_bits + 1.76` dB; `ENOB = (SINAD − 1.76)/6.02`;
`THD = √(Σ_{h≥2} V_h²)/V_1 = √(Σ_{h≥2} P_h / P_1)` (rms-amplitude ratio; in dB
`10·log₁₀(ΣP_h/P_1)` — **v0.2 fix**: v0.1's `√(ΣP)/P` was dimensionally wrong);
`SINAD = 10log_{10}(P_1/(P_{noise}+P_{dist}))`; `SFDR` =
fundamental-to-worst-spur ratio. Coherent sampling (§ 3.2; `k_0`,`N` coprime, amplitude
near full scale — coprimality alone does not exercise all codes) is mandatory for
machine-exact metrology goldens; incoherent readings need the window-ENBW
noise-power-bandwidth correction (Harris ENBW definition, Heinzel normalization —
anchors 1, 24; § 4.2). Peak/RMS/crest are exact for the analytic generators. Golden
anchors: Analog Devices MT-003 + IEEE 1241 (§ 2 anchors 16–17). For a known-harmonic test
tone (e.g. sum of sinusoids with prescribed amplitudes), THD/SINAD/SFDR have closed-form
values the measurement must reproduce.

## 5. Implementation

### 5.1 Proposed package layout

```text
packages/signal-workbench/
  README.md
  pyproject.toml
  signal_workbench/
    __init__.py
    reference.py          # f64 NumPy/SciPy reference: generators + FFT + measurements
    windows.py            # window coefficients + closed-form DTFT / figures-of-merit
    synthesis.py          # BLIT/PolyBLEP, FM (scipy.special.jv), additive Fourier
    filters.py            # RBJ biquad coeffs + H(e^jω), group delay
    comms.py              # analytic signal, constellations, RC/RRC, EVM
    metrology.py          # THD/SNR/SINAD/SFDR/ENOB (coherent-sampling correct)
    sim.py                # SimRunner / CLI entry
    invariants.py         # PBT predicates
    capture.py            # capture fields + manifest
  tests/
    test_parseval_gate.py          # Rayleigh energy, machine-exact
    test_window_goldens.py         # Harris/Nuttall figures-of-merit + DTFT
    test_leakage_convolution.py    # X == F*W (discrete-spectrum discipline)
    test_fm_bessel_golden.py       # J_n(I) sideband spectrum
    test_biquad_response_golden.py # H(e^jω), group delay
    test_comms_evm_golden.py       # constellation + RC/RRC + EVM
    test_metrology_golden.py       # THD/SINAD/SFDR/ENOB coherent-sampling
    test_aliasing_negative.py      # naive vs bandlimited (negative control)
    test_pbt_invariants.py
    test_determinism.py
    test_capture.py
  web/
    index.html
    package.json
    vite.config.ts
    gen-verification.mjs           # build-time data spine (§ 5.6)
    public/
      worklet-processor.js         # dependency-free plain-JS AudioWorkletProcessor —
                                   #   MUST live in public/ (Vite worklet bundling trap,
                                   #   § 5.2) and load via import.meta.env.BASE_URL
    src/
      main.ts
      chain.ts                     # source→modulate→process→analyze dispatch
      audio.ts                     # AudioWorklet playback bridge (§ 5.2)
      scopes.ts                    # oscilloscope/spectrum/spectrogram/pz/bode/const/eye
      verify-panel.ts              # PROVE layer
      explain.ts                   # EXPLAIN layer
      presets.ts                   # templates (§ 5.4)
      fft.wgsl                     # 1D + batched-STFT coord_of over the SHARED butterfly
                                   #   injected from common/common-web/src/fft-wgsl.ts
                                   #   (//__COMMON_FFT__ marker, poly-trig twiddles — § 5.2)
      synth.wgsl                   # oscillators / FM / additive
      persistence.wgsl             # DPX-style atomic hit-count histogram + decay + tonemap
                                   #   (persistence spectrum / scope phosphor / eye — § 5.5)
      beam.wgsl                    # XY Lissajous erf-beam segments (woscope model — § 5.5)
      render.wgsl                  # scope rendering + colormap spectrogram
      generated/verification.json  # committed; no retyped constants
```

The reference package is Python f64 (NumPy + `scipy.special`/`scipy.signal`) for gates; the
product demo is WebGPU f32 + WebAudio; the web demo consumes generated verification metadata
(house pattern). New golden artifacts land under
`tools/testkit/golden/{generator,derivations,tables/signal-processing}/`.

### 5.2 WebGPU + WebAudio data layout

**Own FFT, not `AnalyserNode` (§ 2 anchor 18, load-bearing).** The analysis FFT is the
**shared `common/common-web/src/fft-wgsl.ts` Stockham radix-2 source** (poly-trig
twiddles + coordinate-agnostic butterfly, already consumed by schrodinger-smoke in 3D and
heat-equation in 2D), with a new **1D `coord_of` mapping and batched-STFT scheduling**
(many windows in one dispatch) in `fft.wgsl`. Rationale, per the
repo's gated-WGSL precision rule: WGSL/Vulkan guarantee builtin `sin`/`cos` only `2⁻¹¹`
**absolute** on `[−π,π]` — schrodinger-smoke measured 63× budget overshoot on lavapipe from
exactly this before switching to poly-trig. So the FFT twiddles are polynomial, and any
window `sin`/`cos` on the gated path uses the same discipline or CPU-f64-precomputed window
buffers.

```text
signal:  array<f32>            # generated samples (per frame)
window:  array<f32>            # selected window taps (CPU-precomputed)
fft_re, fft_im: array<f32>     # FFT work buffers (ping-pong)
stft:    array<f32>            # batched STFT frames → spectrogram texture
diag:    small storage buffer  # GPU reductions (energy, peak, RMS)
params:  uniform buffer (Fs, N, f_c, f_m, I, filter coeffs, window id, flags)
```

**WebAudio playback path (separate from analysis):** an `AudioWorklet` receives the same
analytic generator parameters and synthesizes time-domain samples on the audio thread for
sample-accurate, glitch-free playback. Playback is **not gated** (it is a rendering of the
signal, like a colormap); the gated artifact is the GPU FFT of the reference-defined signal.
The audio path and visual path share the generator definition but need not run lockstep
(the audio-rate/real-time constraint from § 1.1).

**Platform rules for the audio path (v0.2 — pinned for the GitHub-Pages deploy, all
verified against spec text / MDN):**

- **No `SharedArrayBuffer`, by design.** SAB needs `crossOriginIsolated` (COOP+COEP
  headers), which GitHub Pages cannot set; `AudioWorklet` itself needs only a secure
  context, so it runs on Pages as-is. Feed the worklet via **`AudioParam`s** (continuous,
  sample-accurate) and **`port.postMessage` with transferable ArrayBuffers** (config /
  wavetables — control-rate only, never per-quantum).
- **Vite worklet-bundling trap:** `?url` on a `.ts` worklet serves it untranspiled in dev,
  and the dev-injected HMR preamble breaks inside `AudioWorkletGlobalScope`
  (vitejs/vite#9606, #9952); `?worker&url` targets Workers, not worklets. The processor is
  a **dependency-free plain-JS file in `public/`**, loaded via
  `audioWorklet.addModule(import.meta.env.BASE_URL + 'worklet-processor.js')` — which also
  matches the repo's per-sim `public/` standalone-serve convention (§ 5.6).
- **Autoplay:** the `AudioContext` starts `"suspended"`; `ctx.resume()` runs inside the
  play-button gesture handler (the § 5.6 INTERACT play button is load-bearing, not
  decorative).
- **Sample rate:** request `new AudioContext({sampleRate: 48000})` (the UA must resample
  to hardware per Web Audio 1.1), but **read back `ctx.sampleRate` and derive every DSP
  constant from it** — never hardcode 48000. Likewise read the actual block length from
  `process()` arguments rather than assuming the 128-frame render quantum (1.1's
  `renderSizeHint` makes it non-constant).
- **Synthesis uses the committed kernel, never built-in `OscillatorNode` /
  `BiquadFilterNode`** — their internals are vendor-specific and unverifiable; the worklet
  runs the same generator definition as the reference and the WGSL (§ 8).
- **A/V sync:** map the audio clock onto the render clock via
  `ctx.getOutputTimestamp()` (fallback `currentTime − (baseLatency+outputLatency)`), the
  standard technique — used for the spectrogram-to-audio scrub and the XY beam.

### 5.3 Dispatch order (per animation frame)

1. Generate `N` samples from the current chain parameters (`synth.wgsl`), or read the
   reference-pinned canonical signal for the gate scene.
2. Apply window; run the FFT (`fft.wgsl`); for the spectrogram, run the batched STFT.
3. GPU reduction for energy/peak/RMS (Parseval gate input) at a configurable cadence.
4. Persistence accumulation (`persistence.wgsl`): rasterize this frame's spectra/traces
   into the atomic hit-count histograms, apply per-cell exponential decay, tonemap
   (§ 5.5) — display-only, never read by the gate.
5. Render the selected scopes (§ 5.5) with their analytic overlays; XY beam segments
   (`beam.wgsl`) when the XY template is active.
6. Update live verification widgets **without CPU readback in the hot path** (reduced
   scalars only).

### 5.4 Interaction templates (ship templates, not a blank canvas)

| Template | Lens | Verification hook |
|---|---|---|
| **FM sidebands** (default) | synthesis | **Bessel `J_n(I)` golden** overlay on measured FFT (§ 4.4) |
| **Window / leakage explorer** | spectral | **window DTFT `W(ω−ω_0)` golden** = the leakage skirt (§ 4.2, § 3.2) |
| **Additive builder** | synthesis | exact Fourier harmonics + Gibbs overshoot golden (§ 4.3) |
| **Aliasing / Nyquist** | spectral | bandlimited golden vs naive-oscillator negative control (§ 3.6) |
| **Biquad / pole-zero** | filter | closed-form `H(e^{jω})`, phase, group delay (§ 4.5) |
| **Constellation / eye** | comms | ideal symbol coords + RC/RRC + EVM (§ 4.6) |
| **ADC metrology bench** | metrology | THD/SINAD/SFDR/ENOB on a known test tone (§ 4.7) |
| **Chirp / spectrogram** | spectral | STFT of a linear chirp vs analytic instantaneous frequency |
| **XY / Lissajous beam** (v0.2) | render/synthesis | two-channel generator `x=sin(pωt), y=sin(qωt+φ)`; the Lissajous geometry (closure for rational `p:q`, period `lcm`) is analytic; beam drawn with the closed-form woscope erf integral (§ 5.5); the two channels remain gated through the standard chain |
| **BER waterfall** (v0.2, lands with v1.2) | comms | seeded-AWGN measured BER points accumulate live onto the closed-form Q-function curve; pinned seed ⇒ exact deterministic error-count golden (§ 4.6) |

Default = **FM sidebands** (visually striking Bessel structure, audible, the moat in one
screen). The first screen is a usable instrument, not a landing page.

**Live-input mode (operator decision 8, § 13.2):** an optional microphone /
bring-your-own-signal mode — prior art shows mic input is the single most engaging
feature of any browser analyzer (academo, Chrome Music Lab). It is **explicitly ungated**
(no generator ⇒ no closed-form truth) and EXPLAIN-labels itself as such: "this instrument
is verified on generated signals (PROVE tab); live input is unverified input to a
verified instrument." The honesty boundary is the label, not omission.

### 5.5 Visual features (instrument-grade, physics-honest)

**The visual rule:** every overlay is computed from the **same generator definition** as the
audio; no decorative fake spectrum. **Corollary (v0.2):** display-only transforms —
persistence decay, slope tilt, reassignment — are labeled as such and **never feed the
gated arrays** (§ 6.5 negative control); they are renderings of gated data, like a
colormap.

Required v1: oscilloscope with trigger; spectrum
analyzer (dB, log/linear freq, window selectable) with the **analytic overlay** (Bessel
stems / window skirt / harmonic stems) and a live max-deviation readout; spectrogram
(perceptually-uniform colormap from `common/common-web/src/colormap.ts`); phase spectrum +
group delay; pole-zero (draggable) with the unit circle; Bode; constellation + eye;
amplitude histogram; autocorrelation/cepstrum. The **error trace** (measured − analytic) is
a first-class layer, not hidden.

**The persistence engine (v1 core — the signature visual, § 2 anchor 27).** Real
instruments' "digital phosphor" (Tektronix DPX, R&S persistence) is a decaying 2D
histogram: x = frequency (or time) bin, y = amplitude bin, z = hit count; thousands of
FFTs/sec rasterized in, per-cell exponential decay per display frame, log-tonemap through
a colormap. This is natively a WebGPU compute pattern (`persistence.wgsl`: `atomicAdd`
into an `array<atomic<u32>>` grid, decay pass, tonemap pass) and **one kernel powers
three instrument-grade views no web audio tool ships**: the persistence/density spectrum
(rare transients as faint traces under the hot average), analog-style scope phosphor, and
the v1.2 **eye diagram** (slice at the symbol period, accumulate — probability density
made visible). It is also the honest showcase for "only a GPU can draw this": the
spectrum path runs many gated FFTs per frame, not one.

**The XY / Lissajous beam (v1 core — the beauty shot, § 2 anchor 27).** The woscope CRT
model: each consecutive sample pair becomes a quad whose fragment shader evaluates the
**closed-form time integral of a moving Gaussian beam spot** —
`(1/2l)·exp(−p_y²/2σ²)·[erf(p_x/√2σ) − erf((p_x−l)/√2σ)]` in segment-local coordinates —
composited additively into an f16 target with bloom + tonemap. The `1/2l` normalization
is load-bearing (slow beam ⇒ brighter), which is what makes Lissajous figures and
oscilloscope-music signals look like a real CRT. A closed-form render model for
closed-form signals — on-brand for this repo — and the natural **landing-tile
poster/loop** (bundle a Lissajous-cascade demo signal).

**Filter-view grammar (v1.1 — steal FabFilter Pro-Q, beat it on truth, § 2 anchor 27).**
The filter display is the whole panel: live spectrum + the **exact** closed-form
`|H(e^{jω})|` curve in one coordinate system; **draggable band nodes** on the curve
(drag = f₀/gain, scroll = Q) with the pole-zero view updating in lockstep;
**spectrum-grab** (hover the live spectrum → peak outlined + labeled → drag it to create
a band there); **piano-keyboard frequency axis** toggle (frequency↔pitch at a glance —
the audio-lens touch); analyzer **slope tilt** control (0 / 3 / 4.5 dB/oct, the Voxengo
SPAN convention that makes audio spectra read flat) — display-only, labeled, never on
the gated path. FabFilter's overlay curve is a design target; ours is a gated exact
transform — say so in EXPLAIN.

**Instrument UX everywhere (v1 core).** Markers: peak search / next-peak / delta markers
with a Δf/ΔdB readout table (computed on the GPU-reduced spectrum); max-hold / min-hold /
peak-hold traces (per-bin running extrema — trivial second buffer); scope trigger UX:
draggable trigger-level line, edge/slope selector, single/normal/auto. The marker/trigger
grammar is what separates "measurement instrument" from "music visualizer."

**Spectrogram quality bar (§ 2 anchor 27).** v1: ring-buffer texture waterfall (advance a
row pointer, no memcpy), high overlap, bilinear-max rasterization (iZotope RX documents
that plain interpolation visibly loses detail), optional 3D height-field view. Later
increment (operator decision 10): **multi-resolution STFT + time-frequency reassignment**
(Fitz-Fulop) as a labeled display-only "razor" view — reassignment relocates each bin's
energy to its instantaneous-frequency/group-delay centroid, which is why RX looks sharp;
it has no simple closed-form gate, so it renders gated STFT data but is itself EXPLAIN-
labeled display-only.

Optional polish (all read the same data): waterfall
scroll, marker readouts, spectrogram-to-audio scrub (A/V-sync clock, § 5.2).

### 5.6 Web frontend — house four-layer structure + build-time data spine

Adopt the landed rd2d / schrodinger / heat-equation pattern (four additive layers; nothing
here mutates the compute kernel, capture pinning, gate, or `tolerance*.toml`), built on
the shared chrome: `common/common-web/src/panel-shell.ts` (`createPanelShell` —
Play/Study modes, `PresetSpec` for the § 5.4 templates, `VerdictSpec` for the gate
readout) and `common/common-web/src/capture-export.ts` (`exposeCapture`,
`runCaptureExclusive` — the § 8 replay-exclusivity helper). Do not hand-roll these:

- **INTERACT** — chain controls (source/mod/filter/window/FFT-size/analysis params), play
  button, template mini-map, record/replay of the interaction stream (§ 8).
- **EXPLAIN** — the generating equation and its closed-form transform rendered next to the
  committed WGSL/reference lines (per-term links extracted at build time by
  `gen-verification.mjs`; HARD-FAIL on an unmatched anchor), plus the discrete-spectrum
  discipline note (§ 3.2) and the `AnalyserNode`-is-the-wrong-tool side-by-side (§ 3.6).
- **PROVE** — live "run it twice → identical SHA-256" (§ 8); **live gate re-run** computing
  max_abs/max_rel of the measured f32 spectrum vs the closed-form analytic transform **on
  the visitor's GPU**, displayed verbatim next to the declared budget; the Parseval energy
  residual; coherent-sampling status.
- **RENDER** — § 5.5, hiDPI, poster/loop generators.

Data spine: build-time `gen-verification.mjs` (Node builtins only) reads the real committed
values (tolerance rows, gate thresholds, canonical manifest, WGSL anchors) → committed
`generated/verification.json`; **no retyped constants in the UI**;
`node gen-verification.mjs && git diff --exit-code` must be idempotent at HEAD.
Standalone-serve constraint: per-sim `public/` assets referenced as `./x` (no `../../`
cross-refs — the known standalone-serve 404 trap).

## 6. Verification posture (Roy 2005 V&V)

- **Code verification:** YES. Every display gated against a closed-form transform — window
  DTFT/figures-of-merit, leakage-as-convolution, FM Bessel spectrum, additive harmonics,
  biquad `H(e^{jω})`, constellation/RC/RRC/EVM, THD/SINAD/SFDR/ENOB — plus the machine-exact
  Parseval energy gate and negative controls (naive aliasing, incoherent-sampling).
- **Solution verification:** PARTIAL. FFT accuracy is analytic (near machine precision for
  tones, § 2 anchor 20); STFT reconstruction verified via COLA. Not a mesh-convergence sim.
- **Model validation:** N/A. The workbench *is* the mathematics — there is no external
  physical experiment; the comms lens is baseband/audio-rate pedagogy, not a validated RF
  model (§ 1.1).
- **Calculation verification:** YES for metrology — closed-form THD/SINAD/SFDR/ENOB on a
  prescribed test tone (§ 4.7) is a hand-checkable calculation.

### 6.1 Code-verification honesty note (the discrete-spectrum caveat)

The goldens are exact for the **windowed, sampled, finite** signal (§ 3.2), **not** the
idealized continuous transform. Every gate declares its regime (coherent vs incoherent) and
its window; a golden that silently compares against the continuous line spectrum would bake
the window's leakage bias into a "machine-exact" claim (the § 6.5 negative control locks
this).

### 6.2 Measured-vs-analytic gate table (the moat's integrity)

| Quantity | Status | Gate? |
|---|---|---|
| Parseval energy `Σ|x|²=(1/N)Σ|X|²` (own FFT) | **machine-exact** | ✅ gate (f64 `≤1e-13`) |
| Windowed-DFT of a coherent tone = single exact line | **machine-exact** | ✅ gate |
| FM spectrum vs `J_n(I)` stems (coherent) | **machine-exact** (f64) | ✅ gate |
| Additive harmonics vs exact Fourier amplitudes | **machine-exact** (f64) | ✅ gate |
| Leakage skirt vs window DTFT `W(ω−ω_0)` (incoherent) | analytic (exact) | ✅ golden (§ 4.2) |
| Window figures-of-merit vs Nuttall Table II / Heinzel (Harris definitions only) | analytic | ✅ golden (§ 7 A) |
| Biquad `|H|`, phase, group delay vs `H(e^{jω})` | analytic → f32 tolerance | ✅ golden (§ 4.5) |
| Constellation coords + EVM vs ideal | analytic | ✅ golden (§ 4.6) |
| THD/SINAD/SFDR/ENOB on prescribed tone (coherent) | analytic | ✅ calc-verif (§ 4.7) |
| Measured f32 spectrum ↔ f64 analytic (canonical scene) | measured | ✅ new_canonical (§ 9) |
| Naive-oscillator aliasing | **spurious by construction** | ❌ negative control (§ 3.6) |
| Incoherent-sampling THD error | wrong by construction | ❌ negative control (§ 3.6) |
| `AnalyserNode` smoothed power spectrum | not gateable (no phase, smoothed) | ❌ EXPLAIN-only (§ 2 anchor 18) |

### 6.3 PBT invariants (≥2 required)

- `parseval_energy_exact` — own FFT satisfies `Σ|x|²=(1/N)Σ|X|²` to f64 machine precision
  for arbitrary input (Hypothesis-generated signals).
- `coherent_tone_single_bin` — a coherently-sampled rectangular-windowed sinusoid has all
  DFT energy in one bin (leakage nulls on the others) to machine precision.
- `fm_energy_identity` — `J_0²(I)+2Σ_{n≥1}J_n²(I)=1` for the generated FM spectrum (§ 4.4).
- `biquad_stable_poles_in_unit_circle` — RBJ coefficients yield poles with `|z|<1` for all
  valid `(f_0,Q)` (§ 4.5).
- `window_dc_gain_is_coherent_gain` — `Σ w[n]/M` equals the tabulated coherent gain (§ 4.2).
- `linearity_and_parseval_under_gain` — scaling the signal scales the spectrum (linearity)
  and energy by the square (Parseval consistency).

### 6.4 Calculation-verification hand-check (metrology bench)

For a prescribed test tone (fundamental + a few harmonics of known amplitude, coherently
sampled), THD/SINAD/SFDR/ENOB have spreadsheet-computable closed-form values (§ 4.7); the
measured pipeline must reproduce them within an engineering tolerance. Hand-check, not
instrument-calibration validation (§ 2 anchors 16–17).

### 6.5 Negative controls

- Generate a naive (non-bandlimited) saw → the measured spectrum must grow aliased lines the
  bandlimited golden lacks (locks § 3.5–§ 3.6).
- Compare a windowed measured DFT against the **continuous** line spectrum instead of `F*W`
  → the window's leakage bias appears as error, proving the golden distinguishes the two
  (the discrete-spectrum control, § 3.2).
- Measure THD with an off-bin tone and no window → the reading must be wrong; coherent
  sampling / a proper window must fix it (§ 4.7).
- Swap the FFT's poly-trig twiddles for WGSL builtin `sin`/`cos` → at least one CI adapter
  (the lavapipe precedent) must degrade toward the `2⁻¹¹` floor, locking the § 5.2 rule.
- Flip the Hilbert-transform sign → the analytic signal's negative-frequency content
  reappears; constellation/EVM gates fail.
- Toggle every display-only transform (slope tilt, persistence decay, peak-hold) → all
  gated scalars and the capture SHA must be bit-identical before/after, locking the § 5.5
  "renderings never feed the gated arrays" corollary.

## 7. Golden values / Manufactured solutions

House convention: generator `.py` (`--verify`) + derivation `.md` + table `.json` (≥3
independent-reference anchors) under
`tools/testkit/golden/{generator,derivations,tables/signal-processing}/`.

- **A · `signal-workbench-windows.json`** — per-window figures-of-merit (coherent gain,
  ENBW, 3-dB/6-dB BW, scalloping loss, WCPL, highest side-lobe, fall-off) + sampled DTFT
  (exact shifted-Dirichlet closed form, § 4.2). Anchors: Nuttall 1981 Table II; Heinzel
  GH_FFT (anchor 24); JOS SASP — with Harris 1978 for **definitions only** (documented
  errata, § 2 anchor 1; the −31.47/−70.83 corrected side-lobe values are the goldens).
  **Analytic.**
- **B · `signal-workbench-oscillators.json`** — exact Fourier harmonic amplitudes
  (saw/square/triangle), BLIT `Sinc_M`, Gibbs overshoot ≈8.95%. Anchors: Fourier series;
  Stilson-Smith BLIT; Välimäki-Huovilainen.
- **C · `signal-workbench-fm-bessel.json`** — `J_n(I)` sideband amplitudes at `f_c±n f_m`
  over `(I, n)`, carrier nulls, energy identity, Carson `≈`. Anchors: Chowning 1973;
  `scipy.special.jv`; DLMF 10.23.3 + Bessel-zero tables (anchor 25).
- **D · `signal-workbench-biquad.json`** — RBJ coefficients + sampled `H(e^{jω})`, phase,
  group delay for LPF/HPF/BPF/notch/peaking/shelf/APF over `(f_0,Q,gain)`. Anchors: W3C
  Audio EQ Cookbook; `scipy.signal.freqz`; Oppenheim-Schafer.
- **E · `signal-workbench-comms.json`** — ideal constellation coordinates (QPSK, 16-/64-QAM,
  M-PSK, Gray-coded), RC/RRC taps (incl. the § 4.6 removable-singularity special-case
  values), EVM against a known injected error (RMS normalization pinned, § 4.6), and the
  seeded-AWGN BER golden (exact error counts per Eb/N0 + closed-form Q-curve values).
  Anchors: Proakis; MATLAB `rcosdesign`/`qammod`; Keysight/NIST EVM.
- **F · `signal-workbench-metrology.json`** — closed-form THD/SINAD/SFDR/ENOB for prescribed
  test tones (coherently sampled), with the SINAD↔ENOB relation. Anchors: Analog Devices
  MT-003; IEEE 1241; AES17.

## 8. Determinism

**Reference Python:** `bit-exact-same-platform` for f64 NumPy/SciPy captures. The analytic
generators + FFT are pure array math (no atomics, no scatter); NumPy FFT (pocketfft) can
differ at the ULP level across builds/hardware → the honest cross-build boundary is
**numeric equivalence**, not byte identity (the repo's codified cross-build caveat).

**WebGPU:** `epsilon-same-adapter-same-browser` for f32 canonical runs; a **fixed Stockham
ping-pong pass order** makes the analysis FFT device-scoped bit-exact, so **run-twice
byte-identity holds** (the schrodinger/heat precedent) — the witness run #2 *is* the capture
run. `epsilon-cross-adapter` (distributional) for browser/device variation.

**WebAudio playback is explicitly NOT part of the determinism contract** — it is a rendering
of the signal on the audio thread (like a colormap), not a gated artifact. If an audio
capture is ever wanted (poster/loop soundtrack, § 13), render it with
`OfflineAudioContext` from the committed worklet kernel — offline rendering is
reproducible run-to-run on the same browser build (the audio-fingerprinting property)
but differs across hardware/browsers at the ~1e-15 level, so the honest contract is
run-twice-same-stack byte-identity + cross-stack tolerance, exactly the repo's GPU-capture
policy; never capture through built-in `OscillatorNode`/`BiquadFilterNode` (vendor-specific
internals, § 5.2). Interaction
record/replay quantizes events to frame boundaries and takes the GPU exclusively during
replay (the sph-water RAF/replay exclusivity lesson).

Determinism descriptors:

```text
signal-workbench-fm-N4096-fc440-fm110-I3p2-seed42
signal-workbench-window-N4096-hann-tone-offbin-seed42
signal-workbench-biquad-N8192-lpf-f0-1200-Q4-seed42
```

## 9. Equivalence

Equivalence pairs:

- NumPy/SciPy f64 reference ↔ TypeScript CPU f64 micro-reference (small `N`).
- f64 reference ↔ WebGPU f32 canonical for the FM / window / biquad scenes.
- Measured f32 spectrum ↔ closed-form f64 analytic transform (the moat gate).

Metrics: L2 relative and L∞ absolute on the spectrum; per-line amplitude error (FM,
harmonics); response-curve error (biquad); EVM agreement; Parseval residual.

**Tolerance category — operator decision, flagged (§ 13).** The analysis path is
FFT-accumulation-specific (kin to schrodinger's `[defaults.isf]`, which was made its own
category for exactly this reason). **Recommendation:** a new `[defaults.signal-workbench]`
measured-then-declared from the WGSL-f32 spectrum vs f64 analytic on the canonical FM scene,
capped by `[budgets.signal-workbench]` — do not reuse a foreign budget by convenience.
Proposed starting row (**MEASURE before landing; do not widen to pass**):

```toml
[signal-workbench.numpy_f64__webgpu_f32]
spectrum_l2_relative = 1e-4
spectrum_linf_absolute = 1e-4
line_amplitude_relative = 1e-4
parseval_residual = 1e-6
```

The Parseval residual and coherent-tone single-bin checks are held at f64 machine precision
(`≤1e-13`) independently of the f32 proxy tolerance.

## 10. Diagnostics

**Tier 1:** NaN/Inf scan; peak/RMS/crest; Parseval residual; coherent-sampling status;
clipping detector.

**Tier 2 (signal):** measured-vs-analytic spectrum error trace; per-line FM/harmonic error;
window-figure-of-merit check; biquad response error; EVM; THD/SINAD/SFDR/ENOB read-outs with
their coherent-sampling / window-ENBW provenance.

**Tier 3 (product):** GPU timing per pass — via `timestamp-query` **feature-detected,
never required** (Chrome ships it quantized to 100 µs, so single FFT passes read 0 or
100 µs: accumulate over many passes and label the quantization; Firefox/Safari support
unconfirmed → hide the readout when absent); FFT size / hop / overlap; audio buffer
under-run counter; dropped-frame counter; dispatch dims + workgroup size.

The PROVE layer makes at least three diagnostics visible: **the analytic overlay + live
max-deviation, the Parseval residual, and the coherent-sampling status.**

## 11. Build, run, and optimization

Reference tests:

```bash
uv run --no-sync pytest packages/signal-workbench/tests/
```

Web:

```bash
cd packages/signal-workbench/web && npm install && npm run dev && npm run build
```

Suggested CLI:

```bash
uv run python -m signal_workbench --mode fm      --fc 440 --fm 110 --index 3.2 --n 4096 --out captures/signal-workbench
uv run python -m signal_workbench --mode biquad  --filter lpf --f0 1200 --q 4 --n 8192 --out captures/signal-workbench
uv run python -m signal_workbench --mode metrology --tone-bits 12 --n 65536 --out captures/signal-workbench
```

**Optimization / gotchas (grounded in the research):**

- **Own FFT, not `AnalyserNode`** — the single most important implementation decision
  (§ 5.2); `AnalyserNode` cannot supply raw magnitude/phase and is time-smoothed.
- **Reuse, don't rewrite, the FFT** — the shared `common/common-web/src/fft-wgsl.ts`
  Stockham + poly-trig source is the dependency-free base (new 1D `coord_of` only);
  no public WGSL FFT is metrology-grade (§ 2 anchor 21).
- **Poly-trig twiddles on the gated path** — WGSL builtin `sin`/`cos` are `2⁻¹¹`-absolute
  only; the lavapipe 63× precedent applies (§ 5.2).
- **Coherent sampling for metrology** — choose FFT size / tone frequency so integer periods
  fit the window, or window + ENBW-correct; otherwise leakage corrupts THD/SINAD (§ 4.7).
- **Batched STFT** — the spectrogram is many windows transformed at once; batch them in one
  dispatch (the schrodinger 2D-batched pattern) rather than looping.
- **Separate audio and analysis** — `AudioWorklet` playback on the audio thread; GPU FFT on
  the render thread; both from the same generator params, not lockstep (§ 1.1, § 5.2).
- **No CPU readback in the hot path** — GPU-reduce energy/peak/RMS; read only scalars, low
  cadence.
- **Worklet in `public/`, plain JS, no SAB** — the Vite worklet-bundling trap and the
  GitHub-Pages no-COOP/COEP constraint (§ 5.2); `AudioParam`s + transferable
  `postMessage` only; `ctx.resume()` inside the play gesture.
- **Derive everything from `ctx.sampleRate` and the actual `process()` block length** —
  never hardcode 48000 or 128 (§ 5.2).
- **Biquad coefficients in f64 on the CPU, transposed DF2 runtime** — the low-`f_0`
  f32 quantization trap (§ 4.5).
- **`timestamp-query` is optional and 100 µs-quantized** — feature-detect, accumulate,
  label (§ 10).
- **Persistence/tilt/hold are renderings** — they must never touch gated arrays; the
  § 6.5 toggle control locks this.

## 12. References

See § 2 for the full anchor list with DOIs/URLs (Harris 1978; Nuttall 1981; Smith SASP +
Mathematics of the DFT + Introduction to Digital Filters; Chowning 1973; Stilson-Smith BLIT
1996; Välimäki-Huovilainen 2007; Bristow-Johnson Audio EQ Cookbook / W3C; Oppenheim-Schafer;
Proakis; RC/RRC + Nyquist ISI; Keysight/R&S/NIST EVM; QAM/Gray coding; Analog Devices MT-003;
IEEE 1241/1057 + AES17; W3C Web Audio 1.1 + MDN AnalyserNode/AudioWorklet; GNU Radio qtgui;
FFTW accuracy + Burrus; Lloyd et al. TR-2008-62; v0.2 anchors 24–27: Heinzel GH_FFT, DLMF
§ 10.23, Schatzman 1996, render-technique anchors — woscope, Tektronix DPX, Fitz-Fulop
reassignment, FabFilter Pro-Q UX; prior art § 2.1: RF SEM/limit-line testing,
simulations4all, Falstad, earlevel, fiiir, Abex, labAlive, QuantAsylum/APx limit lines,
web-platform-tests, WaveForms Live) and the refuted list.

## 13. Productization status

```yaml
productization:
  web: true
  binary: false
  pypi: true
  render: true
  preprint: true
```

Rationale:

- `web: true` — primarily a browser-verification **and audible** instrument.
- `binary: false` for v1; no Stack-C target planned.
- `pypi: true` — the NumPy/SciPy reference (generators, FFT, closed-form transforms,
  measurements), captures, and validation utilities are independently useful.
- `render: true` — FM Bessel-sideband stills, spectrogram loops, pole-zero/Bode animations,
  constellation/eye captures.
- `preprint: true` — a compact demonstration of the Bit-Physics moat applied to DSP:
  analytic closed-form transforms, WebGPU compute, live falsifiability against ground truth.

### 13.1 Web gate wiring (planned)

- `GATE_KIND["signal-workbench"] = "new_canonical"` in
  `tools/productization/web-deploy/pipeline.py` (moat = closed-form analytic-transform
  goldens recomputed live + machine-exact Parseval + run-twice byte-identity; closest
  precedents `schrodinger-smoke` / `heat-equation` = "new_canonical").
- `_gate_signal_workbench` in `tools/productization/web-deploy/verify.py`: live measured f32
  spectrum vs closed-form f64 analytic on the canonical FM scene + Parseval residual +
  run-twice byte-identity + window/biquad/metrology goldens recomputed live.
- `[defaults.signal-workbench]` in `tools/testkit/equivalence/tolerance.toml`,
  MEASURED-then-declared, capped by `[budgets.signal-workbench]` in
  `tools/testkit/equivalence/tolerance-budget.toml` (§ 9 operator decision).

### 13.2 Operator decisions (flagged for execution)

1. **Category** — new `signal-processing` (instrumentation) category vs placing under
   `closed-form` (zero new category; justified since every ground truth is a closed-form
   transform). Recommend the new category; this spec is filed at
   `docs/sim-specs/signal-processing/signal-workbench/` pending that call.
2. **Tolerance category** — new `[defaults.signal-workbench]` vs reuse of `isf`; recommend
   new + measured (§ 9).
3. **Default template** — FM sidebands (§ 5.4).
4. **Audio output** — ship WebAudio playback in v1 (the "first audible sim" hook) vs defer;
   recommend v1, playback ungated (§ 5.2, § 8).
5. **FFT placement** — **(v0.2 reframed: the promotion has already happened)** — the
   shared Stockham butterfly + poly-trig source lives in `common/common-web/src/fft-wgsl.ts`
   with schrodinger (3D) and heat (2D) as consumers; the remaining decision is only where
   the new **1D/batched-STFT `coord_of` wrapper** lives. Recommend sim-local `fft.wgsl`
   first, hoisting into `common/common-web/src/fft-wgsl.ts` when a second 1D consumer
   appears.
6. **Landing order** — the four-increment plan (§ 1.2); recommend landing v1 core first as an
   independently gate-green sim, extending in place.
7. **Negative-lesson modes** — ship naive-aliasing + incoherent-metrology + AnalyserNode
   side-by-side as labeled teaching toggles (recommend include; operator may strike if the
   deliberate wrong-answer displays are judged off-tone — the heat DuFort-Frankel precedent).
8. **Live-input (microphone) mode** — explicitly-ungated bring-your-own-signal mode with
   the § 5.4 honesty label. Recommend include in a v1.x increment (it is the most engaging
   feature in every surveyed browser analyzer; the label keeps the moat honest); operator
   may defer.
9. **Persistence engine + XY beam in v1 core** — recommend yes (§ 5.5): the persistence
   kernel powers three views + the eye diagram later, the XY beam is the landing-tile
   loop, and both are display-only (no gate surface added). Operator may push either to
   v1.x if v1-core scope is judged too fat.
10. **Reassigned / multi-resolution spectrogram** — recommend a later increment, labeled
    display-only (§ 5.5); not v1.

## 14. Moat and product thesis

The highest-value version of this sim is not "a spectrum analyzer in a browser" — those
exist and are named in § 2.1 (GNU Radio scopes, MATLAB, Web Audio analyzers, simulations4all).
The surveyed field splits four ways (v0.2, adversarially re-surveyed): **theory-only
calculators** that plot the analytic curve with no measurement leg (earlevel, fiiir, Abex
FM); **scopes that display** the FFT with no ground truth;
**instruments that gate against a hand-authored mask** (SEM / limit lines / QA403 / APx — a
compliance envelope, not the signal's own transform); and **teaching tools verified once,
off-line** (simulations4all, web-platform-tests), showing no live error. The moat claim,
stated conjunctively (every clause load-bearing, § 2.1): **no deployed interactive web
tool overlays the exact closed-form transform of its own generator on the measured
display and live-gates the deviation against a declared tolerance.** Four adjacent
firsts ride along: in-browser THD/SINAD/SFDR/ENOB, live in-browser EVM, live
BER-points-onto-Q-curve, interactive Bessel-overlay-on-measured-FM. The Bit-Physics
moat is:

1. **The generator's own closed-form transform is the reference.** Because the workbench
   synthesizes the signal from analytic primitives, it knows the exact transform — FM
   sidebands are exactly `J_n(I)`, leakage is exactly the window's DTFT, a biquad's response
   is exactly `H(e^{jω})` from its poles/zeros. It overlays that on the measured display and
   reports the deviation.
2. **The deviation is gated, live, on the visitor's GPU** — machine-exact where it can be
   (Parseval energy, coherent-tone single-bin, FM/harmonic amplitudes to f64), f32-tolerance
   where the proxy demands, run-twice byte-identical. Not a mask, not a dev-time check.
3. **The discrete-spectrum discipline keeps the moat honest** — the golden is the transform
   of the *windowed, sampled, finite* signal (`F*W`), not the idealized continuum; the
   two-regime (coherent/incoherent) framing makes leakage a *predicted* feature, not a bug
   (§ 3.2). This is the workbench's version of heat-equation's two-spectra integrity guard.
4. **The discretization is shown, not hidden** — naive-oscillator aliasing, incoherent-sampling
   metrology error, and the `AnalyserNode`-is-the-wrong-tool comparison are explicit
   negative-lesson modes, never silent defaults.
5. **It is the repo's first audible sim** — WebAudio playback of the exact signal being
   dissected, from the same generator definition (§ 5.2).

Ship the visual surface as an **instrument**: a user builds a signal, hears it, watches it
across the scope rack — persistence phosphor, XY beam, Pro-Q-grammar filter curve
(§ 5.5) — and can see, down to a per-line machine-exact check, that every
display equals the mathematics that produced it. The renderings are allowed to be
gorgeous precisely because they are declared renderings; the numbers underneath are
gated.
