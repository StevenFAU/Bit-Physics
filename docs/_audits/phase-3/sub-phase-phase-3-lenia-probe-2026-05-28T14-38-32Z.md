---
date: 2026-05-28T14-38-32Z
author: phase-3 lenia plan-drafting (Claude Code)
subject: Phase 3 third sub-phase (task-3 Lenia) — ANCHOR-PROBE
verdict: CONFIRMED
head_sha: 1f7ec42a4bfa5603170d5864f91bbfa515139281
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
scope_note: >
  Probe-only artifact. Every claim is FACT (path:line, hash-grounded),
  INFERENCE (reasoned-from-FACT), or WEB (URL + fetch-time). This probe
  re-anchors the phase-3-plan §6.3 task-3 scope + §3.2 interface contracts
  + §6.0 sim-task discipline against HEAD before the charter is drafted;
  it does NOT re-author DELIVERABLES / OUT OF SCOPE content from §6.3.
  Sibling of the D-B investigation audit (FACT-cited Stack-D decision)
  and the charter (D-class leans + STOP routing).
evidence_paths:
  - docs/phases/phase-3-plan.md
  - docs/planning/bit-physics-master-catalog.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-landing-2026-05-28T14-20-30Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md
  - common/common-py/src/common_py/__init__.py
  - common/common-py/src/common_py/capture.py
  - common/common-py/src/common_py/determinism.py
  - common/common-py/src/common_py/ggui.py
  - common/common-py/src/common_py/hotreload.py
  - tools/testkit/probes/template.md
  - tools/testkit/golden/tables/
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md
evidence_hashes:
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/planning/bit-physics-master-catalog.md: sha256:8edab3d774b505585eb3b697fb02a826406de53a60723718d949e38277c875b4
  docs/architecture.md: sha256:97e70bad3f82800e0c28fb0d28d98ee81fddc5d504a81d68d66dee03d0e4703a
  docs/conventions/sub-phase-conventions.md: sha256:7519094a381928b2972cea5240c81ee18ffb49b74522fcac5152458579576b17
  docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md: sha256:1cdd1eb564bff8f2ece8c477afd2d1a7896b24a709afab34621d2a92b44ba111
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-landing-2026-05-28T14-20-30Z.md: sha256:346ee30e5ba87f8edf3f25108304c0a9dfbf1c98b31bcc2f5e1832acdab8d30b
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md: sha256:3c91965fe60b70996160e0f68c8c70d29551926863c2cc416033e68864e8d76f
  common/common-py/src/common_py/__init__.py: sha256:006c5491cc82809d42e2e2f3e30f94b5492ad29e55ca6f42b65129d83de41989
  common/common-py/src/common_py/capture.py: sha256:7fd578b39b529d3cdf275029213d19bbff57909ee4799a79da8b0c0b1b083b80
  common/common-py/src/common_py/determinism.py: sha256:c74e22b57d99b4a2898451b1f570968e981aa07bc9611c907d871175a8cf11df
  common/common-py/src/common_py/ggui.py: sha256:91afc04a68dd8477a188d90896ac632d7309fa883fc1042e60cdc7831192c8bc
  common/common-py/src/common_py/hotreload.py: sha256:7d9642a76b9b7f7ae0e5973ba9dfca099950ca1274fc7b621cfe494a6dd61c07
  tools/testkit/probes/template.md: sha256:7b2263b34db21c75c03e76b64648113539a11510631f960f5167cf15706b7152
  docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md: sha256:3f4c050db9fcbeac813736b197bd2bf646970009351c4ab6055f505a4ff4df50
---

# Phase 3 task-3 (Lenia) — anchor-probe report

> Sibling of `docs/phases/sub-phase-phase-3-lenia.md` (the charter) and
> `docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`
> (the D-B decision). This probe holds the FACTs + INFERENCEs + WEB-FACTs;
> the charter summarizes + routes. Posture per Convention #8 (grep-verify,
> no fabrication) and Convention M (HEAD wins on drift). Probe run UTC
> `2026-05-28T14-38-32Z`.

## § 0 — Mission re-statement

Determine the **third Phase-3 sub-phase**. The two Phase-3 infrastructure
roots (task-1 common-3dgs `v0.2.2-sub-phase-phase-3-common-3dgs` +
task-2 render-similarity `v0.2.3-sub-phase-phase-3-render-similarity`)
**both LANDED** on `2026-05-28`. The next sub-phase per `docs/phases/phase-3-plan.md:744`
§4.1 default order is the **first SIM** — `task-3 Lenia`. The D-B
stack-assignment fork (catalog-Appendix-B `B|E|n/a` vs plan-§6.3
`Stack D`) is **dispositively resolved as Stack D** by the sibling
investigation audit (`docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`);
this probe inherits that decision and re-anchors task-3 surfaces under it.

## § 1 — State checks (FACT)

All re-run at HEAD `1f7ec42` (Convention M — `git rev-parse HEAD` ==
`git rev-parse origin/main` at probe time; D-B investigation
commit `1f7ec42` is the parent of this probe):

