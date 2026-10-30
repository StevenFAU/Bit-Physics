// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph with a diagram; the rule step by step with
// the kernel it runs), the live instruments (polarization φ and milling m
// from the exact integer reduction), the performance readout, and the
// model's limits.

import type { PassTiming } from "@bp/gpu";
import { h, plotPanel, readout, sparkline } from "@bp/studio";
import type { SweepResult } from "./dial-controller.js";
import { SWEEP } from "./dial-controller.js";
import type { BrainParams } from "./model/brains.js";
import type { Census } from "./model/ecology.js";
import type { OrderParams } from "./model/flock.js";
import type { FluidStats } from "./model/fluid.js";
import { METER } from "./model/meter.js";
import type { RuleParams } from "./model/params.js";
import { TUNSTROM } from "./regime.js";
import type { SceneDef } from "./scenes.js";
import { EYES_LEQ, VICSEK_V0, vicsekRho } from "./scenes.js";
import { M3_CHECK } from "./proof/m3-proofs.js";

export const REPO_BLOB = "https://github.com/StevenFAU/Bit-Physics/blob/main/";
const REYNOLDS = "https://red3d.com/cwr/papers/1987/boids.html";
const VICSEK = "https://doi.org/10.1103/PhysRevLett.75.1226";
const TUNSTROM_URL = "https://doi.org/10.1371/journal.pcbi.1002915";
const COUZIN_URL = "https://doi.org/10.1006/jtbi.2002.3065";
const BAGLIETTO_URL = "https://doi.org/10.1098/rsfs.2012.0021";
const CHATE_URL = "https://doi.org/10.1103/PhysRevE.77.046113";
const STAM_URL = "https://doi.org/10.1145/311535.311548";
const HOLLING_URL = "https://doi.org/10.4039/Ent91385-7";
const ROSENZWEIG_URL = "https://doi.org/10.1086/282272";
const BASTIEN_URL = "https://doi.org/10.1126/sciadv.aay0792";
const BASTIEN_CODE = "https://github.com/RnoB/VisualCollective";

