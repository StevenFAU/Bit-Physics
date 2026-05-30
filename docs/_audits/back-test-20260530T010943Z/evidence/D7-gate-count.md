# D7 — Gate-count & amendment-seam drift (HEAD 4ee0ea9)

Pinned SHA `4ee0ea9`. READ-ONLY back-test. Universe partitioned per charter §3:
**live docs** (spec / planning / phases / conventions / sim-specs) get per-token verdicts;
**`docs/_audits/`** (append-only frozen records) verified as a class (a count is correct iff it
matched the gate-model at audit-time). Method inherited from prior D7
(`back-test-20260529T124759Z/evidence/D7-gate-count.md`); re-confirmed at HEAD; tasks 5–8 docs are NEW.

Gate model (architecture.md §3.5 + Appendix D §D.6 + changelog): **10** gates pre-v2.4 → **13** at v2.4
(legacy 1–10 + 11 PBT + 12 perf-ledger + 13 failing-tests-replay) → **14** for Phase-2 cross-stack ports
(13 + gate-14 cross-stack equivalence, v6 amendment of `phase-2-cross-stack-replication.md`).
Phase-1 sims = 13 (bootstrap 1–3, back-fill 4–13). Phase-3 sims = 13, **plus** gate-14 ONLY when the sim
is dual/cross-stack (neural-ca).

---

## 1. Denominator (committed gate-count token universe)

Grep: `grep -rniE '(ten|eleven|twelve|thirteen|fourteen)[- ]gate|1[0-4][- ]gate' docs/`

| Partition | grep-lines | genuine tokens | false-pos | disposition |
|---|---:|---:|---:|---|
| LIVE docs (`--exclude-dir=_audits`) | 153 | 152 | 1 | per-token classified below |
| `docs/_audits/**` | 150 | 150 | 0 | class-verified (frozen) |
| **TOTAL** | **303** | **302** | **1** | — |

Component counts (a single line may carry both a word-form and a numeric-form token):
- LIVE word-form `(ten…fourteen)[- ]gate` = 56 ; LIVE numeric `1[0-4][- ]gate` = 98 ; combined unique LIVE lines = 153.
- AUDITS word-form = 30 ; AUDITS numeric = 122 ; combined unique audit lines = 150.

**False positive (1):** `docs/phases/phase-1-plan.md:117` — "§ 2.10 gate sequence" — the regex matched the
section reference `2.10` against `1[0-4][- ]gate`; this is NOT a gate-count token. Excluded from the
per-token verdict set. (152 genuine LIVE tokens remain.)

**LIVE genuine-token distribution by canonical value** (`grep -o`, value-normalized, 2.10 dropped):
`13`=76, `thirteen`=43, `14`=27, `eleven`=11, `ten`=7, `fourteen`=4, `10`=1.
(169 match-substrings across 152 genuine lines — 17 lines carry two matches such as "expanded from 10 to 13".)

**Accounting:** 153 LIVE grep-lines = 1 false-positive + 11 `eleven` tokens (Finding M-16, §2) + 7
`ten`/1 `10` tokens (Findings M-10/m-11 + 6 correct-frame, §2) + 134 `13`/`thirteen`/`14`/`fourteen`
tokens. Every LIVE token is in one of the four buckets below; checked == denominator.

LIVE per-file counts (top): phase-2-cross-stack-replication.md 21, phase-3-plan.md 12,
bit-physics-master-catalog.md 11, then sub-phase-* / architecture.md (full breakdown in
`D7-gate-count-raw.txt`).

**`_audits/` class verdict:** 150 frozen tokens. Value distribution `13`=79, `14`=39, `thirteen`=28,
`fourteen`=2, `10`=2, `12`=1, `eleven`=1 — era-consistent (Phase-1/3 sim landings say 13/thirteen,
Phase-2 ports say 14, the lone `eleven`/two `ten` are pre-v6 / historical-frame strings frozen at
their audit dates). No internally-contradictory audit count observed. NO per-token re-litigation
(charter §3 partition rule).

---

## 2. Re-tested findings (verdict table)

| ID | Finding | HEAD location | Verdict | Severity |
|---|---|---|---|---|
| M-16 (SEED-1) | stale "eleven-gate" live call-sites | `phase-2-cross-stack-replication.md` 477,1512,1697,2282,2639 | **LIVE — confirmed unchanged** | MAJOR |
| M-16b | stale "eleven-gate" contrast sites (elevated by prior D7) | same file 1759,1789 | **LIVE — confirmed** | MINOR |
| M-10 | "ten-gate formulation … historical contract Phase 0/1" | `architecture.md:854` | **LIVE — confirmed** | MINOR (→D9) |
| m-11 | changelog "ten-gate criteria" (accurate as-of-v2.3) | `architecture.md:40` | **LIVE — confirmed; accurate-with-staleness-risk** | MINOR |