| Check | Expectation | Result |
|---|---|---|
| `git rev-parse HEAD` == `git rev-parse origin/main` | match | **MATCH** `1f7ec42a4bfa5603170d5864f91bbfa515139281` |
| All SIX phase / sub-phase tags resolve | resolve | **all resolve**: `v0.0.0-phase-0`, `v0.1.0-phase-1`, `v0.2.0-phase-2`, `v0.2.1-sub-phase-lfs-architecture`, `v0.2.2-sub-phase-phase-3-common-3dgs`, `v0.2.3-sub-phase-phase-3-render-similarity` |
| `uv run python -m integrity --all --mode strict` summary | `0 HARD_FAIL / 14 SOFT_WARN` byte-identical | **PASS** — `0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 byte-equal to baseline `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` |
| verify_evidence — render-similarity (most recent 7) | 0-fail | plan-drafting 12/0, probe 16/0, fixture-investigation 18/0, stage-0 28/0, stage-1a 26/0, stage-1b 38/0, stage-1c 20/0, landing 28/0 |
| verify_evidence — common-3dgs (full 8) | 0-fail | plan-drafting 4/0, probe 0/0, stage-0-BLOCKED 7/0, stage-0 12/0, stage-1a 12/0, stage-1b 14/0, stage-1c 16/0, landing 22/0 |
| verify_evidence — sibling D-B investigation (this session) | 0-fail | **8 pass / 0 fail** |
| `I1` test (`pytest tools/integrity/tests/test_i7_no_agent_tags.py`) | green | **2/2 PASS** at this HEAD (I7 allowlist includes `v0.2.2-…` and `v0.2.3-…`) |
| § 6.3 golden paths read `tools/testkit/golden/` (K-2-at-HEAD) | no `code_verification/golden` | **CONFIRMED** — `grep -n code_verification/golden docs/phases/phase-3-plan.md docs/architecture.md` returns empty; § 6.3 lines `1349-1353` (golden tables E + derivations F) read `tools/testkit/golden/tables/` and `tools/testkit/golden/derivations/` correctly |
| `uv sync --all-packages` | clean | **clean** — workspace lockfile unchanged at HEAD; cat4 hook PASS (memory-bank confirmation: `uv sync` alone prunes; `--all-packages` preserves all members) |

**Conclusion (FACT).** Integrity baseline holds **byte-identical**;
verify_evidence holds across **15 prior audits** + the sibling D-B
investigation; I1–I7 hold; K-2 fully applied to §6.3; the Phase-3 dispatch
surface is **safe for the third sub-phase plan-drafting** to proceed.

## § 2 — Charter inheritance points (FACT)

The Lenia charter at `docs/phases/sub-phase-phase-3-lenia.md` does **NOT**
re-author DELIVERABLES / OUT OF SCOPE / ANCHOR-PROBE content from §6.3.
This section enumerates the precise inheritance citations.

| Surface | Plan citation | Inheritance posture |
|---|---|---|
| DELIVERABLES A–O (spec-ref + probe-report + TDD + impl + golden tables + derivations + Chakazul vendor + Tier-3 + Cat 1,2 + PBT + perf-ledger row + schema-corpus seed + shared files + progress.md + audit) | `docs/phases/phase-3-plan.md:1329-1366` (§6.3) | inherited unchanged; charter cites by reference |
| OUT OF SCOPE (Stack-B port, 3D Lenia, Particle/Flow/Diff variants, save-creature UX, polyring kernels) | `docs/phases/phase-3-plan.md:1310-1312` (§6.3) | inherited unchanged |
| ANCHOR-PROBE step (clone + sub-branch (v8-superseded) + base-sha + common-py view + RD-2D pattern view + golden view + probe template + references view + file probe at tools/testkit/probes/reports/lenia.md + Chakazul SHA + Quad4 + Orbium citation) | `docs/phases/phase-3-plan.md:1316-1327` (§6.3) | inherited; v8 trunk-based amendment supersedes branch ceremony (charter §1.3 re-frame) |
| VERIFICATION POSTURE (GOLDEN VALUES + bit-exact same-stack-same-hw Taichi seed + ≥2 PBT) | `docs/phases/phase-3-plan.md:1369-1373` (§6.3) | inherited; NO mutation gate (sim task — see §6.0 item 12 below) |
| § 6.0 sim-task discipline items 1-11 (cross-phase replay, tolerance-budget, append-only, server-side hooks, evidence-paths, TDD output capture, ≥2 PBT, ≥3 anchors, perf-ledger, schema-corpus seed, all 13 gates) | `docs/phases/phase-3-plan.md:1023-1052` (§6.0) | inherited unchanged for SIM tasks |
| § 3.2.4 tolerance row schema (`golden_kernel_abs=1e-6`, `golden_kernel_rel=1e-5`, `golden_trajectory_abs=1e-4`) | `docs/phases/phase-3-plan.md:426-433` | pre-baked at plan-time; charter cites by reference |
| § 3.2.5 determinism registry row (Stack D, bit-exact, same-stack-same-hw, no atomics, seed_pinned=true) | `docs/phases/phase-3-plan.md:479-486` | pre-baked at plan-time |
| § 3.2.8 spec-sheet schema (13-section template) | `docs/phases/phase-3-plan.md:539-555` + `docs/architecture.md` §8.2 | inherited; exemplar at `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md` |
| § 3.2.9 tier-3 diagnostic module interface | `docs/phases/phase-3-plan.md:556-578` | inherited; landed at `tools/diagnostics/tier3/lenia/` per § 3.2.9 |
| § 3.2.6 Sim CLI conventions | `docs/phases/phase-3-plan.md:507-528` | inherited; `just run-lenia` + `just test-lenia` per §6.3 §M |
| § 3.5 thirteen-gate reference (per spec § 3.5 v2.4) | `docs/phases/phase-3-plan.md:988-1007` (§5.4) | inherited; gates 1–13 all PASS for sim acceptance |
| § 2.4 independent-reference anchors (≥ 3 per golden table) | `docs/phases/phase-3-plan.md:1043-1044` (§6.0 item 8) + `docs/architecture.md` § 2.4 | inherited; ≥3 anchors per golden table = STOP-if-ungroundable per Convention #8 |
| § 2.14 PBT (≥ 2 invariants in spec-ref § 6) | `docs/phases/phase-3-plan.md:1042` (§6.0 item 7) + `docs/architecture.md` § 2.14 | inherited; suggested invariants in §6.3 A: `mass_approximately_conserved` + `monotone_bounds` |

## § 2.1 — Stale surfaces in §6.3 (SHIFTED-surface-only per Convention M)

| Stale surface | §6.3 cite | Re-framed under |
|---|---|---|
| `BASE BRANCH: phase-3-integration` / `YOUR BRANCH: phase-3/task-3-lenia` / `gh pr create` ceremony | `docs/phases/phase-3-plan.md:1290-1291` | v8 trunk-based amendment `docs/phases/phase-3-plan.md:46` — commit directly to `main`, no PR, no merge step |
| "Sub-phase 3.1" framing (the §1 scope-table numbering) | `docs/phases/phase-3-plan.md:1287` | matured per-sub-phase cadence — this is the **third Phase-3 sub-phase** in execution order (after common-3dgs + render-similarity); the §1 numbering is a **plan-spec ordinal**, not an execution ordinal |
| Multi-claude-session coordinator handoff | `docs/phases/phase-3-plan.md:1295-1302` | v8 single-agent dispatch — one agent role, sequential, context-spanning via `docs/_audits/phase-3/progress.md` |

Per `docs/conventions/sub-phase-conventions.md` Convention M and the
common-3dgs charter §1.3 / render-similarity charter §1.3 precedent,
these are **surface-only re-frames**; the charter records them in §1.3
without editing `phase-3-plan.md` (operator-approved + separate-commit only).

## § 3 — Public API surfaces consumed (FACT)

### § 3.1 common-py — Stack-D capture / determinism / GGUI / hot-reload

**(FACT — grep-verified at probe time)**

`common/common-py/src/common_py/__init__.py:21-31` re-exports the following
sub-modules as the canonical public surface:

```python
from . import alembic, capture, determinism, ggui, hotreload, plotting, vdb

