---
date: 2026-05-28T14-38-32Z
author: phase-3 lenia plan-drafting (Claude Code)
subject: Phase 3 task-3 — Lenia D-B stack-assignment investigation (plan-§6.3 Stack D vs catalog Appendix B Tier-1 Stack E vs Tier-0 Stack B)
verdict: RESOLVED-IN-CHARTER (Stack D)
head_sha: 0b8c7b16504212809bfc6144f392e79aa877a8a1
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
scope_note: >
  Investigation-only artifact: cite-bound evidence + a decision. Every claim
  tagged FACT (path:line, hash-grounded) or INFERENCE (reasoned-from-FACT).
  Sibling of the probe audit (anchor-state + Chakazul SHA + tooling probes)
  and the charter (DELIVERABLES + STOP routing). This audit owns ONE
  question: Stack D (per `docs/phases/phase-3-plan.md:154` + §6.3 + §4.1
  rationale) or Stack B/E (per `docs/planning/bit-physics-master-catalog.md:4683`
  Appendix B Tier-0/1 row)? The decision drives the entire Lenia sub-phase
  posture; surfacing it cleanly here (per the dispatch prompt's "investigate
  on evidence, then decide" rule) keeps the charter focused on STOPs and
  D-class leans.
evidence_paths:
  - docs/phases/phase-3-plan.md
  - docs/planning/bit-physics-master-catalog.md
  - docs/architecture.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md
evidence_hashes:
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/planning/bit-physics-master-catalog.md: sha256:8edab3d774b505585eb3b697fb02a826406de53a60723718d949e38277c875b4
  docs/architecture.md: sha256:97e70bad3f82800e0c28fb0d28d98ee81fddc5d504a81d68d66dee03d0e4703a
  docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md: sha256:3f4c050db9fcbeac813736b197bd2bf646970009351c4ab6055f505a4ff4df50
d_class_resolved:
  - D-B Stack D (plan § 6.3 + § 4.1 rationale + catalog § 5.2.2 reference-sim text concur; Appendix B Tier-crosswalk is tier-accessibility projection NOT implementation-stack mandate; surface-only — no catalog edit, no plan edit)
db_decision: Stack D (RESOLVED-IN-CHARTER)
---

# Phase 3 task-3 (Lenia) — D-B stack-assignment investigation

> **Posture.** Per the dispatch prompt: investigate on evidence (#1–#4),
> then decide. Convention #8 — every "yes" / "no" traces to a cited line,
> not to a preference. Convention M — HEAD wins on drift (re-anchored at
> `0b8c7b1`).

## § 0 — The fork

**Catalog row (FACT — `docs/planning/bit-physics-master-catalog.md:4683`)**

```
| Lenia | B | E | n/a |
```

Read against the table header at `docs/planning/bit-physics-master-catalog.md:4632`:

> "The crosswalk below assigns the recommended stack for each phenomenon
> at each available tier. ~170 rows abbreviated to representative
> selections; full crosswalk lives in per-sim sub-charters. Stack
> abbreviations: A=GLSL, B=WebGPU+TS, C=Vulkan/C++, D=Taichi/Py,
> E=Warp/Py, F=Rust/wgpu, G=Mojo."

→ The four columns are **Phenomenon | Tier 0 | Tier 1 | Tier 2**
(`docs/planning/bit-physics-master-catalog.md:4634`). The `B | E | n/a`
row reads "Tier 0 stack = B, Tier 1 stack = E, Tier 2 stack = n/a" —
**not** a single-stack implementation mandate.

**Plan row (FACT — `docs/phases/phase-3-plan.md:154`)**

```
| 3.1 | Lenia | continuous-ca (Lenia subfamily) | D (Taichi) | Chan 2019 |
```

**The "drift" framed in the dispatch prompt.** On its face the two rows
disagree on Lenia's stack. The investigation below shows the
disagreement is **type-mismatch, not authority conflict** — the catalog
row encodes tier-recommendations while the plan row encodes
implementation-stack. Both reduce to **Stack D for the Phase-3
reference implementation** once the column semantics are pinned.

## § 1 — Investigation #1: does Stack D have a STATED RATIONALE in plan or spec?

**FACT — `docs/phases/phase-3-plan.md:764-765` (§ 4.1 "Task sequence and ordering rationale"):**

> "**Easy before hard.** task-3 (Lenia) is the simplest sim — golden
> values, single stack, no upstream code beyond Chakazul's reference.
> Landing it first validates that the testkit + golden-table + tier-3 +
> CI pipeline works end-to-end before tackling harder sims."

> "**Cover stacks early.** task-3 (D), task-4 (E), task-5 (C) cover
> three stacks in sequence. By task-6 (D+B) the multi-stack testing
> posture is established."

**FACT — `docs/phases/phase-3-plan.md:747`:** §4.1's task-sequence diagram annotates `task-3: Lenia [easiest sim; validates Stack D testkit flow]`.

**FACT — `docs/phases/phase-3-plan.md:1287`:** §6.3 task-3 prompt opens with `ROLE: Reference Lenia on Stack D (Taichi). Sub-phase 3.1.`

**FACT — `docs/phases/phase-3-plan.md:1370`:** §6.3 VERIFICATION POSTURE explicitly cites Taichi seed:

> "Determinism: bit-exact same-stack-same-hw via Taichi seed; no
> atomics in forward conv."

**FACT — `docs/phases/phase-3-plan.md:426-433`:** § 3.2.4 tolerance row schema PRE-BAKES Lenia under Python:

```toml
[continuous-ca.lenia]                              # task-3
golden_kernel_abs = 1e-6
golden_kernel_rel = 1e-5
golden_trajectory_abs = 1e-4
```

**FACT — `docs/phases/phase-3-plan.md:479-486`:** § 3.2.5 determinism
registry PRE-BAKES Lenia under Stack D:

```toml
[continuous-ca.lenia]
stack = "D"
class = "bit-exact"
scope = "same-stack-same-hw"
atomic_ops = "none"
subgroup_ops = "none"
seed_pinned = true
```

**Conclusion #1 (INFERENCE from the above seven FACTs).** Stack D is
**not bare-drift** — it is a **plan-locked rationale-backed assignment**
with the rationale stated three times (§4.1 ordering principle,
§4.1 diagram annotation, §6.3 role line) and the implementation
pre-baked in §3.2.4 / §3.2.5 row schemas. The plan's locked-decision
section §2 (`docs/phases/phase-3-plan.md:177-340`) does not relitigate
the stack assignment, but the §4.1 rationale + §3.2.4/§3.2.5 row
shapes are **plan-normative** — they would have to be substantively
edited (not just amended) to move Lenia off Stack D.

## § 2 — Investigation #2: does the catalog's B/E have a DEPENDENCY REASON, OR is it indicative tier-accessibility?

**FACT — `docs/planning/bit-physics-master-catalog.md:4634`:** the table is `## Appendix B — Phenomenon-to-tier-to-stack crosswalk`. Header text at `:4632`:

> "The crosswalk below assigns the recommended stack for each phenomenon
> **at each available tier**. ~170 rows abbreviated to representative
> selections; **full crosswalk lives in per-sim sub-charters**."

**FACT — `docs/planning/bit-physics-master-catalog.md:1065` (§ 5.2.2 Lenia reference sim):**

> "**Reference sim:** **lenia-fft** — Stack D (Taichi or PyTorch), with
> WebGPU deploy variant."

→ The catalog's narrative §5.2.2 — its **prose** description of the
Lenia reference sim — says **Stack D** explicitly. The catalog body
agrees with the plan; the disagreement is **between two sections of the
catalog itself**, not between catalog and plan.

**FACT — `docs/planning/bit-physics-master-catalog.md:1989-1993` (§ 21.4.8 — Lenia tier framing):**

> "- Continuous-state CA.
> - Codes: custom GPU; CodeParade-style.
> - Tier 0: 2D Lenia with kernel — gallery-quality. Tier 1: 3D Lenia
>   or large-scale particle-Life.
> - Composes with: Lenia + image-driven kernel (artistic)."

→ Tier framing: **Tier 0 = 2D gallery-quality** (browser-deployable; per
`docs/planning/bit-physics-master-catalog.md:471` Stack B is the
canonical Tier-0 web stack). **Tier 1 = 3D or large-scale** (per
`docs/planning/bit-physics-master-catalog.md:475` Stack C/D/E are the
canonical Tier-1 desktop stacks; Lenia's Tier 1 = Stack E by Appendix B).

**FACT — `docs/planning/bit-physics-master-catalog.md:325-327` of the plan deliverable map.**
The plan §3.1 routes Phase 5 productization:

```
| **task-3** | `continuous-ca/lenia/python/`; golden tables; tier3
diagnostics; references/Chakazul-Lenia/ | (terminal) | — |
```

→ task-3's output is **a `python/` package** (the Stack-D form). The
catalog's "with WebGPU deploy variant" at §5.2.2 is the **Phase-5
web-deploy lift** of the Stack-D reference, not the Phase-3 reference
itself. Per `docs/planning/bit-physics-master-catalog.md:202`:

> "Web-deploy: every Stack B sim above with `productization.web: true`
> ships to `bit-physics.<domain>` via the web-deploy pipeline."

The catalog itself acknowledges that Stack-D references can have
**Stack-B web-deploy variants** (Lenia is on that list per §5.2.2). The
Appendix B `Tier 0 = B` row matches that Phase-5 future deploy, not the
Phase-3 reference.

**Conclusion #2 (INFERENCE).** The catalog Appendix B row is the
**tier-accessibility projection** — what Lenia would look like at each
tier under Phase-5+ productization. It is **NOT** a single
implementation-stack mandate, and it does **NOT** override the
catalog's own §5.2.2 reference-sim text. The "drift" is internal to
the catalog (Appendix B vs §5.2.2), and the Appendix B row's column
semantics (Tier 0 = recommended browser stack; Tier 1 = recommended
desktop stack) **co-exist consistently** with a Stack-D Phase-3
reference + a Stack-B Phase-5 web-deploy lift. **No catalog edit
required** to reconcile; the row reads correctly under the
column-header semantics.

## § 3 — Investigation #3: do downstream consumers (Phase 3 / Phase 4+) assume Lenia is on Stack B or Stack D?

**FACT — `docs/phases/phase-3-plan.md:325`:** Phase-3 deliverable map — Lenia consumers:

```
| **task-3** | `continuous-ca/lenia/python/`; golden tables; tier3
diagnostics; references/Chakazul-Lenia/ | **(terminal)** | — |
```

→ task-3 is **terminal** in Phase 3 (no Phase-3 task imports
`continuous-ca/lenia/` as a code dependency). Confirmed by inspection
of `docs/phases/phase-3-plan.md:325-334` — only task-1 and task-2
(infrastructure roots) have hard downstream consumers in Phase 3;
Lenia produces golden tables consumed **only by its own tests**.

**FACT — `docs/phases/phase-3-plan.md:155-158`:** the §1 scope table —
adjacent continuous-ca rows:

```
| 3.2 | Neural CA | continuous-ca (NCA subfamily) | D (PyTorch train) +
       B (custom WGSL inference) | Mordvintsev 2020 |
```

→ task-6 (NCA) is **D+B** (cross-stack), but it does not depend on
Lenia's stack. NCA's `D` (training) consumes `common-py` (the same
`common-py` Lenia would consume), and NCA's `B` (inference) is a
**custom WGSL port** independent of Lenia.

**FACT — `docs/phases/phase-4-plan.md`:** scanned for Lenia (`grep -n
Lenia docs/phases/phase-4-plan.md`) — Phase-4 does not introduce a
Lenia consumer (Phase 4 is NCA / WU-C / WU-A; no Lenia continuation).
[Confirmed by no-match grep at probe time; see probe § 3.3.]

**FACT — `docs/planning/bit-physics-master-catalog.md:1042` (`grep -n
Lenia docs/planning/bit-physics-master-catalog.md`):**

```
1042:- **Strange attractors** — classical dynamical systems...
4180:│  Frontier comparisons: Lenia, NCA, learned RD.               │
4683:| Lenia | B | E | n/a |
```

The only catalog reference to Lenia outside Appendix B + §5.2.2 +
§21.4.8 is `:4180` ("Frontier comparisons: Lenia, NCA, learned RD") —
a roadmap reference, not a composition that locks a stack.

**FACT — `docs/planning/bit-physics-master-catalog.md:1993` (§ 21.4.8 composition):**

> "Composes with: Lenia + image-driven kernel (artistic)."

→ "Image-driven kernel" composition is gallery-mode artistic
(Tier 0 / browser per §21.4.8 framing). That composition would
naturally live on Stack B at Phase 5 deploy, **but it does not exist
in Phase 3** — and even if it did, Stack B can consume a Stack-D
reference via the §5.2.2 "WebGPU deploy variant" pipeline. Nothing
in any composition row **requires Lenia's Phase-3 reference to live
on Stack B**.

**Conclusion #3 (INFERENCE).** No Phase-3 task and no Phase-4 task
consumes Lenia from a specific stack. The only downstream stack
assumption (Phase-5 web-deploy lift to Stack B per
`docs/planning/bit-physics-master-catalog.md:202`) is **compatible with
a Stack-D reference**; Phase-5 lifts a Stack-D Python reference to a
Stack-B WGSL port via the web-deploy pipeline, not via the reference
sim itself. Stack D for the Phase-3 reference creates **no downstream
contradiction**.

## § 4 — Investigation #4: what does Stack D buy Phase 3's pipeline-validation goal vs. Stack B?

**FACT — `docs/phases/phase-3-plan.md:765`:**

> "Cover stacks early. task-3 (D), task-4 (E), task-5 (C) cover three
> stacks in sequence. By task-6 (D+B) the multi-stack testing posture
> is established."

→ Stack-D-first puts Phase 3's first sim on the **Taichi/Python testkit
flow** — the same flow that Phase 1's MPM (`docs/phases/sub-phase-mpm-multimaterial.md`)
and Phase 1's smoke (`docs/phases/sub-phase-eulerian-smoke.md`) and
Phase 2's reaction-diffusion-2d-stack-d port
(`docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/`)
matured at length. Phase-3's testkit + golden-table + tier-3 + CI
pipeline (the dispatch prompt's CONTEXT-BRIDGE rationale) is best
exercised against a stack where the testkit has matured — that is
Stack D (Python/Taichi via `common-py`).

**FACT — `docs/architecture.md:955-962` (§ 4.4 Stack D — Python / Taichi):**

> "Verification posture: Taichi has explicit determinism flags.
> Reproducibility within Taichi is well-supported. Cross-stack
> equivalence against Stack C is the harder direction (FP order is not
> guaranteed equal)."

→ Stack D supports **bit-exact same-stack-same-hw determinism** via
Taichi seed (consistent with §6.3 VERIFICATION POSTURE at line 1370).
This is the cleanest determinism class for a sim's first landing.

**FACT — `docs/architecture.md:935-943` (§ 4.2 Stack B — TypeScript/WebGPU):**

> "Notable: Sims in any other stack that also land in Stack B reach the
> widest audience."

→ Stack B is the **deploy audience target**, not the reference-
implementation target. Putting Phase 3's first sim — the one that
validates testkit + golden + tier-3 + CI — on Stack B would mean
validating the pipeline against the **shallowest** existing surface
(common-ts is mature, but the testkit's Python-side discipline —
mutmut, Hypothesis, pytest gates, integrity Cat 1–5 — is what's being
validated). Stack D exercises the testkit-side discipline directly.

**FACT — `docs/phases/phase-3-plan.md:46` (v8 trunk-based amendment):**

> "TRUNK-BASED DEVELOPMENT (LOCKED): All references to
> `phase-3-integration` base branch, `phase-3/task-N-*` sub-branches,
> `gh pr create`... are SUPERSEDED."

→ The execution model is trunk-based; the §6.3 task-3 prompt's branch
ceremony is superseded. This does **not** affect the stack decision but
does affect how D-B is recorded: the charter (per the matured per-sub-
phase cadence) records D-B as RESOLVED-IN-CHARTER without re-litigating
at task dispatch.

**Conclusion #4 (INFERENCE).** Stack D buys Phase 3 the **maximum
testkit-pipeline coverage** for its first SIM: the same Python /
Taichi / common-py / pytest / Hypothesis / mutmut / integrity surfaces
that every later Stack-D sim (task-6 NCA training, task-7 PINN-Poisson)
will inherit. Stack B would route Phase 3's first sim around the
testkit's central Python surface and onto common-ts — defensible at
Phase 5 deploy but counter-productive at Phase 3 pipeline-validation.
Stack D is the **plan-rationale-aligned + pipeline-coverage-aligned**
choice.

## § 5 — DECISION

**Stack D.** RESOLVED-IN-CHARTER per the dispatch prompt's decision
rule:

> "IF Stack D has a stated rationale (e.g. first-sim-validates-Taichi)
> AND no downstream consumer requires Stack B → DECISION: Stack D
> (plan governs; catalog B/E is the stale projection). Charter records
> the catalog as surfaced-not-edited (do NOT edit the catalog — that's
> catalog-v3.0 amendment work, separate track). This is the expected
> outcome."

Stated rationale: §1 above (three FACT citations + two row-schema
FACTs). Downstream consumer audit: §3 above (no Phase-3 or Phase-4
task requires Stack B). The catalog Appendix B row is **not stale
projection** — it is **tier-accessibility crosswalk** under different
column semantics (`docs/planning/bit-physics-master-catalog.md:4632`)
— and reads **co-existent** with Stack-D-reference + Stack-B-Phase-5-
web-deploy-variant per the catalog's own §5.2.2 text
(`docs/planning/bit-physics-master-catalog.md:1065`).

**Surface, not edit.** The Lenia charter records:
- D-B = **Stack D** (RESOLVED-IN-CHARTER).
- Catalog Appendix B row `Lenia | B | E | n/a` is **surfaced
  read-as-tier-crosswalk**; **NO catalog edit** (Convention M —
  catalog-v3.0 amendment is a separate track; this sub-phase does not
  amend planning artifacts).
- Catalog §5.2.2 reference-sim text (`docs/planning/bit-physics-master-catalog.md:1065`)
  **agrees with Stack D**; the apparent fork dissolves once the
  Appendix B column semantics are pinned.

## § 6 — Forward-routing

- The charter at `docs/phases/sub-phase-phase-3-lenia.md` § 5 D-class
  records D-B = Stack D + cites this audit for the evidence basis.
- The probe at `docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md`
  cites this audit in § 0 — re-anchors the §6.3 task-3 inheritance under the
  Stack-D conclusion.
- Subsequent Phase-3 sim sub-phases (rigid-body, cloth, NCA, PINN, 3DGS-MPM)
  inherit the **same investigation procedure** at their own plan-drafting:
  the §6.3-style plan-text + the catalog Appendix B row are compared under
  the column-semantics rule, and any disagreement is surfaced + decided
  on FACT. Per render-similarity charter §8: "D-B (catalog stack-drift)
  re-anchored per-sim at each dispatch" (`docs/phases/sub-phase-phase-3-render-similarity.md`).

## § 7 — No HARD RULE 2 fire

STOP-DB **not fired**. The evidence yields a clean Stack D resolution
(plan-rationale + catalog-§5.2.2 + downstream-consumer audit all
concur). No fork, no genuine ambiguity, no need to route to operator
for tie-break. The investigation is dispositive at plan-drafting time;
the operator review is normal-channel (plan-drafting landing audit).

— Audit ends —
