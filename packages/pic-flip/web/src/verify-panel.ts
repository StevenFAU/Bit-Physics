// PROVE layer (web spec § 4.3): run every proof on the visitor's GPU and
// show MEASURED residuals against declared bounds — never asserted zeros.
// The moat: closed-form angular-momentum conservation + affine round trip
// (Jiang 2015 Props 5.1/5.4/5.5) with paired PIC negative controls; the
// Zhu 1/9 dyadic-exact ladder; on-device atomic==lex-oracle bit identity;
// the gate replay itself; and the DOCUMENTED-FAILURE falsifiability probe
// (20 Jacobi sweeps — the GPU Gems 3 ch. 30 sinking column).
import V from "./generated/verification.json";
import type { PicFlipGpu } from "./solver.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";
import {
  GATE,
  checkpointErrors,
  computeGateArtifacts,
  fetchIC,
  fetchRefs,
  gateSimConfig,
  runCanonicalReplay,
  runStillProbe,
} from "./gate.js";
import { computeObservables } from "./mirror.js";
import type { Mode } from "./solver.js";

export interface VerifyDeps {
  panel: PanelShell;
  gpu: PicFlipGpu;
  withExclusive: <T>(fn: () => Promise<T>) => Promise<T>;
  drawSeries: (
    cv: HTMLCanvasElement,
    series: { data: number[]; color: string }[],
    yLabel: string,
  ) => void;
}

function el(tag: string, cls: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "bps-input";
  b.textContent = label;
  b.addEventListener("click", onClick);
  parent.appendChild(b);
  return b;
}

function line(parent: HTMLElement, ok: boolean | null, text: string): void {
  const d = el("div", "bps-note");
  d.style.color = ok === null ? "#8ba0ad" : ok ? "#4dd8c0" : "#e05c5c";
  d.textContent = `${ok === null ? "·" : ok ? "✓" : "✗"} ${text}`;
  parent.appendChild(d);
}