__all__ = ["alembic", "capture", "determinism", "ggui", "hotreload", "plotting", "vdb"]
```

Lenia's task-3 consumes the following (verbatim signatures from current source):

| Sub-module | Symbol | Signature | Source line |
|---|---|---|---|
| `common_py.capture` | `Manifest` | `@dataclass class Manifest: sim:SimMeta, stack:StackMeta, config:ConfigMeta, run:RunMeta, payload:PayloadMeta, determinism:DeterminismMeta` | `common/common-py/src/common_py/capture.py:94` |
| `common_py.capture` | `Writer` | `class Writer: __init__(path:Path, manifest:Manifest); add_step(StepData); close()` | `common/common-py/src/common_py/capture.py:193` |
| `common_py.capture` | `Reader` | `class Reader: __init__(path:Path); manifest:Manifest; steps()` | `common/common-py/src/common_py/capture.py:161` |
| `common_py.capture` | `SimMeta` / `StackMeta` / `ConfigMeta` / `RunMeta` / `PayloadMeta` / `DeterminismMeta` / `StepData` | dataclasses | `common/common-py/src/common_py/capture.py:49,56,63,72,80,87,105` |
| `common_py.determinism` | `Config` | `@dataclass class Config` | `common/common-py/src/common_py/determinism.py:43` |
| `common_py.determinism` | `add_args` | `def add_args(parser:argparse.ArgumentParser) -> None` | `common/common-py/src/common_py/determinism.py:48` |
| `common_py.determinism` | `from_args` | `def from_args(args:argparse.Namespace) -> Config` | `common/common-py/src/common_py/determinism.py:63` |
| `common_py.determinism` | `set_taichi_deterministic` | `def set_taichi_deterministic(config:Config, *, arch:str="cpu") -> None` | `common/common-py/src/common_py/determinism.py:71` |
| `common_py.ggui` | `FKeyDispatcher` | Taichi GGUI F-key workaround | `common/common-py/src/common_py/ggui.py:42` |
| `common_py.hotreload` | `watch_and_reexec` | `def watch_and_reexec(paths:Iterable[Path], debounce_ms:int=250) -> None` | `common/common-py/src/common_py/hotreload.py:19` |

**(INFERENCE).** Lenia's Stack-D forward loop consumes:
- `capture.Writer` (write the canonical `orbium-256sq-seed42-step1000` capture for Tier-3 + golden-trajectory).
- `determinism.set_taichi_deterministic(config, arch="cpu")` (per §6.3 VERIFICATION POSTURE — bit-exact same-stack-same-hw via Taichi seed + no atomics in forward conv; `arch="cpu"` is the deterministic default per the common-py 4.6 audit memory; GPU determinism is an audit re-characterization, not a Stage-1b probe item).
- `ggui.FKeyDispatcher` (interactive viewer for Orbium glider — UX-only; not gated).
- `hotreload.watch_and_reexec` (development convenience; not gated).

### § 3.2 testkit golden / tier-3 / probes (FACT — directory presence verified)

| Surface | Path | Status at HEAD |
|---|---|---|
| Golden tables root | `tools/testkit/golden/tables/` | **EXISTS** (contains `agent-based/`, `closed-form/`, `cubic-spline-kernel.json`, `hybrid-pg/`, `lattice/`, `particle-fluids/`) — Lenia's task-3 lands `continuous-ca/` subtree or `lenia-kernel.json` / `lenia-orbium-trajectory.json` per §6.3 E (Stage 1b decides the leaf shape per existing-convention discovery) |
| Golden derivations root | `tools/testkit/golden/derivations/` | **EXISTS** — Lenia's task-3 lands `lenia-kernel.md` per §6.3 F |
| Tier-3 diagnostics | `tools/diagnostics/tier3/` | **MISSING** (only `diagnostics/tier1/` + `diagnostics/tier2/` exist) — first creation by this sub-phase per §3.2.9 + §6.3 H |
| Probe template | `tools/testkit/probes/template.md` | **EXISTS** at the canonical path; reports `tools/testkit/probes/reports/lenia.md` is a Stage-1a/1b deliverable |
| Schema-corpus root | `tests/fixtures/legacy-captures/` | **EXISTS** (12 legacy-capture placeholders + `phase-3-common-3dgs.h5` + `.json` per common-3dgs Stage 1c) — Lenia adds `phase-3-lenia.h5` + sidecar per §6.0 item 10 |
| Failing-tests-evidence root | `tools/testkit/failing-tests-evidence/` | **EXISTS** (carries common-3dgs + render-similarity precedents) — Lenia adds `lenia-<UTC>.txt` per §6.3 C + §6.0 item 6 |
| Determinism registry | `tools/testkit/determinism/registry.toml` | **EXISTS** (filename probe-discovered per §0.3) — Lenia adds `[continuous-ca.lenia]` row per §3.2.5 |
| Equivalence tolerance | `tools/testkit/equivalence/tolerance.toml` | **EXISTS** — Lenia adds `[continuous-ca.lenia]` rows per §3.2.4 |
| Equivalence tolerance-budget | `tools/testkit/equivalence/tolerance-budget.toml` | **EXISTS** (Phase-3 carryover opened at common-3dgs Stage 0; re-verified-only by render-similarity Stage 0) — verify Lenia's `golden_kernel_abs=1e-6` / `golden_kernel_rel=1e-5` / `golden_trajectory_abs=1e-4` rows fit within `[budgets.continuous-ca.golden]` cap before commit (per §6.0 item 2) |

### § 3.3 Phase 4 + downstream consumers (FACT — grep-verified)

`grep -n Lenia docs/phases/phase-4-plan.md` returns **NO MATCH**. Phase 4
introduces no Lenia consumer. Phase-3-plan §3.1 deliverable map at
`docs/phases/phase-3-plan.md:325` marks task-3 as `(terminal)` — no
downstream Phase-3 task imports `continuous-ca/lenia/` as a code
dependency. This confirms the D-B investigation §3 (`docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md` § 3 Conclusion #3).

## § 4 — Upstream citations (FACT + WEB)

### § 4.1 Chakazul/Lenia — vendoring target

**(WEB-FACT, fetched 2026-05-28T14-38-32Z via GitHub API)**

| Attribute | Value |
|---|---|
| Repository | `github.com/Chakazul/Lenia` |
| Default branch | `master` |
| Pinned SHA | `adfc542939266de7f4bb7ebb552e8499701ee107` (commit message: "upload LeniaF.py 'free kernel' version"; author: Bert Chan; author date 2022-03-15T17:08:40Z) |
| License | **MIT** (SPDX) |
| Status | Active (not archived, not disabled) |
| Stargazer count | 3,765 |
| Security advisories | none present in repository security-advisories array |

**Cross-check (FACT — plan §2.18 ratified Stage-0 pin):**
`docs/phases/phase-3-plan.md:300-308`:

```
- Repo: https://github.com/Chakazul/Lenia                               # task-3 lenia
  SHA: adfc542939266de7f4bb7ebb552e8499701ee107
  Released: default-branch HEAD (master). Latest release tag v3.5 is 2020-10-13 (>12 months); per
    the pinning rule, default-branch HEAD is used rather than the stale release.
  License: MIT
  License-note: permissive. Vendored at references/Chakazul-Lenia/ per §3.1 deliverable map
    (task-3 produces it); Chan 2019 cited in spec §12.
  Security: clean (2026-05-28; repository security-advisories array empty)
  Fetched: 2026-05-28T00:54Z
  Citation-pointer: §3.1 references/Chakazul-Lenia/ + references/Chakazul-Lenia/manifest.yaml (task-3)
