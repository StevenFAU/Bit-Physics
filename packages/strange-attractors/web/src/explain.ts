// EXPLAIN layer (verification-demo-spec § 3.2, extended by
// feature-expansion-spec §§ 3.3/4): equation → code legibility, per system.
//
// Renders the active attractor's ODEs next to the ACTUAL committed WGSL that
// implements them: the Lorenz rows anchor into the committed
// lorenz_rk4.wgsl; the X-A family rows anchor into the ratified display
// kernel (fields/attractors_rk4.wgsl). All quoted snippets and line anchors
// come from the generated data spine (src/generated/verification.json),
// extracted at build time by exact-substring match — if any kernel drifts,
// gen-verification.mjs HARD-FAILs the build instead of letting these links
// mis-anchor. Family rows also surface the system's own committed
// verification artifacts (golden table, derivation, gated capture manifest
// with its real payload digest). Hand-rolled markup on theme classes; no
// math dependency (spec § 6).

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

const FIELDS_KERNEL = "packages/strange-attractors/web/src/fields/attractors_rk4.wgsl";

function extLink(label: string, href: string, title?: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "lz-eq-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  if (title) a.title = title;
  return a;
}

interface Anchor {
  line: number;
  text: string;
}

interface OdeRow {
  eq: string;
  meaning: string;
  anchor: Anchor;
}

interface SystemSpine {
  descriptor: string;
  seed: number;
  step_count: number;
  params: Record<string, number>;
  payload_sha256: string;
  determinism_claimed: string;
  golden_table: string;
  golden_tolerance: { absolute: number; relative: number };
  golden_quantities: string[];
  derivation: string;
  manifest: string;
  code_anchors: { dx: Anchor; dy: Anchor; dz: Anchor };
}

const FAMILY_EQS: Record<string, { eqs: [string, string, string]; meanings: [string, string, string] }> = {
  rossler: {
    eqs: ["ẋ = −y − z", "ẏ = x + a·y", "ż = b + z(x − c)"],
    meanings: [
      "linear rotation in the plane",
      "gently unstable spiral",
      "the fold: z fires when x crosses c",
    ],
  },
  aizawa: {
    eqs: [
      "ẋ = (z−b)x − d·y",
      "ẏ = d·x + (z−b)y",
      "ż = c + a·z − z³/3 − r²(1+e·z) + f·z·x³",
    ],
    meanings: [
      "rotation whose radial rate is z−b",
      "the same rotation, other component",
      "the shell: cubic confinement + radial coupling + the spike term",
    ],
  },
  sprott_a: {
    eqs: ["ẋ = y", "ẏ = −x + y·z", "ż = 1 − y²"],
    meanings: [
      "position follows momentum",
      "oscillator with z as thermostat",
      "z pumps until y² balances 1 (Nosé–Hoover)",
    ],
  },
};

function eqBlock(r: OdeRow, kernelPath: string, kernelName: string): HTMLDivElement {
  const eqDiv = document.createElement("div");
  eqDiv.className = "lz-eq";
  const math = document.createElement("div");
  math.className = "lz-eq-math";
  math.textContent = r.eq;
  const note = document.createElement("small");
  note.textContent = r.meaning;
  math.appendChild(note);
  const code = document.createElement("code");
  code.className = "lz-code";
  code.textContent = r.anchor.text;
  code.title = `${kernelName} line ${r.anchor.line} — quoted verbatim at build time`;
  eqDiv.append(
    math,
    code,
    extLink(
      `${kernelName}:L${r.anchor.line}`,
      blobUrl(kernelPath, `L${r.anchor.line}`),
      "the committed kernel that runs on this GPU",
    ),
  );
  return eqDiv;
}

export interface ExplainPanel {
  setSystem(key: string): void;
}

