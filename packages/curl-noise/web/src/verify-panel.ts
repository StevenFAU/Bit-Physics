// curl-noise — PROVE layer card (web spec § 4): committed-golden summary
// (gen-verification.mjs recompute), live f32 instruments, the honesty
// panel, and the streamline-confinement dichotomy — every row labeled
// machine-exact vs measured-convergent, never blurred.

import verification from "./generated/verification.json";

export interface InstrumentAggregates {
  speedMax: number;
  divTraceMax: number;
  fdDivMax: number;
  conf1Max: number;
  conf2Max: number;
  clebschMax: number;
  helicityMax: number;
  isoResidMax: number;
  vnMax: number;
  beltramiMax: number;
  vortMax: number;
  construction: string;
}

const V = verification as {
  tolerance: { relative: number };
  gate: { kind: string; fn: string };
  goldens: Record<string, { ok: boolean; note: string }>;
  wgsl_checks: Record<string, boolean>;
  gate_ic_sha256: string;
  generated_note: string;
};

function row(
  label: string,
  value: string,
  badge: string,
  cls: "exact" | "measured" | "honest" | "bad",
): string {
  return `<div class="cn-row cn-${cls}"><span class="cn-lab">${label}</span><span class="cn-val">${value}</span><span class="cn-badge">${badge}</span></div>`;
}

function fmt(x: number): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 0.01 && a < 1000) return x.toPrecision(3);
  return x.toExponential(2);
}

export class VerifyPanel {
  readonly element: HTMLElement;
  private live: HTMLElement;
  private badge: HTMLElement;

  constructor() {
    const el = document.createElement("div");
    el.className = "cn-prove";
    const goldenRows = Object.entries(V.goldens)
      .map(([k, g]) =>
        row(k, g.ok ? "recomputed OK" : "MISMATCH", g.note, g.ok ? "exact" : "bad"),
      )
      .join("");
    const wgslRows = Object.entries(V.wgsl_checks)
      .map(([k, ok]) => row(k, ok ? "pass" : "FAIL", "build-time", ok ? "exact" : "bad"))
      .join("");
    el.innerHTML = `
      <div class="cn-head"><span id="cn-badge" class="cn-gate-badge">GATED</span>
        <b>PROVE — verification-visible</b></div>
      <details open><summary>Live instruments (f32, this GPU — 1 Hz)</summary>
        <div id="cn-live"></div>
        <div class="cn-note">f32 floors apply on-device; the machine-exact story is the
        committed f64 goldens below + the live-f64 web gate (<code>_gate_curl_noise</code>,
        budget rel ${V.tolerance.relative} of iso scale, chaos-immune — never a pointwise
        trajectory match).</div>
      </details>
      <details><summary>Committed goldens (pure-JS f64 recompute at build)</summary>
        ${goldenRows}${wgslRows}
        <div class="cn-note">${V.generated_note} · gate IC sha ${V.gate_ic_sha256.slice(0, 12)}…</div>
      </details>
      <details><summary>Why chaos-immune (the confinement dichotomy)</summary>
        <div class="cn-note">
        The flagship v = ∇f₁×∇f₂ is orthogonal to both factor gradients —
        <b>v·∇f₁ ≡ v·∇f₂ ≡ 0</b> (machine-exact triple products), so f₁ and f₂ are
        exact invariants and every streamline is confined to the intersection
        {f₁=c₁}∩{f₂=c₂}: it cannot be chaotic, and the distance-to-manifold residual
        is a legitimate gate even though pointwise positions drift along the curve.
        Second exact identity: ψ·v ≡ 0 for the Clebsch potential ψ = f₁∇f₂.
        <b>Kinetic helicity v·(∇×v) is NOT zero</b> — shown honestly below (the
        v0.2 claim was refuted at execution; counterexample f₁=xy, f₂=z+x²).
        ABC is the opposite pole (Beltrami ∇×v = v): no invariant, chaotic regions
        exist — which is why no template ever gates on trajectories.
        </div>
      </details>
      <details><summary>Honesty (what this is NOT)</summary>
        <div class="cn-note">
        This is a <b>procedural</b> flow field ("fluid-like velocity fields" —
        Bridson 2007, verbatim). It is provably incompressible and boundary-tangent.
        It has <b>no pressure, no momentum/energy conservation, and no
        self-advection</b> — it does <b>not</b> solve Navier–Stokes (our phrasing).
        Certifiable = incompressibility + boundary tangency, full stop. Kinetic
        energy and vorticity are displayed but obey no conservation law here.
        Lineage: curl-of-noise core Kniss &amp; Hart 2004; boundaries + modulation
        Bridson 2007; pointwise-incompressible interpolation Curl-Flow 2022; C¹
        boundary fix (2D-only) Ding &amp; Batty 2023; cross-product construction
        DeWolf 2005 / Wu 2021; nD proof + reprojection Bærentzen et al. 2025.
        </div>
      </details>`;
    this.element = el;
    this.live = el.querySelector("#cn-live") as HTMLElement;
    this.badge = el.querySelector("#cn-badge") as HTMLElement;
  }

  setGated(gated: boolean, reason: string): void {
    this.badge.textContent = gated ? "GATED" : "UNGATED";
    this.badge.className = `cn-gate-badge ${gated ? "cn-on" : "cn-off"}`;
    this.badge.title = reason;
  }

  update(a: InstrumentAggregates): void {
    const rows: string[] = [];
    rows.push(
      row("max |div| — trace(J), exact Hessians", fmt(a.divTraceMax), "identity @ f32 floor", "exact"),
    );
    rows.push(
      row("max |div| — FD probe g=0.02", fmt(a.fdDivMax), "O(g²) truncation (measured)", "measured"),
    );
    if (a.construction === "crossprod") {
      rows.push(row("max |v·∇f₁|", fmt(a.conf1Max), "machine-exact (golden F)", "exact"));
      rows.push(row("max |v·∇f₂|", fmt(a.conf2Max), "machine-exact (golden F)", "exact"));
      rows.push(row("max |ψ·v| (Clebsch)", fmt(a.clebschMax), "machine-exact (golden F)", "exact"));
      rows.push(
        row("iso-residual after 1 Newton step", fmt(a.isoResidMax), "reprojection live", "exact"),
      );
      rows.push(
        row("kinetic helicity v·(∇×v)", fmt(a.helicityMax), "HONESTLY NONZERO", "honest"),
      );
    }
    if (a.construction === "abc") {
      rows.push(
        row("Beltrami residual |∇×v − 2πv|", fmt(a.beltramiMax), "FD, f32 floor", "measured"),
      );
      rows.push(row("FD div (structurally 0)", fmt(a.fdDivMax), "bit-zero stencil", "exact"));
    }
    if (a.vnMax > 0 || a.construction === "crossprod") {
      rows.push(row("max |v·n| on obstacle", fmt(a.vnMax), "exact tangency (golden D)", "exact"));
    }
    rows.push(row("max |v| / |∇×v|", `${fmt(a.speedMax)} / ${fmt(a.vortMax)}`, "display only — NOT gated", "honest"));
    this.live.innerHTML = rows.join("");
  }
}