```

→ **SHA byte-equal** between the §2.18 Stage-0 pin (fetched
`2026-05-28T00:54Z`) and this probe's re-fetch (`2026-05-28T14:38:32Z`).
**No drift** in the 14 hours between the two fetches; **STOP-PIN not
fired**. The vendoring lift at Stage 1b uses this exact SHA.

### § 4.2 Anchor-grounding probes (Convention #8 — STOP-if-ungroundable at Stage 1b)

The Stage 1b vendoring step must grep-cite the following to the vendored
source — they are **NOT** authored from memory and **NOT** authored from
secondary sources. The charter flags each as STOP-D-ANCHOR conditional:

| Anchor | Citation target | Stage-1b probe |
|---|---|---|
| Quad4 kernel formula `K(r) = (4r(1-r))^4` | Chakazul/Lenia source file:line (LeniaF.py or canonical kernel definition file in the vendored tree at SHA `adfc542939266de7f4bb7ebb552e8499701ee107`) | grep-cited; if not literally present in the named form, surface STOP-D-ANCHOR (Convention #8 — no fabrication) |
| Orbium unicaudatus preset | Chakazul/Lenia `animals.json` (verbatim entry at SHA `adfc542939266de7f4bb7ebb552e8499701ee107`) | grep-cited; the exact JSON object becomes a test fixture |
| Golden anchor #1 — kernel at `r=0` (peak K(0)) | mathematical FACT — `K(0) = (4·0·(1-0))^4 = 0`; **NOT** a peak. The §6.3 E text saying "r=0 (peak K(0))" needs Stage-1b re-evaluation. Quad4 has peak at `r=0.5` (where `4r(1-r)=1`, so `K(0.5)=1`); the §6.3 plan text appears to be wrong on this. Surface to operator at Stage 1b. | Stage-1b probe re-grounds against Chakazul's canonical kernel-shape derivation; the THREE anchors are likely `r=0` (`K=0`, boundary), `r=0.5` (`K=1`, peak), `r=1` (`K=0`, compact-support boundary) — but the charter does NOT fix the values; Stage 1b decides on-evidence |
| Golden anchor #2 — kernel at `r=0.5` (peak K(0.5)=1 for Quad4) | hand-derivation + Chakazul reference notebook (if discoverable in the vendored tree at the pinned SHA) | grep-cited or hand-derivation-cited; STOP-D-ANCHOR if neither |
| Golden anchor #3 — kernel at `r=1` (`K(1) = (4·1·0)^4 = 0`, compact-support boundary) | mathematical FACT | hand-derivation in `tools/testkit/golden/derivations/lenia-kernel.md` |

**(INFERENCE — surfaced for the charter).** The §6.3 plan-text characterizes anchor-1 as "r=0 (peak K(0))" but the Quad4 formula evaluates to `K(0) = 0` (not a peak); the peak is at `r=0.5`. The charter records this as a §0.3 SHIFT-from-discovered (`docs/phases/phase-3-plan.md:0.3` — existing-convention takes precedence over §3.2 prescriptions; analogously, the FACTual evaluation of Quad4 takes precedence over the §6.3 prose). The plan-text edit is NOT done here (architecture-spec authority via plan-3-plan.md is the locus; the charter records SHIFTED-surface-only).

## § 5 — Public types / functions / structs exported

**Planned at Stage 1b (per §6.3 D + Phase-1 RD-2D exemplar):**

| Symbol | Module | Signature shape |
|---|---|---|
| `LeniaConfig` (dataclass) | `continuous_ca.lenia.config` | `kernel:str, mu:float, sigma:float, dt:float, grid:int, R:int, seed:int` |
| `LeniaSim` (class) | `continuous_ca.lenia.sim` | `__init__(config:LeniaConfig); step() -> None; capture() -> common_py.capture.StepData` |
| `quad4_kernel` (function) | `continuous_ca.lenia.kernel` | `def quad4_kernel(r:np.ndarray) -> np.ndarray: return np.power(4*r*(1-r), 4) * (r<=1)` — grep-citation to vendored Chakazul source at Stage 1b |
| `growth_lenia` (function) | `continuous_ca.lenia.growth` | growth function (Lenia bell-curve growth) |
| CLI entry — `python -m continuous_ca.lenia` per §3.2.6 | `continuous_ca/lenia/__main__.py` | flags: `--seed`, `--steps`, `--grid`, `--preset`, `--out`, `--tolerance-key continuous-ca.lenia`, `--determinism-arch cpu` |

The exact module structure is a Stage 1b decision (per §0.3 existing-
convention precedence); the charter does not lock module layout.

## § 6 — Test-fixture paths (planned)

Per §6.3 deliverables map (`docs/phases/phase-3-plan.md:1329-1366`):

| Path | Stage | Type |
|---|---|---|
| `docs/sim-specs/continuous-ca/lenia/spec-ref.md` | 1a (stub) → 1b (full 13-section) | spec sheet per §3.2.8 + arch.md §8.2 — `mass_approximately_conserved` + `monotone_bounds` PBT invariants in §6 |
| `tools/testkit/probes/reports/lenia.md` | 1a or 1b | probe report per `tools/testkit/probes/template.md` |
| `continuous-ca/lenia/python/tests/` (RED TDD) | 1a | failing tests + `tools/testkit/failing-tests-evidence/lenia-<UTC>.txt` + sha256 hash in commit footer per §6.0 item 6 |
| `continuous-ca/lenia/python/` (impl) | 1b | Taichi forward conv + Orbium preset + capture I/O + CLI |
| `tools/testkit/golden/tables/lenia-kernel.json` | 1b | K(r) at canonical radii with ≥3 independent-reference anchors per §6.0 item 8 + §2.4 |
| `tools/testkit/golden/tables/lenia-orbium-trajectory.json` | 1b | field at canonical steps, 64² grid (per §6.3 E) |
| `tools/testkit/golden/derivations/lenia-kernel.md` | 1b | hand-derivation of Quad4 kernel + Chakazul source citation |
| `references/Chakazul-Lenia/` (vendored) + `manifest.yaml` | 1b | pinned at SHA `adfc542939266de7f4bb7ebb552e8499701ee107`, license MIT, security clean |
| `tools/diagnostics/tier3/lenia/` (NEW tree) | 1b | first Phase-3 tier-3 module; landing creates `tools/diagnostics/tier3/` tree |
| `tools/testkit/property/sims/lenia/` | 1b | ≥2 PBT invariants per §2.14 + §6.0 item 7; Hypothesis examples DB at `.hypothesis/` committed |
| `tools/testkit/equivalence/tolerance.toml` (`[continuous-ca.lenia]`) | 1b | per §3.2.4 pre-baked row schema; verify within tolerance-budget cap |
| `tools/testkit/determinism/registry.toml` (`[continuous-ca.lenia]`) | 1b | per §3.2.5 pre-baked row (Stack D, bit-exact, same-stack-same-hw, no atomics, seed_pinned=true) |
| `docs/perf-ledger.md` (row append) | 1b | `lenia | python (Taichi) | orbium-256sq-seed42-step1000 | <wall_clock> | <hw-id> | <commit-sha> | <date> | baseline` per §6.0 item 9 |
| `tests/fixtures/legacy-captures/phase-3-lenia.h5` + sidecar `.json` | 1b | schema-corpus seed per §6.0 item 10 + §2.7/§2.12; LFS-pointered, R2-mirrored — exercises lfs-architecture pipeline (see §7 below) |
| `CHANGELOG.md`, `docs/glossary.md` (Lenia, kernel-convolution CA, Quad4, growth fn), `justfile` (`run-lenia`, `test-lenia`), `.github/workflows/build-py.yml` or `.github/workflows/python-strict.yml` (`test-lenia` job per §3.2.10) | 1b | shared files per §6.3 M |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-<N>-<UTC>.md` (1a, 1b, 1c, landing) | each stage | stage audits per §5.1 + §6.0 item 5 (`evidence_paths:` + `evidence_hashes:` mapping per cat1 rules) |
| `docs/_audits/phase-3/progress.md` (append-only) | each stage | per-stage entries per §3.5 + the matured per-sub-phase cadence |