export interface LearnPane {
  setScene(scene: SceneDef, proofRun: boolean): void;
  setRule(r: RuleParams): void;
  setBrain(b: BrainParams | null): void;
  setSweep(r: SweepResult): void;
  pushOrder(o: OrderParams): void;
  pushCensus(c: Census): void;
  pushFluid(st: FluidStats, fishTopSpeed: number, fb: number): void;
  setStats(rows: [string, string][]): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

const DIAGRAM = `<svg viewBox="0 0 320 150" role="img" aria-label="Diagram: a fish at the centre of three nested circles. Inside the smallest it moves away from neighbours (separation), inside the middle one it matches their heading (alignment), inside the largest it steers towards their centre (cohesion)." class="sw-diagram">
  <defs><marker id="sw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
  <g fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-dasharray="3 3">
    <circle cx="90" cy="75" r="22"/><circle cx="90" cy="75" r="46"/><circle cx="90" cy="75" r="66"/>
  </g>
  <path d="M84 75L100 69L100 81Z" fill="currentColor"/>
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M100 75L124 75" marker-end="url(#sw-arrow)"/>
  </g>
  <g fill="currentColor" opacity="0.8">
    <path d="M104 60l8-3-2 6z"/><path d="M60 92l8-2-3 6z"/><path d="M118 108l8-1-4 6z"/><path d="M140 44l8-3-2 6z"/>
  </g>
  <g font-family="IBM Plex Sans, system-ui, sans-serif" font-size="12" fill="currentColor">
    <text x="172" y="58">separation · 0.3 r</text>
    <text x="172" y="80">alignment · 0.72 r</text>
    <text x="172" y="102">cohesion · r</text>
  </g>
</svg>`;

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const seeing = h("p", { class: "sw-lede" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing);

  const ruleCells: Record<string, HTMLElement> = {};
  const rv = (k: string): HTMLElement => (ruleCells[k] = h("span", { class: "bp-mono" }, "—"));
  const src = (label: string, path: string): HTMLAnchorElement => h("a", { href: `${REPO_BLOB}${path}`, target: "_blank", rel: "noopener" }, label);
  const link = (href: string, label: string): HTMLAnchorElement => h("a", { href, target: "_blank", rel: "noopener" }, label);
  const bv = (k: string): HTMLElement => (brainCells[k] = h("span", { class: "bp-mono" }, "—"));
  const brainCells: Record<string, HTMLElement> = {};
  const reynoldsHow = h("div", {});
  pane.append(reynoldsHow);
  reynoldsHow.append(
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Every fish follows three local rules — keep a little distance, swim the way your neighbours swim, stay close to them — " +
        "and flees anything big that comes too near. No fish knows the shape of its school.",
    ),
    h("div", { html: DIAGRAM }),
    h(
      "p",
      {},
      "This is Craig Reynolds's 1987 boids model (",
      h("a", { href: REYNOLDS, target: "_blank", rel: "noopener" }, "Reynolds 1987"),
      ") with the angular noise of Vicsek's 1995 model of self-driven particles (",
      h("a", { href: VICSEK, target: "_blank", rel: "noopener" }, "Vicsek et al. 1995"),
      "). With little noise the fish polarise into schools; with enough, order breaks into a disordered swarm. " +
        "The shark adds a fear term: inside its ring every fish is pushed straight away from it, more the closer it is. " +
        "The schools tear open around it and heal behind it — the fountain effect seen in real fish.",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Look around: every fish within reach ", rv("r"), " (on the torus — the ocean wraps at its edges). Neighbours are found with a counting sort into cells of side ≥ r, so none is ever missed."),
        h(
          "li",
          {},
          "Add up, as whole numbers of 2⁻²⁰: the offsets to fish within 0.72 r and r (alignment and cohesion), and a push away from fish within 0.3 r, weighted (1 − d/0.3r)/d. " +
            "Integer sums do not depend on the order the neighbours are visited in, so the run is the same bit for bit however the GPU schedules it.",
        ),
        h(
          "li",
          {},
          "Steer: towards each target heading at top speed ",
          rv("v"),
          ", each change capped at 0.14 of top speed and weighted — separation ",
          rv("ws"),
          ", alignment ",
          rv("wa"),
          ", cohesion ",
          rv("wc"),
          ".",
        ),
        h("li", {}, "Flee the shark: inside its ring, a push straight away from it that fades to zero at the edge."),
        h("li", {}, "Clamp the speed between 0.42 and 1 times the top speed, then turn the heading by a random angle up to ±", rv("eta"), "·180° (a hash of the seed, the step and the fish — the same every replay)."),
        h("li", {}, "Move, and wrap around the edges."),
      ),
      h(
        "p",
        {},
        "The GPU kernel is the v4 lab's, byte for byte: ",
        src("v2 kernel", "packages/boids-2d/web/src/v2/model/kernel.ts"),
        " · ",
        src("v4 lab", "packages/boids-2d/web/index.html"),
        " · ",
        src("spec", "docs/planning/rebuild-v2/03-boids-2d.md"),
      ),
    ),
  );

  // ---- The Order Dial: the Vicsek model ----
  const sweepPhi = plotPanel({ title: "Polarization ⟨φ⟩ against noise η (the last sweep)", xLabel: "η", yLabel: "⟨φ⟩", height: 130 });
  const sweepChi = plotPanel({ title: "Susceptibility χ = N·Var(φ) against η", xLabel: "η", yLabel: "χ", yScale: "log", height: 130 });
  const sweepNote = h("p", { class: "sw-note" }, "Press Sweep η under the map to measure the curve on this GPU.");
  const vicsekHow = h(
    "div",
    {},
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Every fish swims at the same speed and, each step, turns to the average heading of every fish within its reach r — itself included — " +
        "then wobbles by a random angle. That is the whole rule: there is no attraction, no repulsion, no leader. With little noise the fish line up into one school " +
        "crossing the whole ocean; with enough, order breaks and the headings scatter. In between lies a phase transition, like a magnet losing its magnetism when heated (",
      link(VICSEK, "Vicsek et al. 1995"),
      ").",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Look around: every fish within reach r = ", bv("vr"), " (ρ = ", bv("rho"), " fish per r², so π·ρ neighbours on average). The counting sort finds them exactly."),
        h("li", {}, "Add up the unit headings of those fish and your own, as whole numbers of 2⁻²⁰ — the sum is the same in any order, so brute force and the sort agree bit for bit."),
        h(
          "li",
          {},
          "Turn to the summed heading, then by a random angle up to ±η·180° (η = ",
          bv("eta"),
          "). The draw is a hash of the seed, the step and the fish's own id, so re-sorting the fish in memory never changes a path.",
        ),
        h("li", {}, `Swim one step at v₀ = ${VICSEK_V0} r, and wrap around the edges.`),
      ),
      h(
        "p",
        { class: "sw-note" },
        "Noise convention: Vicsek's η is the full width of the random turn, from 0 to 2π. Here η = 1 is that fully random turn, so Vicsek's value is 2π times the dial's: " +
          "his η_c ≈ 2.9 at ρ = 0.4 (a few thousand particles, v₀ = 0.03 r) is 0.46 on the dial. This noise is angular — added to the heading after averaging. " +
          "With vectorial noise, and in large systems, the transition is discontinuous, with travelling bands of order (",
        link(CHATE_URL, "Chaté et al. 2008"),
        "). A million fish is a large system.",
      ),
      h("p", {}, "The kernel: ", src("brains.ts", "packages/boids-2d/web/src/v2/model/brains.ts"), " · ", src("spec", "docs/planning/rebuild-v2/03-boids-2d.md")),
    ),
    h("h2", {}, "The phase map"),
    h(
      "p",
      {},
      `Every dot on the map is a measurement on the live ocean, never a value from a paper. After you move the dial or the crowding, the meter waits ${METER.relax} steps, ` +
        `then averages the exact polarization φ over at least ${METER.window} steps (a rolling window of up to ${METER.maxWindow.toLocaleString()}). ` +
        `A filled dot has settled — the window's two halves agree within ${METER.settleTol} in φ; a ring is still changing, as a school does near the transition or while it slowly re-orders. ` +
        "The susceptibility χ = N·Var(φ) is the size of φ's fluctuations; it peaks at the transition, which is how the sweep locates η_c (",
      link(BAGLIETTO_URL, "Baglietto, Albano & Candia 2012"),
      ").",
    ),
    h(
      "p",
      { class: "sw-note" },
      `The sweep starts from an ordered school and turns the dial from η ${SWEEP.etas[0]} to ${SWEEP.etas[SWEEP.etas.length - 1]} in steps of 0.05, holding each value until it settles (at least ${SWEEP.minSteps} steps, at most ${METER.maxWindow.toLocaleString()}), at ${SWEEP.speed}× speed.`,
    ),
    sweepPhi.el,
    sweepChi.el,
    sweepNote,
  );
  vicsekHow.hidden = true;
  pane.append(vicsekHow);

  // ---- The Mill: Couzin's zones ----
  const couzinHow = h(
    "div",
    {},
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Each fish lives in three rings. Inside the smallest it only moves away from whoever is too close. Otherwise it matches the heading of fish in the middle ring " +
        "and swims towards fish in the outer one, ignoring anything in the blind spot behind it, and it can only turn so fast. " +
        "With a narrow middle ring the school cannot agree on one direction, yet it holds together — so it circles an empty centre: a mill, or torus (",
      link(COUZIN_URL, "Couzin et al. 2002"),
      "). Widen the middle ring and the same school swims off as one.",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Repel: any fish closer than r_r = ", bv("rr"), " → steer straight away from them (and do nothing else this step)."),
        h("li", {}, "Otherwise align with the fish out to r_o = ", bv("ro"), " and gather towards those out to r_a = ", bv("ra"), " (it spans the school), half of each."),
        h("li", {}, "See only ", bv("fov"), " around you; behind is blind."),
        h("li", {}, "Add a random twist (σ = ", bv("sig"), " rad), then turn towards the chosen heading by at most ", bv("turn"), " per step, and swim ", bv("sp"), " r_r."),
        h("li", {}, "Flee the shark: inside its ring, fleeing outweighs the school, more the closer it is."),
      ),
      h("p", { class: "sw-note" }, "Every sum is a whole number (units of 2⁻¹⁶), so brute force and the sort agree bit for bit, and the noise is keyed by each fish's id."),
      h("p", {}, "The kernel: ", src("brains.ts", "packages/boids-2d/web/src/v2/model/brains.ts")),
    ),
    h("h2", {}, "Naming the state"),
    h(
      "p",
      {},
      `The panel on the water names the school's state from two measured numbers, with Tunstrøm et al.'s own cutoffs (`,
      link(TUNSTROM_URL, "Tunstrøm et al. 2013"),
      `): polarization O_p = |Σ v̂| / N and rotation O_r = |Σ r̂ × v̂| / N about the school's centre. ` +
        `Polarized: O_p > ${TUNSTROM.hi} and O_r < ${TUNSTROM.lo}. Milling: O_p < ${TUNSTROM.lo} and O_r > ${TUNSTROM.hi}. Swarm: both below ${TUNSTROM.lo}. Anything else is transitional. ` +
        "The centre is the circular mean of the positions, so a school crossing the wrapped edge keeps its centre.",
    ),
  );
  couzinHow.hidden = true;
  pane.append(couzinHow);

  // ---- Current: the water as a solved fluid ----
  const currentHow = h(
    "div",
    {},
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "The water is a fluid simulation, solved every step — not a drawn pattern. It is the two-dimensional Navier–Stokes equations on a 256 × 128 grid that wraps at its edges. " +
        "The solver keeps the water's spin (its vorticity ω) and finds the flow from a stream function ψ, with ∇²ψ = −ω solved exactly by a Fourier transform. " +
        "A steady push (Kolmogorov forcing) keeps a current running east through the middle and west along the edges; friction with the sea floor stops it running away. " +
        "Where the two streams meet, the water shears and rolls into eddies.",
    ),
    h(
      "p",
      {},
      "The fish swim by Open Water's rule, unchanged. Each step, every fish and the water at its position trade momentum: the fish's velocity moves part of the way towards the water's, " +
        "and the water gains exactly what the fish lost. So a current carries a school, and a school swimming through still water drags the water along. " +
        "Your brush adds a push of its own. This is the v4 lab's two-way coupling (",
      src("v4 lab", "packages/boids-2d/web/index.html"),
      ") on a new solver; its fluid step follows Stam's stable fluids (",
      link(STAM_URL, "Stam 1999"),
      ").",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "One step of the water, in order"),
      h(
        "ol",
        {},
        h("li", {}, "Couple: each fish's velocity moves a fraction ", bv("drag"), " of the way to the water's; the opposite impulse goes to the 4 grid nodes around it, as whole numbers of 2⁻²⁰."),
        h("li", {}, "Brush: your stroke adds a Gaussian push to the same sums."),
        h("li", {}, "Carry the spin: ω is traced back along the flow (semi-Lagrangian, two-stage), and gains the curl of the step's pushes and of the steady current."),
        h("li", {}, "Mean flow: the whole ocean's drift U₀ gains the pushes' exact integer total — the part of a push a wrapped stream function cannot hold."),
        h("li", {}, "Solve: one Fourier transform of ω; viscosity ", bv("nu"), " and floor friction ", bv("mu"), " act on each wave; ψ = ω / λ with λ the grid Laplacian's own eigenvalue; one transform back gives both ω and ψ."),
        h("li", {}, "Motes ride the new flow (two-stage), exactly as a fish would if it did not swim."),
      ),
      h("h3", {}, "Why the water cannot compress"),
      h(
        "p",
        {},
        "At the grid's nodes the velocity is the curl of ψ by central differences, and the central-difference divergence of that is ψ₊₊ − ψ₊₋ − ψ₋₊ + ψ₋₋ minus the same sum: zero for any ψ, whether the solve is exact or not. " +
          "Between nodes a fish feels the exact curl of ψ interpolated bilinearly. Inside a cell that is u = c + d·x, v = −(b + d·y), whose divergence d − d is zero; across a cell's edge the flow through it depends only on the edge's two corners, so no water leaks between cells. " +
          "The field the fish ride is divergence-free everywhere. What remains, measured below and on the canvas, is f32 rounding.",
      ),
      h("h3", {}, "Why the exchange conserves momentum"),
      h(
        "p",
        {},
        "A fish weighs fb times the water at one node (fb = ",
        bv("fb"),
        ": the fish weigh ",
        bv("mass"),
        " of the water, spread over the ocean). The water gains Σq·2⁻²⁰ at its nodes and the fish loses Σq·2⁻²⁰ / fb of velocity — the same integers Σq. " +
          "The solve keeps the water's mean, so its total momentum is the mean drift times the ocean's water, and gains exactly Σq. Prove measures the balance. " +
          "A fish's own steering and speed limit are not part of the exchange: they are the fish swimming, a force from outside the fish–water pair.",
      ),
      h("p", {}, "Source: ", src("model/fluid.ts", "packages/boids-2d/web/src/v2/model/fluid.ts"), " · ", src("model/current.ts", "packages/boids-2d/web/src/v2/model/current.ts")),
    ),
  );
  currentHow.hidden = true;
  pane.append(currentHow);

  // ---- Food Chain: plankton → fish → sharks ----
  const foodHow = h(
    "div",
    {},
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Three populations, each living on the one below. Plankton grows in every patch of water towards a ceiling (logistic growth), spreads slowly, and is grazed. " +
        "Each fish pays a little energy every step to live and gains its share of what its patch loses to grazing; at energy 1 it splits in two, at 0 it starves. " +
        "Sharks hunt: each swims at the nearest crowd it can sense, takes the nearest fish within its jaws, spends a few steps eating (Holling's handling time, ",
      link(HOLLING_URL, "Holling 1959"),
      "), pays a larger upkeep, splits at energy 2 and starves at 0.",
    ),
    h(
      "p",
      {},
      "Predators that saturate like this make populations cycle rather than settle — the classic result of ",
      link(ROSENZWEIG_URL, "Rosenzweig & MacArthur 1963"),
      ". Fish boom while sharks are few; the sharks multiply on them; the fish crash; the sharks starve; the plankton, grazed bare at the fish's peak, glows back before the next boom.",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "The numbers, per step"),
      h(
        "ul",
        {},
        h("li", {}, "Plankton: growth r ", bv("pr"), ", diffusion between neighbouring cells, a faint seeding so no patch stays bare for ever."),
        h("li", {}, "Fish: a patch with n fish loses P(1 − e^(−a·n)) of its plankton; each fish gains ε ", bv("eff"), " of its share and pays ", bv("fcost"), "."),
        h("li", {}, "Sharks: ", bv("scost"), " upkeep, 0.25 per fish eaten, 10 steps to eat it, ", bv("sspeed"), "× a fish's top speed."),
        h("li", {}, "Fish flee any shark within 0.35 and climb the plankton's gradient when hungry; otherwise they school by Open Water's weights (a new kernel, with the same integer neighbour sums)."),
        h(
          "li",
          {},
          "Births fill empty slots in a fixed order: two prefix scans rank the newborns and the empty slots, and the k-th newborn takes the k-th slot. With integer catch keys the whole ecology replays bit for bit.",
        ),
        h("li", {}, "Newcomers: four fish arrive every 120 steps, and a shark every 900 steps while fewer than two remain — so no population stays extinct, and nothing is ever reset."),
      ),
      h("p", {}, "Source: ", src("model/ecology.ts", "packages/boids-2d/web/src/v2/model/ecology.ts")),
    ),
  );
  foodHow.hidden = true;
  pane.append(foodHow);

  const phi = sparkline("Polarization φ (O_p)", "", 120, 3);
  const mill = sparkline("Rotation m (O_r)", "", 120, 3);
  const orderNote = h(
    "p",
    { class: "sw-note" },
    "φ = |Σ v̂| / N is 1 when every fish swims the same way and near 0 when headings are random. " +
      "m = |Σ r̂ × v̂| / N measures rotation about the centre of mass (Tunstrøm et al. 2013's O_r; on a whole ocean of schools it averages away). ",
    h("a", { href: TUNSTROM_URL, target: "_blank", rel: "noopener" }, "Tunstrøm et al. 2013"),
    ". Both are exact integer sums over every fish, computed on the GPU.",
  );
  const stats = readout("The ocean");
  const fishSpark = sparkline("Fish (census)", "", 240, 0);
  const sharkSpark = sparkline("Sharks", "", 240, 0);
  const planktonSpark = sparkline("Plankton (fraction of its ceiling)", "", 240, 2);
  const popBox = h("div", {}, fishSpark.el, sharkSpark.el, planktonSpark.el);
  const water = readout("The water, measured");
  const waterNote = h(
    "p",
    { class: "sw-note" },
    "|∇·u| is the largest divergence on the grid by central differences, against the largest velocity gradient |∂u/∂x| + |∂v/∂y|. The Poisson residual is max |∇²ψ + ω| / max |ω|: how exactly the transform solved for ψ.",
  );
  const waterBox = h("div", {}, water.el, waterNote);
  popBox.hidden = true;
  waterBox.hidden = true;
  // ---- M3: Eyes Only (the vision-only model) and Species Matrix ----
  const eyesHow = h(
    "div",
    {},
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Each fish is a small disc with an eye at its centre that sees all the way round. What it sees is a single picture: for every direction, is there a fish there or not? " +
        "Nothing else — not how far away, not which fish, not which way it is swimming. From that picture alone it slows down for what is ahead, speeds up for what is behind, " +
        "turns away from what crowds one side, and is drawn towards the edges of what it sees. That is the minimal model of ",
      link(BASTIEN_URL, "Bastien & Romanczuk 2020"),
      ". There is no rule that copies a neighbour's heading — and still the fish line up and school.",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Every fish within sight (", bv("vrange"), " body lengths) is a disc of one body length. Its angular size and direction are marked on 256 bins all the way round; overlapping discs merge, so a fish hidden behind another adds nothing."),
        h(
          "li",
          {},
          "Speed: dv/dt = γ(v₀ − v) + α₀ ∫ cos φ (−V + α₁ (∂_φV)²) dφ. The −V term pushes back on everything it sees, weighted by how far ahead it is; the edge term pulls forward towards each edge it sees. α₀ = ",
          bv("va0"),
          ", α₁ = ",
          bv("va1"),
          ", γ = ",
          bv("vg"),
          ".",
        ),
        h("li", {}, "Turning: dψ/dt = β₀ ∫ sin φ (−V + β₁ (∂_φV)²) dφ — away from what fills one side, towards the edges on it. β₀ = ", bv("vb0"), "."),
        h(
          "li",
          {},
          `One disc straight ahead is pushed by its width and pulled by its two edges; the two balance at L_eq = BL / (2α₁), here ${EYES_LEQ} body lengths. ` +
            "The integrals come straight from the bins' boundaries (each bin's ∫cos and ∫sin are exact), summed in a fixed order.",
        ),
        h("li", {}, "Step: v and ψ change by dt × the above (one unit of time per step), then the fish moves v·dt along its new heading, and wraps around the edges."),
      ),
      h(
        "p",
        { class: "sw-note" },
        "As in the authors' code (",
        link(BASTIEN_CODE, "VisualCollective"),
        "), a disc always covers at least the bin its centre falls in, and speed may go negative. The paper labels its figures by 1/α₁ in body lengths; here α₁ is set from its own " +
          "equilibrium distance L_eq = BL / (2α₁). The rates are its Fig. 3 pair α₀ 0.1, β₀ 0.02, with γ 0.1 and v₀ 0.5 body lengths per unit of time.",
      ),
      h("p", {}, "The kernel: ", src("brains-m3.ts", "packages/boids-2d/web/src/v2/model/brains-m3.ts"), " · the f64 reference: ", src("vision-cpu.ts", "packages/boids-2d/web/src/v2/model/vision-cpu.ts")),
    ),
    h("h2", {}, "Seeing through its eyes"),
    h(
      "p",
      {},
      "Pick Watch and click a fish. The strip in its panel is its whole retina, unrolled: ahead in the middle, behind at both ends. Lit bins are fish it sees; the amber ticks are the edges that pull it. " +
        "The same picture is drawn as a ring around the fish. It is the field the GPU computed for that fish on the last step, read back — not redrawn.",
    ),
  );
  eyesHow.hidden = true;
  pane.append(eyesHow);

  const speciesHow = h(
    "div",
    {},
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Every kind of fish flocks by Open Water's rule — keep your distance, match your neighbours, stay close — but how much each fish cares about each other kind is a number in the matrix. " +
        "A warm cell steers the row's fish towards the column's kind (chase, gather); a cool cell steers it away (flee, avoid). The diagonal is each kind's own schooling. " +
        "“Swim with” sets whether a kind matches another's heading or swims against it, and the last row each kind's top speed. These are the v4 lab's species couplings, for up to six kinds.",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Separation, from every fish within 0.3 r whatever its kind (r = ", bv("sr"), ")."),
        h("li", {}, "For each kind, the centre of its fish within r and their mean heading within 0.72 r — summed as whole numbers of 2⁻²⁰, so the order fish are found in cannot change a bit."),
        h("li", {}, "Steer towards each kind's centre by its cohesion gain and to its heading by its alignment gain; a negative gain steers away. Each steer is capped, as in Open Water."),
        h("li", {}, "Clamp to the kind's speed range, add the panic noise (a hash of seed, step and fish id), move, wrap."),
      ),
      h(
        "p",
        { class: "sw-note" },
        "Rock–paper–scissors: each kind chases the next and flees the one before, so spirals of chase sweep through the ocean. Predator and prey: a few fast hunters (1.7× top speed) that loosely school and chase; prey flee them. " +
          "The v4 lab summed the kinds in floating point; here the sums are integers, so brute force and the counting sort agree bit for bit (Prove checks it).",
      ),
      h("p", {}, "The kernel: ", src("brains-m3.ts", "packages/boids-2d/web/src/v2/model/brains-m3.ts")),
    ),
  );
  speciesHow.hidden = true;
  pane.append(speciesHow);

  pane.append(h("h2", {}, "Instruments"), phi.el, mill.el, orderNote, popBox, waterBox, stats.el);

  const perf = readout("Performance");
  const passes = readout("GPU time per pass");
  const perfNote = h("p", { class: "sw-note" }, "");
  pane.append(h("h2", {}, "Performance"), perf.el, h("h3", {}, "GPU time per pass"), passes.el, perfNote);

  const limitsVicsek = h(
    "ul",
    { class: "sw-limits" },
    h("li", {}, h("strong", {}, "Faithful: "), "Vicsek's rule as published (self included, constant speed, angular noise), with exact neighbours."),
    h(
      "li",
      {},
      h("strong", {}, "Measured, not converged: "),
      "a million fish relax slowly near the transition; a dot that has not settled says so. η_c from a sweep depends on the system's size, the speed and the sweep's pace — compare it with Vicsek's 0.46 with that in mind.",
    ),
    h("li", {}, h("strong", {}, "Same device, same bytes: "), "a run replays bit for bit on the same GPU and browser; across GPUs only the statistics compare."),
  );
  const limitsCouzin = h(
    "ul",
    { class: "sw-limits" },
    h("li", {}, h("strong", {}, "Faithful: "), "Couzin et al. 2002's zones, blind angle, turn limit and Gaussian heading noise, in 2D."),
    h(
      "li",
      {},
      h("strong", {}, "Chosen: "),
      "the attraction zone spans the school (Couzin explored up to 15 r_r with 100 fish; a bigger school needs a longer reach to stay one school), so every fish sees every other in front of it — the cost grows as N², which caps The Mill at a few thousand fish.",
    ),
    h("li", {}, h("strong", {}, "The shark "), "is a pointer-driven fear term, not a hunting agent."),
  );
  limitsVicsek.hidden = true;
  limitsCouzin.hidden = true;
  const limitsReynolds = h(
    "ul",
    { class: "sw-limits" },
      h("li", {}, h("strong", {}, "Faithful: "), "the v4 lab's gated kernel, step for step; metric neighbours, found exactly; every frame is real solver steps."),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "fish are points with a heading — no body, no vision cone (the field of view is 360°), no fatigue; the shark is a pointer-driven fear term, not a hunting agent, and it does not reach across the ocean's wrapped edge.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Changed for speed: "),
        "every 16 steps the live ocean moves its fish into grid order in memory, so neighbours are read from nearby memory. With no noise that changes no fish's path (Prove checks it fish by fish); " +
          "the noise draw is keyed by memory slot, so with noise the run differs from one that never re-sorts — still the same every time.",
      ),
      h("li", {}, h("strong", {}, "Same device, same bytes: "), "a run replays bit for bit on the same GPU and browser. Across GPUs only the statistics (φ, m) are comparable — the flock is chaotic."),
      h("li", {}, h("strong", {}, "Measured: "), "φ and m from exact integer sums; the in-page proofs in Prove."),
  );
  const limitsCurrent = h(
    "ul",
    { class: "sw-limits" },
    h("li", {}, h("strong", {}, "Solved, and measured: "), "the water is a real fluid solve; its divergence and its Poisson residual are measured live, and Prove measures the momentum balance of the exchange."),
    h(
      "li",
      {},
      h("strong", {}, "Simplified: "),
      "the water is two-dimensional. A fish is a point that drags its four nearest nodes — it leaves no wake and pushes no water behind it (a real swimmer's thrust and drag nearly cancel). The drag law is a model of being carried, not hydrodynamics.",
    ),
    h(
      "li",
      {},
      h("strong", {}, "Numerical: "),
      "tracing the spin back along the flow smooths it more than the viscosity alone would, and the steps are split, so the scheme is first order in time. The steady push and the floor friction are there to keep a current running and bounded.",
    ),
    h("li", {}, h("strong", {}, "The fish "), "are Open Water's gated kernel, unchanged; only their velocities pass through the coupling."),
  );
  const limitsFood = h(
    "ul",
    { class: "sw-limits" },
    h("li", {}, h("strong", {}, "Illustrative ecology: "), "the rates are chosen to make the cycle visible in minutes, not fitted to any sea. The page claims only what it measures: the populations, and that they stay bounded."),
    h("li", {}, h("strong", {}, "Bounded by design: "), "there are as many fish slots as Open Water's density allows in this ocean, and 128 shark slots; at a shark boom the slots can fill."),
    h("li", {}, h("strong", {}, "Newcomers "), "trickle in, so neither population stays extinct; nothing is ever reset."),
    h("li", {}, h("strong", {}, "Same device, same bytes: "), "a run replays bit for bit on the same GPU and browser; across GPUs only the statistics compare."),
  );
  const limitsEyes = h(
    "ul",
    { class: "sw-limits" },
    h(
      "li",
      {},
      h("strong", {}, "A reimplementation: "),
      "the paper's minimal model (no time derivatives of the picture) in 2D. Its result — ordered motion with no alignment rule — is reproduced and checked in Prove: ",
      `${M3_CHECK.order.n}-fish groups on the GPU against the f64 reference, both clearing the paper's bar of φ > ${M3_CHECK.order.minPhi}, while the same model with its edge terms off does not.`,
    ),
    h("li", {}, h("strong", {}, "Changed: "), "the authors' fish see forever on an open plane; here they see 15 body lengths (murky water) on a wrapped ocean, so separate schools can form. One step is one unit of time (the authors take 0.1); groups of 20 polarize the same at either."),
    h("li", {}, h("strong", {}, "Binned: "), "256 directions, as the authors sample 1,025 points. A distant fish narrower than a bin still covers one bin, as in their code."),
    h("li", {}, h("strong", {}, "Not shown: "), "the paper's other states (mills, swarms, crystal-like groups) live at other α₀, β₀ and group sizes; Tune reaches some of them. Some groups of 20 are still milling or disordered after 3,000 steps — about one in eight of the seeds measured."),
  );
  const limitsSpecies = h(
    "ul",
    { class: "sw-limits" },
    h("li", {}, h("strong", {}, "Illustrative: "), "the v4 lab's species couplings, not a model of particular species. Nothing is eaten; fish only steer."),
    h("li", {}, h("strong", {}, "Exact: "), "whole-number sums per kind, so a run replays bit for bit on the same GPU and the counting sort agrees with brute force."),
    h("li", {}, h("strong", {}, "Measured: "), "the mixing readout comes from the kernel's own neighbour counts; Prove checks that “keep apart” sorts the kinds and “all together” mixes them like a random draw."),
  );
  limitsCurrent.hidden = true;
  limitsFood.hidden = true;
  limitsEyes.hidden = true;
  limitsSpecies.hidden = true;
  pane.append(h("h2", {}, "Model limits"), limitsReynolds, limitsVicsek, limitsCouzin, limitsCurrent, limitsFood, limitsEyes, limitsSpecies);

  return {
    setScene(scene, proofRun) {
      const what: Record<string, string> = {
        "open-water":
          "Fish released at random headings over a wrapped ocean. Within seconds they gather into schools that wheel, merge and split. " +
          "Each bright mark is one fish; where they crowd, their light adds up. Move the pointer into the water: you are the shark.",
        proof: "The 4,096-fish run the in-page GPU proofs replay: seed 42, the scene's rule, no shark.",
        "order-dial":
          "The whole ocean is one school: every fish heading the same way, each following only its nearest neighbours. The dial is the noise in each fish's turn. " +
          "Turn it towards panic and the order melts into a swarm; turn it back and the school slowly re-forms. Every setting you hold becomes a measured dot on the map.",
        mill:
          "One school, circling an empty centre: every fish follows the fish ahead of it and stays close to the school, but none agrees on a direction — so they go round. " +
          "Push it with the shark and it may break into a polarized school that swims away, or settle back into a mill.",
        current:
          "The water is moving. A steady push runs a current east through the middle of the ocean and west along its edges; where they meet, the water shears and rolls into eddies. " +
          "The faint streaks are motes — specks drifting exactly with the water. The fish swim by Open Water's rule, but every fish trades momentum with the water around it: " +
          "the current carries the schools, and the schools drag the water with them. Drag through the water to push a current of your own.",
        "eyes-only":
          "Two thousand fish released at random, each seeing only a black-and-white picture of the fish around it — where something is, not which way it is going. " +
          "Give them half a minute: they gather into groups, the groups line up, and soon every school swims one way. No fish ever reads another's heading. " +
          "Pick Watch and click a fish to see the world through its eyes.",
        species:
          "Three kinds of fish, each chasing the next and fleeing the one before: rock–paper–scissors. Waves of colour sweep after each other. " +
          "Every cell of the matrix is how one kind steers about another — warm towards, cool away. Change a cell and the ocean answers at once; pick a preset, or two to six kinds, to start again.",
        "food-chain":
          "Plankton glows green where it grows. Fish graze it — dark trails follow the schools — and turn what they eat into more fish. Sharks hunt the fish and turn them into more sharks. " +
          "While fish are plentiful the sharks multiply; when they have eaten the fish down they starve, and the fish boom again. Feed a bloom, or release a school, to keep them alive.",
      };
      seeing.textContent = `${what[scene.id] ?? scene.prompt}${proofRun ? " This is the proofs' run." : ""}`;
      const kind =
        scene.id === "order-dial"
          ? "vicsek"
          : scene.id === "mill"
            ? "couzin"
            : scene.id === "eyes-only"
              ? "vision"
              : scene.id === "species"
                ? "species"
                : scene.water
                  ? "current"
                  : scene.ecology
                    ? "food"
                    : "reynolds";
      eyesHow.hidden = kind !== "vision";
      speciesHow.hidden = kind !== "species";
      limitsEyes.hidden = kind !== "vision";
      limitsSpecies.hidden = kind !== "species";
      reynoldsHow.hidden = kind !== "reynolds" && kind !== "current";
      currentHow.hidden = kind !== "current";
      foodHow.hidden = kind !== "food";
      limitsCurrent.hidden = kind !== "current";
      limitsFood.hidden = kind !== "food";
      popBox.hidden = kind !== "food";
      waterBox.hidden = kind !== "current";
      phi.el.hidden = kind === "food";
      orderNote.hidden = kind === "food";
      fishSpark.clear();
      sharkSpark.clear();
      planktonSpark.clear();
      water.set([]);
      if (scene.water) {
        brainCells["drag"]!.textContent = String(scene.water.params.drag);
        brainCells["nu"]!.textContent = scene.water.params.nu.toExponential(0);
        brainCells["mu"]!.textContent = scene.water.params.mu.toExponential(0);
        brainCells["mass"]!.textContent = `${Math.round(scene.water.params.massRatio * 100)}%`;
      }
      if (scene.ecology) {
        const p = scene.ecology.params;
        brainCells["pr"]!.textContent = String(p.growth);
        brainCells["eff"]!.textContent = String(p.efficiency);
        brainCells["fcost"]!.textContent = String(p.fishCost);
        brainCells["scost"]!.textContent = String(p.sharkCost);
        brainCells["sspeed"]!.textContent = String(p.sharkSpeed);
      }
      vicsekHow.hidden = kind !== "vicsek";
      couzinHow.hidden = kind !== "couzin";
      limitsReynolds.hidden = kind !== "reynolds" && kind !== "current";
      limitsVicsek.hidden = kind !== "vicsek";
      limitsCouzin.hidden = kind !== "couzin";
      mill.el.hidden = kind === "vicsek" || kind === "food" || kind === "current" || kind === "vision" || kind === "species";
      phi.clear();
      mill.clear();
    },
    setBrain(b) {
      if (!b) return;
      if (b.kind === "vicsek") {
        brainCells["vr"]!.textContent = b.p.r.toFixed(4);
        brainCells["rho"]!.textContent = vicsekRho(b.p.r).toFixed(2);
        brainCells["eta"]!.textContent = b.p.eta.toFixed(2);
      } else if (b.kind === "couzin") {
        brainCells["rr"]!.textContent = b.p.rr.toFixed(1);
        brainCells["ro"]!.textContent = b.p.ro.toFixed(2);
        brainCells["ra"]!.textContent = b.p.ra.toFixed(0);
        brainCells["fov"]!.textContent = `${b.p.fovDeg}°`;
        brainCells["turn"]!.textContent = `${((b.p.maxTurn * 180) / Math.PI).toFixed(1)}°`;
        brainCells["sig"]!.textContent = b.p.sigma.toFixed(2);
        brainCells["sp"]!.textContent = b.p.speed.toFixed(2);
      } else if (b.kind === "vision") {
        brainCells["vrange"]!.textContent = (b.p.range / (2 * b.p.R)).toFixed(0);
        brainCells["va0"]!.textContent = b.p.a0.toFixed(2);
        brainCells["va1"]!.textContent = b.p.a1.toFixed(2);
        brainCells["vg"]!.textContent = b.p.gamma.toFixed(2);
        brainCells["vb0"]!.textContent = b.p.b0.toFixed(3);
      } else {
        brainCells["sr"]!.textContent = b.p.rCoh.toFixed(3);
      }
    },
    setSweep(r) {
      const x = r.points.map((p) => p.eta);
      sweepPhi.set([
        { x, y: r.points.map((p) => p.phi), style: "dots", label: "measured" },
        { x, y: r.points.map((p) => p.phi) },
      ]);
      sweepChi.set([{ x, y: r.points.map((p) => Math.max(p.chi, 1e-6)) }], r.etaC !== null ? [{ x: r.etaC, label: `η_c ${r.etaC.toFixed(2)}` }] : []);
      const unsettled = r.points.filter((p) => !p.settled).length;
      sweepNote.textContent =
        `Measured on this GPU: ${r.n.toLocaleString()} fish at ρ ${r.rho}, ${r.points.length} settings` +
        (r.etaC !== null ? `; the χ peak puts η_c at ${r.etaC.toFixed(2)} (Vicsek's η ${(2 * Math.PI * r.etaC).toFixed(2)})` : "") +
        (unsettled ? `; ${unsettled} setting${unsettled > 1 ? "s" : ""} had not settled within ${METER.maxWindow.toLocaleString()} steps` : "") +
        (r.complete ? "." : " (stopped early).");
    },
    setRule(r) {
      ruleCells["r"]!.textContent = r.rCoh.toFixed(3);
      ruleCells["v"]!.textContent = r.maxSpeed.toFixed(4);
      ruleCells["ws"]!.textContent = r.wSep.toFixed(2);
      ruleCells["wa"]!.textContent = r.wAli.toFixed(2);
      ruleCells["wc"]!.textContent = r.wCoh.toFixed(2);
      ruleCells["eta"]!.textContent = r.noise.toFixed(2);
    },
    pushOrder(o) {
      phi.push(o.phi);
      mill.push(o.mill);
    },
    pushCensus(c) {
      fishSpark.push(c.fish);
      sharkSpark.push(c.sharks);
      planktonSpark.push(c.plankton);
    },
    pushFluid(st, top, fb) {
      brainCells["fb"]!.textContent = fb.toFixed(3);
      water.set([
        ["Largest |∇·u|", `${st.maxDiv.toExponential(2)} per step`],
        ["…against |∇u|", `${st.maxGrad.toExponential(2)} (ratio ${(st.maxGrad > 0 ? st.maxDiv / st.maxGrad : 0).toExponential(1)})`],
        ["Poisson residual", st.poisson.toExponential(1)],
        ["Fastest water", `${(st.maxSpeed / top).toFixed(2)}× a fish's top speed`],
        ["Mean energy ½|u|²", `${st.energy.toExponential(2)} per node`],
        ["Mean drift U₀", `(${st.u0[0].toExponential(1)}, ${st.u0[1].toExponential(1)})`],
      ]);
    },
    setStats(rows) {
      stats.set(rows);
    },
    setPerf(rows, list, source) {
      perf.set(rows);
      passes.set(list.map((p) => [p.name, `${p.avg.toFixed(2)} ms`]));
      perfNote.textContent =
        source === "timestamp"
          ? "Per-pass timings from GPU timestamp queries (the browser may round them to 0.1 ms)."
          : "This GPU does not expose timestamp queries; frame time is measured from submit to completion.";
    },
  };
}