### M-16 totality (re-proven at HEAD)
All 11 `eleven`/`11`-gate tokens in LIVE docs live in `phase-2-cross-stack-replication.md`:

| line | role | verdict |
|---|---|---|
| 477 | "(the §1.5 **eleven-gate** criteria) catches defects" | STALE call-site |
| 1512 | "§1.5 (**eleven-gate** acceptance criteria — your pass/fail bar)" | STALE call-site |
| 1697 | "Fill in the **eleven-gate** table with PASS/FAIL" | STALE call-site (sharpest — that table no longer exists; live bar is §1.5.1 fourteen-gate) |
| 2282 | "§1.5 (the **eleven-gate** criteria each prior stage gated against)" | STALE call-site |
| 2639 | "(the §1.5 **eleven-gate** criteria) catches defects" | STALE call-site |
| 1759 | "not the **eleven-gate** sim-port criteria" | STALE-contrast (wrong count) |
| 1789 | "not the **eleven-gate** sim-port set" | STALE-contrast |
| 16 | "GATE COUNT EXPANDED FROM 11 TO 14" | CORRECT (amendment header) |
| 491 | "pre-v6 framing as 'eleven gates' is **superseded**" | CORRECT (superseded framing) |
| 493 | "§1.5.1 … was eleven gates pre-v6" | CORRECT (header framing) |
| 2855 | "was 'eleven gates' pre-v6 when spec §3.5 listed ten" | CORRECT (inference framing) |

5 actionable stale call-sites (== M-16's five, exactly) + 2 stale-contrast + 4 correct-framing = 11, all
enumerated. **Remediation:** at 477/1512/1697/2282/2639 replace `eleven-gate` → `fourteen-gate` (live §1.5.1
v6 bar); at 1759/1789 replace `eleven-gate sim-port` → `fourteen-gate sim-port`. NO source mutation performed
(read-only back-test).

### `ten`/`10`-gate LIVE tokens (8) — historical-frame check
- CORRECT (explicit pre-v2.4 / v2.0–v2.3 framing): `phase-3-plan.md:988`; `phase-2-cross-stack-replication.md`
  2728, 2734, 2749, 2791, 2855. (The `phase-1-plan.md:117` "2.10 gate" hit is the false positive, NOT a ten-gate token.)
- **M-10 / F-D7-2 [MINOR → D9]:** `architecture.md:854` "earlier **ten-gate formulation** in Appendix D §D.6
  is preserved as the historical contract for Phase 0 / Phase 1 sims" — tension with §D.6 (architecture.md:2585-2608,
  thirteen gates) + §11.7 (Phase-1 ships gates 1–3, back-fills 4–13). No Phase-0/Phase-1 sim ever ran a literal
  1–10 contract (Phase-0 RD-2D shipped 13; Phase-1 locks 1–3). The "preserved historical contract" framing
  describes a contract no sim used. Reconcile against Phase-0/Phase-1 landing audits in D9.
- **m-11 / F-D7-1 [MINOR/lead]:** `architecture.md:40` v2.3 changelog summarizes Appendix D as "…**ten-gate
  criteria**…". Accurate **as-of-v2.3**, but live §D.6 (architecture.md:2587 "expanded from 10 to 13 … v2.4")
  is thirteen-gate. A reader of the changelog line could infer a stale current count. Remediation: annotate
  "(ten-gate at v2.3; expanded to thirteen at v2.4)".

### Other LIVE 13/14-gate tokens (134) — CORRECT-for-context
Each `13`/`thirteen` (Phase-1 + Phase-3 sims) and `14`/`fourteen` (Phase-2 ports) token matches its phase's
gate model on inspection. No additional stale-count token surfaced. (Prior D7's sub-lead at
`sub-phase-phase-3-common-3dgs.md:161` "thirteen gates pass" for an infrastructure task remains a D9 scope
question, not a gate-COUNT drift.)

---

## 3. New semantic checks (tasks 5–8 focus)

### Check 1 — The canonical 13-gate list — **VERDICT: PASS (exactly 13 at HEAD)** [severity: NONE]
Canonical list at `docs/architecture.md:2585-2608` (Appendix D §D.6 "Layer 4 acceptance gates per spec §3.5").
Header (2587): "expanded from 10 to 13 gates with the v2.4 amendment." Enumerated exactly 13:

Gates 1–10 (legacy; Phase 0/1):
1. Spec sheet committed (full §6 verification posture).
2. Pre-implementation probe report committed.
3. Acceptance test suite committed and *failing*, verbatim failing pytest output captured + hashed (v2.4 expansion).
4. MMS/golden-value tests pass (Cat 3), ≥3 independent-reference anchors per golden table (v2.4 expansion; §2.4).
5. Tier 1 diagnostics pass.
6. Category-specific Tier 2 diagnostics pass.
7. Citation chain resolves (Cat 1).
8. Public API resolves (Cat 2).
9. Ships with a capture file the testkit can replay.
10. Determinism declaration consistent with capture file.