## § 7 — Sim-cadence open items (charter resolves with leans + decision-by)

### § 7.1 D-MUT-SCOPE — does a SIM carry a mutation gate?

**(FACT — §6.0 item 12 normative scope, `docs/phases/phase-3-plan.md:1054-1058`):**

> "12. **Mutation-testing thresholds** (spec § 2.13 + v9 amendment):
> tasks that touch **testkit-adjacent modules** (common-3dgs at task-1,
> render-similarity at task-2, common-warp at task-9) include mutation-
> score generation as part of their acceptance."

→ Lenia (task-3) is a SIM, not testkit-adjacent. The §6.0 item 12 scope
**does not extend** to SIMs.

**(FACT — §6.3 VERIFICATION POSTURE at `docs/phases/phase-3-plan.md:1369-1373`):**

> "VERIFICATION POSTURE:
> - Code verification: GOLDEN VALUES (with independent-reference anchors).
> - Determinism: bit-exact same-stack-same-hw via Taichi seed; no atomics in forward conv.
> - Property-based: ≥ 2 invariants per spec § 2.14."

→ No mutation gate cited. The sim is verified by **golden + PBT +
determinism**, not mutation.

**Lean: NO mutation stage for SIMs.** Stage 1c is verdict-landing only
(golden-anchor verification + PBT-green + determinism-measured +
legacy-capture seed produced + perf-ledger row appended).