export function installExplainPanel(panel: PanelShell): ExplainPanel {
  const g = panel.addGroup("equations → code");
  const details = document.createElement("details");
  details.className = "lz-details";
  const summary = document.createElement("summary");
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  function renderLorenz(): void {
    summary.textContent = "the three ODEs, and the committed WGSL that runs them";
    const rows: OdeRow[] = [
      { eq: "ẋ = σ(y − x)", meaning: "convective coupling", anchor: V.code_anchors.sigma_term },
      { eq: "ẏ = x(ρ − z) − y", meaning: "driving temperature gradient", anchor: V.code_anchors.rho_term },
      { eq: "ż = xy − βz", meaning: "nonlinear feedback − dissipation", anchor: V.code_anchors.beta_term },
    ];
    for (const r of rows) body.appendChild(eqBlock(r, V.links.kernel, "lorenz_rk4.wgsl"));

    // the RK4 step — the whole integrator, quoted
    const rk = document.createElement("div");
    rk.className = "lz-eq";
    const rkMath = document.createElement("div");
    rkMath.className = "lz-eq-math";
    rkMath.textContent = `one RK4 step (dt = ${V.canonical.params.dt})`;
    const rkNote = document.createElement("small");
    rkNote.textContent = "4 field evaluations, weighted 1·2·2·1";
    rkMath.appendChild(rkNote);
    const rkCode = document.createElement("code");
    rkCode.className = "lz-code";
    rkCode.textContent = V.code_anchors.rk4.lines.join("\n");
    rkCode.title = `lorenz_rk4.wgsl lines ${V.code_anchors.rk4.start}–${V.code_anchors.rk4.end}`;
    rk.append(
      rkMath,
      rkCode,
      extLink(
        `lorenz_rk4.wgsl:L${V.code_anchors.rk4.start}–L${V.code_anchors.rk4.end}`,
        blobUrl(V.links.kernel, `L${V.code_anchors.rk4.start}-L${V.code_anchors.rk4.end}`),
      ),
    );
    body.appendChild(rk);

    const foot = document.createElement("div");
    foot.className = "lz-eq";
    foot.append(
      extLink("read the derivation", blobUrl(V.links.algebraic), "algebraic.md — fixed points, Jacobian eigenvalues, sources"),
      document.createTextNode("  ·  "),
      extLink("spec sheet", blobUrl(V.links.spec)),
    );
    body.appendChild(foot);
  }

  function renderFamily(key: string): void {
    const s = (V.systems as Record<string, SystemSpine>)[key];
    const meta = FAMILY_EQS[key];
    if (!s || !meta) throw new Error(`explain: no spine entry for system ${key}`);
    summary.textContent = "the three ODEs, the ratified WGSL, and this system's own committed verification";
    const anchors = [s.code_anchors.dx, s.code_anchors.dy, s.code_anchors.dz];
    meta.eqs.forEach((eq, i) => {
      body.appendChild(
        eqBlock(
          { eq, meaning: meta.meanings[i]!, anchor: anchors[i]! },
          FIELDS_KERNEL,
          "attractors_rk4.wgsl",
        ),
      );
    });

    // this system's own committed discipline — show, don't assert
    const card = document.createElement("div");
    card.className = "lz-hash";
    const line = (label: string, value: string, title?: string): void => {
      const b = document.createElement("b");
      b.textContent = `${label}: `;
      const span = document.createElement("span");
      span.textContent = value;
      if (title) span.title = title;
      card.append(b, span, document.createElement("br"));
    };
    line("gated capture", `${s.descriptor} · seed ${s.seed} · ${s.step_count} steps`);
    line("payload sha-256", `${s.payload_sha256.slice(7, 19)}…`, s.payload_sha256);
    line("determinism", `${s.determinism_claimed} (run-twice byte-identical, measured at landing)`);
    line(
      "golden anchors",
      `${s.golden_quantities.join(" · ")} (abs ${s.golden_tolerance.absolute}, rel ${s.golden_tolerance.relative})`,
    );
    body.appendChild(card);

    const links = document.createElement("div");
    links.className = "bps-links";
    for (const [label, path] of [
      ["golden table", s.golden_table],
      ["derivation", s.derivation],
      ["capture manifest", s.manifest],
      ["display kernel", FIELDS_KERNEL],
    ] as const) {
      const a = document.createElement("a");
      a.textContent = label;
      a.href = blobUrl(path);
      a.target = "_blank";
      a.rel = "noopener";
      links.appendChild(a);
    }
    body.appendChild(links);

    const note = document.createElement("div");
    note.className = "lz-note-line";
    note.textContent =
      "display buffers run the ratified family kernel; the export capture stays pinned to the Lorenz classic seed-42 gate.";
    body.appendChild(note);
  }

  function setSystem(key: string): void {
    body.textContent = "";
    if (key === "lorenz") renderLorenz();
    else renderFamily(key);
  }

  setSystem("lorenz");
  return { setSystem };
}