Gates 11–13 (Phase 2 onward; back-fillable for Phase-1 sims at Phase-2 open):
11. Property-based tests of declared invariants pass (§2.14).
12. First-landing wall-clock recorded in `docs/perf-ledger.md` (§2.15).
13. Phase-landing audit replays the pre-impl commit's failing tests, confirms recorded output-hash matches.

Cross-refs to §D.6 as the single source of truth at architecture.md:1588, :1984, :2398 all say "thirteen-gate".
Gate-14 is NOT in this canonical set (§3, Check 2). PASS.

### Check 2 — gate-14 applicability per sim — **VERDICT: PASS (correctly scoped)** [severity: NONE]
gate-14 (cross-stack equivalence) is NOT a spec gate (spec has 13: §3.5/§D.6); it is a Phase-2/3 cross-stack
CI/local convention (per §2.6/§9.3 + §3.6). Among Phase-3 tasks 1–8, only **neural-ca** is dual-stack
(D PyTorch train + B WGSL infer). Disposition per sim doc:

| sim (task) | stack | gate-14? | evidence |
|---|---|---|---|
| neural-ca (6) | DUAL (D+B) | **YES** | `sub-phase-phase-3-neural-ca.md` §7 (:367 "13 gates PER STACK + gate-14"); :27/:32/:225/:449; realized as render-similarity on committed offline captures (NO WGSL-in-CI, §7.8) |
| lenia (3) | single (D) | **NO** | `sub-phase-phase-3-lenia.md:314,354` (gate-14 cited only as smoke-stack-e DET precedent) |
| ising-classical | single (B) | **NO** | `sub-phase-phase-3-ising-classical.md:191,309,543` (precedent only) |
| rigid-body (4) | single (E) | **NO** | `sub-phase-phase-3-rigid-body.md:362-364` ("no gate-14 … single-stack Stack-E terminal sim") |
| mass-spring-cloth (5) | single (C) | **NO** | `sub-phase-phase-3-mass-spring-cloth.md:473-475,494,633` ("single-stack terminal … Gate-14: N/A") |
| pinn-poisson (7) | single (E+torch) | **NO** | `sub-phase-phase-3-pinn-poisson.md:54,59,269` ("NO gate-14; absent from Phase 1/2") |
| 3dgs-mpm (8) | single (E) | **NO** | `sub-phase-phase-3-3dgs-mpm.md:391-393,99` ("Single-stack ⇒ no gate-14"; render-similarity is the gate-4 Cat-3 golden, NOT gate-14) |

`phase-3-plan.md:20` governs: "thirteen gates … Plus cross-stack equivalence Gate 14 for tasks that touch
sims also present in Phase 1/2." neural-ca carries gate-14; all six single-stack sims explicitly and
correctly do NOT. The shared "smoke-stack-e gate-14" string in the single-stack docs is a determinism
re-characterization PRECEDENT cite, NOT a gate-14 assignment — verified per-line. PASS.

### Check 3 — mutation-target applicability — **VERDICT: SCOPE-EXPANSION beyond spec §2.13 enumeration, internally sanctioned, advisory/non-blocking** [severity: MINOR]
`tools/testkit/mutation/mutmut-config.toml` lists **17** targets:
- **7 spec-enumerated (§2.13 / §D)** testkit+integrity surfaces: capture, code_verification_mms, golden,
  determinism, equivalence, property, cat4_draft_time. (§2.13 §587 "Required coverage" lists 6 surfaces +
  `property` is the §2.14 invariant harness — all Layer-0/Layer-1 tooling.)
- **2 Phase-3 testkit-adjacent:** `render_similarity` (path `tools/testkit/render_similarity/metrics.py` — IS
  testkit) ; `common_3dgs` (path `common/common-3dgs/src/common_3dgs` — a `common/` shared module, NOT a sim,
  authorized by phase-3-plan §6.0 item 12 / :1052 "testkit-adjacent").
- **8 Phase-1 SIM-SOURCE + sim-MMS targets:** `reaction_diffusion_3d`, `reaction_diffusion_3d_mms`,
  `sph_water`, `sph_water_dfsph_generator`, `eulerian_smoke`, `incompressible_ns_2d_mms`,
  `lattice_boltzmann_d3q19`, `mpm_multimaterial`. Paths point at `packages/<sim>/<sim>/` sim source.