**Decision-by:** plan-drafting (RESOLVED-IN-CHARTER on FACT-citation;
no Stage-1b probe needed).

### § 7.2 D-FFT — convolution path

**(FACT — §6.3 D at `docs/phases/phase-3-plan.md:1344-1346`):**

> "- Real-space Taichi-kernel convolution (default).
> - FFT only if stable Taichi-compatible FFT path exists (probe)."

→ Real-space default; FFT only if Stage-1b probe finds a stable Taichi
FFT path. Per `docs/architecture.md:962`: "Taichi has explicit determinism
flags. Reproducibility within Taichi is well-supported." Taichi 1.7+
ships an FFT module but its bit-exactness across runs is not documented
in the determinism-flag set (`docs/architecture.md` lists Taichi's
deterministic surface as "explicit determinism flags" without enumerating
the FFT class).

**Lean: real-space default**; FFT only if stable Taichi-compatible path
exists AND is bit-exact same-stack-same-hw (charter §6 R-FFT records
the conditional).

**Decision-by:** Stage 1b probe.

### § 7.3 D-DET — determinism class

**(FACT — `docs/phases/phase-3-plan.md:479-486` § 3.2.5 row schema):**

```toml
[continuous-ca.lenia]
stack = "D"
class = "bit-exact"
scope = "same-stack-same-hw"
atomic_ops = "none"
subgroup_ops = "none"
seed_pinned = true
```