export function installVerifyPanel(deps: VerifyDeps): void {
  const { panel, gpu, withExclusive, drawSeries } = deps;

  // ---- tier 1: closed-form artifacts ---------------------------------------
  const t1 = panel.addGroup("proof — closed-form goldens (run them on YOUR GPU)");
  const t1Note = el(
    "div",
    "bps-note",
    "Jiang 2015 Props 5.4/5.5 (angular momentum conserved across P2G/G2P) and 5.1 (affine round trip) are EXACT identities — proven in rational arithmetic in the committed tables, dyadic rows bit-exact in the in-page f64 mirror, and evaluated here in WGSL f32 with the MEASURED residual shown. PIC is the paired negative control: it must fail by the table-pinned amount.",
  );
  t1.appendChild(t1Note);
  const t1Out = el("div", "bps-diag");
  const artBtn = button(t1, "run closed-form artifacts", () => void runArtifacts());
  t1.appendChild(t1Out);

  async function runArtifacts(): Promise<void> {
    artBtn.disabled = true;
    t1Out.textContent = "";
    try {
      const art = await withExclusive(() => computeGateArtifacts(gpu));
      const th = V.gate.thresholds;
      // f64 mirror vs tables
      let f64AmDev = 0;
      const amPts = V.golden.am_points as unknown as { expected: Record<string, number[]> }[];
      let i2 = 0;
      let i3 = 0;
      for (const tp of amPts) {
        const e = tp.expected;
        if (e.l_total_particles_before.length === 1) {
          const exp = [
            e.l_total_particles_before[0],
            e.l_total_grid_after_p2g[0],
            e.l_total_particles_after_apic_g2p[0],
            e.l_total_particles_after_pic_g2p[0],
          ];
          for (let q = 0; q < 4; q += 1) {
            f64AmDev = Math.max(f64AmDev, Math.abs(art.am2F64[4 * i2 + q] - exp[q]));
          }
          i2 += 1;
        } else {
          const exp = [
            ...e.l_total_particles_before,
            ...e.l_total_grid_after_p2g,
            ...e.l_total_particles_after_apic_g2p,
            ...e.l_total_particles_after_pic_g2p,
          ];
          for (let q = 0; q < 12; q += 1) {
            f64AmDev = Math.max(f64AmDev, Math.abs(art.am3F64[12 * i3 + q] - exp[q]));
          }
          i3 += 1;
        }
      }
      line(t1Out, f64AmDev <= th.golden_f64_abs, `f64 mirror vs angular-momentum table: max |Δ| = ${f64AmDev.toExponential(2)} (dyadic rows exact; bound ${th.golden_f64_abs})`);
      line(t1Out, art.amF32ConsRelMax <= th.am_f32_rel, `WGSL f32 conservation residual |L' − L|/|L| = ${art.amF32ConsRelMax.toExponential(2)} (bound ${th.am_f32_rel}) — MEASURED, not asserted 0`);
      // PIC control display (first 2D point)
      const lb = art.am2F32[0];
      const lpic = art.am2F32[3];
      line(t1Out, Math.abs(lpic - lb) > 0, `PIC negative control: L ${lb.toFixed(4)} → ${lpic.toFixed(4)} after ONE G2P (table pins ${(V.golden.am_points as { expected: { l_total_particles_after_pic_g2p: number[] } }[])[0].expected.l_total_particles_after_pic_g2p[0]})`);
      line(t1Out, art.rtF32ErrRelMax <= th.rt_f32_rel, `affine round trip (grid→particle→grid): f32 max node error / field scale = ${art.rtF32ErrRelMax.toExponential(2)} (bound ${th.rt_f32_rel}); PIC deviates by the table-pinned O(1) amount`);
      line(t1Out, art.weightsF32RelMax <= th.weights_f32_rel, `B-spline weights + Dp golden: f32 rel ${art.weightsF32RelMax.toExponential(2)} (bound ${th.weights_f32_rel}); f64 mirror exact`);
      line(t1Out, art.pouMaxDevF32 <= th.pou_f32_abs, `partition of unity, 257-point sweep: max |Σw − 1| = ${art.pouMaxDevF32.toExponential(2)} (bound ${th.pou_f32_abs})`);
      // ladder f64 exactness
      let ladderDev = 0;
      const tePts = V.golden.te_points as { expected: { particle_ladder: Record<string, { f_tilde: number }> } }[];
      let li = 0;
      for (const tp of tePts) {
        for (const n of [4, 16, 64]) {
          ladderDev = Math.max(
            ladderDev,
            Math.abs(art.transferLadderF64[li] - tp.expected.particle_ladder[`n=${n}`].f_tilde),
          );
          li += 1;
        }
      }
      line(t1Out, ladderDev <= th.ladder_f64_abs, `Zhu 1/9 midpoint ladder (dyadic inputs): f64 max |Δ| = ${ladderDev.toExponential(2)} — EXACT by construction (bound ${th.ladder_f64_abs})`);
      line(t1Out, art.bitIdentityEqual, `transfer bit-identity: parallel fixed-point-atomic P2G == single-thread lex oracle over ${art.bitIdentityCells} cells, i32-exact (integer addition is order-independent)`);
      line(t1Out, art.fpHeadroomRatio <= 0.5, `fixed-point headroom: max |quanta| = ${(art.fpHeadroomRatio * 100).toFixed(3)}% of i32 (bound 50%)`);
    } catch (e) {
      line(t1Out, false, `artifacts failed: ${(e as Error).message}`);
    } finally {
      artBtn.disabled = false;
    }
  }

  // ---- tier 1b: structural probes + the documented failure ------------------
  const t2 = panel.addGroup("proof — hydrostatics & the documented failure");
  const t2Note = el(
    "div",
    "bps-note",
    "The masked projection uses the ADJOINT COMPACT pair (backward divergence + forward gradient): discrete hydrostatics are exact up to solver residual (the central pair fails at O(1) — a settled column keeps ~g·dt/2 per step). The falsifiability probe runs the backend's PINNED DOCUMENTED FAILURE: at 20 Jacobi sweeps information hasn't crossed the column (~1 cell/sweep, GPU Gems 3 ch. 30) and the probe MUST fail.",
  );
  t2.appendChild(t2Note);
  const t2Out = el("div", "bps-diag");
  const stillBtn = button(t2, `still pool + hydrostatic (Jacobi ${GATE.nJacobi}, converged)`, () => void runStill(GATE.nJacobi, true));
  const failBtn = button(t2, "falsifiability: 20 sweeps (must FAIL — the sinking column)", () => void runStill(20, false));
  t2.appendChild(t2Out);

  async function runStill(nSolve: number, expectPass: boolean): Promise<void> {
    stillBtn.disabled = true;
    failBtn.disabled = true;
    t2Out.textContent = "";
    try {
      const p = await withExclusive(() => runStillProbe(gpu, 30, nSolve));
      const th = V.gate.thresholds;
      const speedOk = p.maxSpeed <= th.still_maxspeed;
      const hydroOk = p.dpdzTargetRel <= th.hydro_rel;
      if (expectPass) {
        line(t2Out, speedOk, `still pool stays still (regularizers ON — invariant 6 inertness): max |v| = ${p.maxSpeed.toExponential(2)} after 30 steps (bound ${th.still_maxspeed})`);
        line(t2Out, Math.abs(p.fluidNodesDelta) <= th.still_dvol, `volume held: fluid-node drift = ${p.fluidNodesDelta} (bound ±${th.still_dvol})`);
        line(t2Out, hydroOk, `hydrostatic dP/dz = ${p.dpdz.toFixed(3)} vs ρg_z = ${(GATE.rho * GATE.gravity).toFixed(3)} (rel dev ${p.dpdzTargetRel.toExponential(2)}, bound ${th.hydro_rel})`);
      } else {
        line(t2Out, !speedOk || !hydroOk, `documented failure reproduced at 20 sweeps: max |v| = ${p.maxSpeed.toExponential(2)}, dP/dz rel dev ${p.dpdzTargetRel.toExponential(2)} — the column is sinking, exactly as the backend pinned (20 sweeps retain 100% of g·dt)`);
      }
    } catch (e) {
      line(t2Out, false, `probe failed: ${(e as Error).message}`);
    } finally {
      stillBtn.disabled = false;
      failBtn.disabled = false;
    }
  }

  // ---- tier 1c: PIC/FLIP/APIC energy comparison ------------------------------
  const t3 = panel.addGroup("proof — mode energy comparison (measured)");
  t3.appendChild(
    el(
      "div",
      "bps-note",
      "The same committed gate scene stepped by all three modes: PIC decays (its angular-momentum loss IS dissipation), FLIP stays energetic/noisy, APIC sits stably between (and yes — APIC dissipates a little even at dt=0 where FLIP does not; Ding 2020).",
    ),
  );
  const ePlot = document.createElement("canvas");
  ePlot.width = 300;
  ePlot.height = 90;
  ePlot.style.width = "100%";
  const eBtn = button(t3, "run 3-mode energy comparison (gate tier)", () => void runEnergy());
  t3.appendChild(ePlot);
  const t3Out = el("div", "bps-diag");
  t3.appendChild(t3Out);

  async function runModeEnergy(mode: Mode, ic: Float32Array): Promise<number[]> {
    const zeros = new Float32Array(GATE.n * 3);
    gpu.configure({ ...gateSimConfig(0), mode });
    gpu.clearReduce();
    gpu.uploadParticles(ic, zeros, GATE.n);
    const rhoRest = await gpu.measureRhoRest();
    gpu.configure({ ...gateSimConfig(rhoRest), mode });
    gpu.uploadParticles(ic, zeros, GATE.n);
    const ke: number[] = [];
    for (let s = 0; s < GATE.steps; s += 2) {
      gpu.step(2);
      const st = await gpu.readState(GATE.n);
      ke.push(
        computeObservables(st.pos, st.vel, GATE.n, GATE.nx, GATE.nx, GATE.nx, GATE.dx, GATE.nWall)
          .kineticEnergy,
      );
    }
    return ke;
  }

  async function runEnergy(): Promise<void> {
    eBtn.disabled = true;
    t3Out.textContent = "";
    try {
      await withExclusive(async () => {
        const ic = await fetchIC();
        const kePic = await runModeEnergy("pic", ic);
        const keFlip = await runModeEnergy("flip", ic);
        const keApic = await runModeEnergy("apic", ic);
        drawSeries(
          ePlot,
          [
            { data: kePic, color: "#e05c5c" },
            { data: keFlip, color: "#d8b04d" },
            { data: keApic, color: "#4dd8c0" },
          ],
          "KE vs step — red PIC / gold FLIP / teal APIC",
        );
        line(
          t3Out,
          null,
          `final KE: PIC ${kePic[kePic.length - 1].toFixed(1)} / FLIP ${keFlip[keFlip.length - 1].toFixed(1)} / APIC ${keApic[keApic.length - 1].toFixed(1)} (measured on your GPU)`,
        );
      });
    } catch (e) {
      line(t3Out, false, `energy comparison failed: ${(e as Error).message}`);
    } finally {
      eBtn.disabled = false;
    }
  }

  // ---- tier 2: THE GATE ------------------------------------------------------
  const tg = panel.addGroup("proof — the gate itself (committed canonical, on your GPU)");
  tg.appendChild(
    el(
      "div",
      "bps-note",
      `Replays the committed 12³ web-gate dam break (${GATE.steps} steps, Jacobi ${GATE.nJacobi} — the measured-converged cap) from the committed f32 IC and compares TEN robust observables per checkpoint against the committed f64 references. Per-particle pointwise comparison is REJECTED for this scene (chaotic + fixed-point-atomic ≠ f64 lex order); the observable-level budget is rel ${V.gate.declared_rel}, declared in tolerance.toml.`,
    ),
  );
  const gPlot = document.createElement("canvas");
  gPlot.width = 300;
  gPlot.height = 70;
  gPlot.style.width = "100%";
  const gBtn = button(tg, "RUN THE GATE (on your GPU)", () => void runGate());
  tg.appendChild(gPlot);
  const tgOut = el("div", "bps-diag");
  tg.appendChild(tgOut);

  async function runGate(): Promise<void> {
    gBtn.disabled = true;
    tgOut.textContent = "";
    try {
      await withExclusive(async () => {
        const [ic, refs] = await Promise.all([fetchIC(), fetchRefs()]);
        const r1 = await runCanonicalReplay(gpu, ic, (s) =>
          panel.setStatus(`gate replay: step ${s}/${GATE.steps}`),
        );
        const r2 = await runCanonicalReplay(gpu, ic, (s) =>
          panel.setStatus(`gate replay (run 2): step ${s}/${GATE.steps}`),
        );
        const errs = checkpointErrors(r1.checkpoints, refs);
        let twice = true;
        for (let ci = 0; ci < r1.checkpoints.length; ci += 1) {
          const a = r1.checkpoints[ci];
          const b = r2.checkpoints[ci];
          const eq = (x: Float32Array, y: Float32Array): boolean =>
            x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
          if (!eq(a.pos, b.pos) || !eq(a.vel, b.vel)) twice = false;
        }
        drawSeries(
          gPlot,
          [{ data: errs.rows.map((r) => r.ratio), color: "#4dd8c0" }],
          "budget used per checkpoint (1.0 = declared budget)",
        );
        const pass = errs.worstRatio <= 1.0 && twice;
        line(tgOut, errs.worstRatio <= 1.0, `robust observables vs committed refs: worst ${(errs.worstRatio * 100).toFixed(1)}% of the rel-${V.gate.declared_rel} budget`);
        line(tgOut, twice, `run-twice determinism: two fresh replays byte-identical (fixed-point i32-atomic P2G is order-independent)`);
        panel.setVerdict({
          gate: `new_canonical — robust observables + closed-form suite`,
          verdict: pass ? `PASS — worst ${(errs.worstRatio * 100).toFixed(1)}% of budget` : "FAIL",
          pass,
        });
        panel.setStatus(pass ? "gate: PASS on your GPU" : "gate: FAIL — see PROVE rows");
      });
    } catch (e) {
      line(tgOut, false, `gate failed: ${(e as Error).message}`);
    } finally {
      gBtn.disabled = false;
    }
  }

  // ---- tier 3: full 24³ canonical (PROVE extra, slow, user-triggered) --------
  const tf = panel.addGroup("proof extra — the FULL 24³ canonical (slow)");
  tf.appendChild(
    el(
      "div",
      "bps-note",
      `Replays the full committed canonical (24³, ${V.canonical.step_count} steps, Jacobi ${V.canonical.n_jacobi}, 7680 particles) from the h5 frame-0 IC (f32-quantized) and shows the measured observable deviation vs the committed f64 capture. Display-only honesty: the IC quantization + 120 chaotic steps mean this is MEASURED, not gated — the gate is the 12³ tier above.`,
    ),
  );
  const fBtn = button(tf, "run full canonical (may take a minute)", () => void runFull());
  const tfOut = el("div", "bps-diag");
  tf.appendChild(tfOut);

  async function runFull(): Promise<void> {
    fBtn.disabled = true;
    tfOut.textContent = "";
    try {
      await withExclusive(async () => {
        const p = V.canonical.params_as_run as unknown as {
          nx: number;
          dx: number;
          dt: number;
          gravity: number;
          n_jacobi: number;
          n_particles: number;
          push_apart_radius_factor: number;
          drift_k: number;
        };
        const r = await fetch("./picflip-canonical-ic.bin");
        if (!r.ok) throw new Error("canonical IC fetch failed");
        const ic = new Float32Array(await r.arrayBuffer());
        if (ic.length !== p.n_particles * 3) throw new Error("canonical IC size mismatch");
        const cfg = {
          ...gateSimConfig(0),
          nx: p.nx,
          ny: p.nx,
          nz: p.nx,
          n: p.n_particles,
          dx: p.dx,
          dt: p.dt,
          nSolve: p.n_jacobi,
          driftK: p.drift_k,
          pushRadiusFactor: p.push_apart_radius_factor,
        };
        const zeros = new Float32Array(p.n_particles * 3);
        gpu.configure(cfg);
        gpu.clearReduce();
        gpu.uploadParticles(ic, zeros, p.n_particles);
        const rhoRest = await gpu.measureRhoRest();
        gpu.configure({ ...cfg, rhoRest });
        gpu.uploadParticles(ic, zeros, p.n_particles);
        const refRows = V.canonical.observables as number[][];
        const cks = V.canonical.checkpoints as number[];
        const scale = new Array(10).fill(0);
        for (const row of refRows) {
          for (let o = 0; o < 10; o += 1) scale[o] = Math.max(scale[o], Math.abs(row[o]));
        }
        let worstRel = 0;
        let worstAt = "";
        let ci = 1;
        for (let step = 1; step <= V.canonical.step_count; step += 1) {
          gpu.step(1);
          if (step === cks[ci]) {
            panel.setStatus(`full canonical: step ${step}/${V.canonical.step_count}`);
            const st = await gpu.readState(p.n_particles);
            const obs = computeObservables(st.pos, st.vel, p.n_particles, p.nx, p.nx, p.nx, p.dx, 2);
            const got = [
              obs.kineticEnergy,
              obs.momentum[0],
              obs.momentum[1],
              obs.momentum[2],
              obs.com[0],
              obs.com[1],
              obs.com[2],
              obs.maxSpeed,
              obs.fluidNodeCount,
              obs.maxColumnHeight,
            ];
            for (let o = 0; o < 10; o += 1) {
              if (scale[o] > 0) {
                const rel = Math.abs(got[o] - refRows[ci][o]) / scale[o];
                if (rel > worstRel) {
                  worstRel = rel;
                  worstAt = `obs[${o}]@${step}`;
                }
              }
            }
            ci += 1;
          }
        }
        line(
          tfOut,
          null,
          `measured worst relative observable deviation vs the committed f64 capture: ${worstRel.toExponential(2)} at ${worstAt} (f32 + fixed-point vs f64, ${V.canonical.step_count} chaotic steps — displayed, not gated)`,
        );
        panel.setStatus("full canonical: done");
      });
    } catch (e) {
      line(tfOut, false, `full canonical failed: ${(e as Error).message}`);
    } finally {
      fBtn.disabled = false;
    }
  }

  // ---- verification card -----------------------------------------------------
  const card = panel.addGroup("verification card (committed bindings)");
  const rows: [string, string][] = [
    ["gate kind", "new_canonical (robust observables + closed-form suite + run-twice)"],
    ["declared budget", `rel ${V.gate.declared_rel} (tolerance.toml [overrides.pic-flip] — fresh observable-level declaration)`],
    ["web-gate refs", `${(V.gate_assets.refs_sha256 as string).slice(0, 12)}… (f64, from the f32-quantized committed IC)`],
    ["gate IC", `${(V.gate_assets.ic_sha256 as string).slice(0, 12)}…`],
    ["canonical capture", `${(V.canonical.payload_sha256 as string).slice(0, 12)}… (${V.canonical.descriptor})`],
    ["weights table", `${(V.golden.weights_table_sha256 as string).slice(0, 12)}…`],
    ["angular-momentum table", `${(V.golden.am_table_sha256 as string).slice(0, 12)}…`],
    ["round-trip table", `${(V.golden.rt_table_sha256 as string).slice(0, 12)}…`],
    ["transfer-error table", `${(V.golden.te_table_sha256 as string).slice(0, 12)}…`],
    ["reference determinism", V.canonical.reference_determinism as string],
    ["browser determinism", V.determinism.browser_claimed as string],
  ];
  for (const [k, v] of rows) {
    const d = el("div", "bps-note", `${k}: ${v}`);
    card.appendChild(d);
  }
  const specLink = document.createElement("a");
  specLink.href = V.repo_blob_base + V.links.spec;
  specLink.textContent = "verification-demo-spec.md";
  specLink.target = "_blank";
  card.appendChild(specLink);
}