**Spec read:** §2.13 is titled "Mutation testing **for testkit and integrity tooling**"; §587 "Required
coverage" enumerates ONLY the 6 testkit/integrity surfaces. Catalog §41.4 (T4) reads "Mutation testing on
every **testkit + integrity module**." The spec NEITHER mandates NOR prohibits sim-source as mutation targets —
it is silent; the named contract is testkit+integrity only.

**Authorization trail for the sim targets:** introduced under internal routing "B17 PATH-A" (agent-based
landing audit §7.6 + Phase-1 audit §13; charter `sub-phase-continuous-ca-rd3d.md` §4.3 Step 2.7 / §7.3,
lines 26/42/137-144/241-250). The config self-documents the gap: "Sim-source modules carry no spec-pinned
floor; we adopt **0.80 advisory** … The mutation gate remains **non-blocking (advisory)** … PATH-A's
contribution is the FIRST REAL BASELINE, not a gate-flip."

**Verdict:** listing sims as mutation targets does NOT contradict the spec's PROHIBITIONS (there are none —
§2.13 enumerates a required floor, not an exhaustive allowlist), but it DOES **expand beyond the spec §2.13 /
catalog §41.4 enumerated scope** ("testkit + integrity"), on the authority of internal sub-phase charters
rather than a spec amendment. The expansion is self-flagged advisory/non-blocking with no spec-pinned floor,
which contains the blast radius. **MINOR drift:** the spec §2.13 prose still scopes mutation to "testkit and
integrity tooling" while the shipped config mutates 8 sim-source surfaces; no spec sentence sanctions this
(only sub-phase charters do). Remediation (→D9): either amend §2.13 to acknowledge advisory per-sim targets,
or annotate the config that these are charter-authorized advisory extensions outside the §2.13 contract.

### Check 4 — ≥3-independent-anchor gate SEMANTICS (M-3 re-confirm) — **VERDICT: HOLE INTACT at HEAD; tasks 5–8 goldens pass via the same field-presence-only path** [severity: MAJOR]
`tools/integrity/integrity/cat3_numerical/golden_values.py` `_anchor_count` (lines 61-65):
```
return sum(1 for p in points if isinstance(p, dict) and "independent_reference" in p)
```
The gate counts **field-PRESENCE** of the key `"independent_reference"` per test-point; it does NOT verify
the references are distinct, independent, or non-empty. HARD_FAIL fires only on `< 3` points-carrying-the-key
(lines 86-98). A table with the SAME reference string repeated across 3 points would PASS. M-3 confirmed intact.

**Tasks 5–8 (and 3,4) goldens exploit the same hole.** Their golden tables live at the tables ROOT (not in a
category subdir), so they are walked by `base.glob("*.json")` (line 53) — the gate DOES run against them:
`cloth-hanging.json`, `cloth-stretched.json`, `ising-classical-magnetization.json`,
`ising-classical-critical-temperature.json`, `lenia-kernel.json`, `lenia-orbium-trajectory.json`,
`pinn-poisson-canonical.json`, `rigid-body-{pendulum,double-pendulum,6dof}-trajectory.json`,
`3dgs-mpm-coupling.json`, `cubic-spline-kernel.json`. Per-table field-presence anchor_count at HEAD:
cloth-hanging 3, ising-magnetization 3, lenia-kernel 3, pinn-poisson-canonical 3, rigid-body-pendulum 7,
3dgs-mpm-coupling 3 — all ≥3, all GATE-GREEN. (Data-side spot of distinct ref-source strings shows 3 distinct
values each — i.e. they are not blatantly gaming it — but the GATE cannot tell the difference; independence is
enforced only by author discipline, not by the gate.)

**Note (subdir-coverage sub-issue):** `_SUBDIRS_PICKED_UP` (lines 33-39) lists only 5 category subdirs
(closed-form, agent-based, particle-fluids, lattice, hybrid-pg). It happens to NOT matter for tasks 5–8
because their tables sit at the root (caught by the root glob), but any future golden placed in a NON-listed
subdir such as `soft-body/`, `rigid-body/`, `neural-rendered/`, or `learned-dynamics/` would be silently SKIPPED
by `_gather_tables` when invoked with an explicit `files` list — a second latent gap adjacent to M-3.

**Cross-link:** D1 owns the DATA side (whether the cited references are genuinely independent/correct). D7
owns the GATE/tooling side: the gate provides ZERO independence enforcement; it is a key-presence counter.
Severity MAJOR (the gate's name promises independence it does not verify; tasks 5–8 inherit the unverified
guarantee). Remediation (→D9/tooling): count DISTINCT non-empty `independent_reference` values, and consider
walking all subdirs (or asserting on unexpected subdirs) rather than a hard-coded 5-subdir allowlist.

---

## Severity legend
NONE = conforms; MINOR = lead / docs-staleness or contained drift; MAJOR = load-bearing drift or a
verification gate that does not enforce what its name/spec claims. No source mutated (read-only back-test).