→ Pre-baked at plan-time. Charter records D-DET as RESOLVED-IN-CHARTER +
MEASURE at Stage 1b (precedent: render-similarity D-DET — lean held at
plan-drafting, measured-and-held at Stage 1b; landed audit at
`docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md`).

**Lean: bit-exact same-stack-same-hw via Taichi seed.** No atomics in
forward conv (per §6.3). `common_py.determinism.set_taichi_deterministic(config, arch="cpu")` at impl.

**Decision-by:** Stage 1b MEASURE.

### § 7.4 D-TAG — intermediate tag at Stage 2?

**(FACT — `docs/conventions/sub-phase-conventions.md` §D.2 + the
common-3dgs + render-similarity precedent.)**

§D.2 default is **YES** for sub-phases that introduce **external
vendoring** OR **durable sim architecture**. Lenia meets both:
- External vendoring: Chakazul/Lenia at SHA `adfc542939266de7f4bb7ebb552e8499701ee107`,
  MIT (per §4.1 above) → strong (a).
- Durable sim architecture: first SIM in Phase 3, first `continuous-ca/lenia/`
  package, first `tools/diagnostics/tier3/lenia/` tree, first Lenia
  spec-sheet at `docs/sim-specs/continuous-ca/lenia/spec-ref.md` → strong (b).

**Lean: YES `v0.2.4-sub-phase-phase-3-lenia`** (operator-pushed; agent
does NOT push tags per I7; I7 allowlist extension at Stage 2 mirroring
the common-3dgs `c761aa9` + render-similarity `596eb73` precedents).

**Decision-by:** Stage 2 (operator ratifies).

**Surface (INFERENCE — flagged for charter §8 forward-routing).** The
operator may have switched to **phase-close-only tagging** since the
render-similarity Stage-2 close; the charter notes this as
operator-pending but defaults the lean to **YES** per the immediate
precedents (`v0.2.2`, `v0.2.3` both pushed by operator on
2026-05-28). No D-B-style fork; lean held pending Stage-2 operator
review.

### § 7.5 Sim stage shape (the matured per-sub-phase cadence)

Per `docs/_audits/phase-3/progress.md` showing the common-3dgs +
render-similarity 5-stage flow + `docs/phases/sub-phase-phase-3-render-similarity.md` § 2:

```
plan-drafting ─ probe + charter + this audit + progress entry
   ↓
Stage 0 ─ pre-flight + integrity baseline + verify_evidence sweep + cross-phase replay (--prior-phase phase-2)
   ↓
Stage 1a ─ scaffold + RED tests + failing-tests-hash + Chakazul SHA re-verify + Quad4 anchor probe + Orbium preset citation
   ↓
Stage 1b ─ Taichi impl + golden values + ≥3 anchors per table + Tier-3 + determinism MEASURE + ≥2 PBT + shared files + 13-gate (gates 1-13) + legacy-capture .h5 seed + perf-ledger row
   ↓
Stage 1c ─ verdict landing (golden-anchor verification + PBT-green + determinism-measured + legacy-capture seed verified + perf-ledger row anchored) — NO mutation gate (D-MUT-SCOPE NO)
   ↓
Stage 2 ─ sub-phase landing audit + I7 allowlist + closing sweep + operator-tag proposal
```

**Lean: this shape**, modeled on the **Phase-1 sim exemplar** RD-2D
spec-ref structure (`docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md` —
the 13-section template per arch.md §8.2) and the matured Phase-3
sub-phase cadence (common-3dgs + render-similarity). The INFRA sub-phases
are **NOT** the template (mutation gate at Stage 1c is infra-only); the
RD-2D spec-ref is.

**Decision-by:** charter §2 (RESOLVED-IN-CHARTER).

## § 8 — Schema-corpus + LFS pipeline (FACT — first SIM exercises it)

**(FACT — `docs/phases/phase-3-plan.md:1361-1362` §6.3 L):**

> "L. **Schema-corpus seed** at `tests/fixtures/legacy-captures/phase-3-lenia.h5`
> + sidecar (spec § 2.7/2.12 + §6.0 item 10): copy the canonical capture
> for Phase 4 WU-A's schema-bump round-trip."

→ Lenia produces a `.h5` legacy-capture seed. **Render-similarity did
NOT** (infra task; no sim deliverable L). **Common-3dgs DID**
(`tests/fixtures/legacy-captures/phase-3-common-3dgs.h5` per common-3dgs
Stage 1c). Lenia is **the first SIM** in Phase 3 to exercise the
**lfs-architecture pipeline** end-to-end (common-3dgs was infra; common-3dgs's
`.h5` is the only PRIOR Phase-3 `.h5` LFS push since the lfs-architecture
sub-phase landed at `v0.2.1`).

**(MEMORY-INFORMED FACT — [[bit-physics-lfs-architecture-stage-1c-landed]] +
[[phase-3-common-3dgs-sub-phase-landed]]):** Lenia's `.h5` push at Stage 1b
needs:
- R2 credentials present in agent session (operator has confirmed these
  for this session per the dispatch prompt's preamble).
- `git -c lfs.standalonetransferagent= push` one-shot for GitHub-LFS
  pre-receive (GitHub's pre-receive doesn't see R2-only objects).
- Separate `git lfs push --object-id --stdin origin` for R2 sync.

The charter §6 records **STOP-LFS** as a conditional (mirrors
`docs/phases/sub-phase-phase-3-common-3dgs.md` precedent; if R2 creds
fail at Stage 1b, surface to operator + do NOT revert).

**(INFERENCE — flagged for charter §1.1).** The dispatch prompt's
"R2 CREDENTIALS: present in-session" + "Lenia DOES produce a legacy-
capture .h5 seed (it's a sim — §6.3 deliverable L), so the LFS/R2 path
WILL be exercised at execution" is **load-bearing for Stage 1b**. The
charter must flag this loudly per CONTEXT-BRIDGE §6.3 — friction here
predicts friction in every later SIM (rigid-body, cloth, NCA, PINN,
3DGS-MPM all produce `.h5` seeds). If R2/LFS friction surfaces here, the
sub-phase records it as a **portfolio-scale signal**, not a local issue.

## § 9 — FACT / INFERENCE tagging summary

- § 1 — all FACT (state-check outputs, hash-grounded).
- § 2 — all FACT (line-cited from `docs/phases/phase-3-plan.md` at hash `f16a4a2e…`).
- § 2.1 — all FACT (line-cited).
- § 3.1 — all FACT (grep-verified; common-py source hashes at probe time).
- § 3.2 — all FACT (filesystem-verified).
- § 3.3 — all FACT (`grep -n Lenia docs/phases/phase-4-plan.md` returns no-match).
- § 4.1 — WEB-FACT (GitHub API fetched 2026-05-28T14-38-32Z) + FACT cross-check against §2.18 pin.
- § 4.2 — INFERENCE on the §6.3 prose "peak K(0)" mismatch (mathematical FACT: `K(0) = 0` for Quad4), surfaced for Stage 1b. Charter records as §0.3 SHIFT-from-discovered.
- § 5 — INFERENCE (planned symbols; Stage 1b grounds in implementation).
- § 6 — FACT (path schedule cited from §6.3 deliverable map).
- § 7.1–§7.5 — FACT-cited leans (each cites the plan line; decision-by stage named).
- § 8 — FACT (§6.3 L) + memory-informed FACT (lfs-architecture mechanism per [[bit-physics-lfs-architecture-stage-1c-landed]]).

## § 10 — Forward-routing

- Charter at `docs/phases/sub-phase-phase-3-lenia.md` § 5 records D-class
  leans with each citing this probe as the evidence base.
- Plan-drafting landing audit at `docs/_audits/phase-3/sub-phase-phase-3-lenia-plan-drafting-2026-05-28T14-38-32Z.md`
  cites this probe in `evidence_paths`.
- Stage 1a reads this probe + the D-B investigation + the charter.

— Probe ends —
