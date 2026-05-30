---
date: 2026-05-30T17-54-54Z
author: phase-4 pre-dispatch reconciliation (Claude Code, PHASE A)
subject: "Phase-4 PHASE-A pre-dispatch reconciliation (A1–A7) + foundation-entry gate verdict — operator-ratified go/no-go disposition"
kind: pre-dispatch-review
verdict: PHASE-A-COMPLETE-WITH-ENTRY-GATE-BLOCKED
head_sha: 4c92133477d83e7cd47e3cd4774d4db99aa741e0
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 45eed4cacb64b711c461f6e3b76958a646e6b0517302c3921bce2f18ef3018d2
parent_audits:
  - docs/_audits/phase-4/pre-dispatch-probe-2026-05-30T17-04-02Z.md
  - docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md
  - docs/_audits/phase-3/neural-ca-gate14-divergence-diagnosis-20260529T120252Z.md
---

# Phase-4 PHASE-A — Pre-Dispatch Reconciliation + Foundation-Entry Verdict

> This is the operator-ratified **disposition** that the
> `pre-dispatch-probe-2026-05-30T17-04-02Z.md` reconnaissance anticipated. It
> records the outcome of the seven decision-free PHASE-A reconciliations (A1–A7)
> and one **measured-live finding that contradicts the probe's expectation**: the
> spec § 7.5 cross-phase replay — the foundation-entry gate — returns **ok=False**.
> Per the dispatch ("If any A-item HARD-STOPs, STOP and report before PHASE B") and
> HARD RULE 2 ("never force a red entry gate"), PHASE B (WU-P → WU-G) is **NOT
> begun**; this review surfaces the disposition for operator ratification.
>
> Verdicts are four-state: **CONFIRMED** (done as specified), **SHIFTED** (done
> with a documented §0.3 deviation), **BLOCKED** (cannot proceed without operator
> ratification), **FLAGGED** (surfaced, deliberately not fixed per dispatch).
> Findings are **FACT** (ran/read) or **INFERENCE** (reasoned).

---

## §0 — Headline

| Item | Verdict | One-line |
|---|---|---|
| A1 replay-target repoint | **CONFIRMED** (edit) + **BLOCKED** (gate) | Repoint landed in both sites; the replay itself returns **ok=False** (3 live + 1 artifact failures) — foundation-entry gate is RED. |
| A2 tag-moat doc honesty | **CONFIRMED** | §7.12 + D.8 14–16 + G.10 table corrected; server-side/pre-receive claims withdrawn (branch-protection 404; tags UNSIGNED). |
| A3 mutation source-only + §2.13 | **SHIFTED** | Config now SOURCE-ONLY (exclude `tests/`); §2.13 → SOFT_WARN-now; honest re-measure: still below floor (tests/ was a minor dilutant; the dominant dilutant is unexercised solution/sim source). |
| A4 A-6 pin re-point + MANIFEST guard | **CONFIRMED** | plan §2.18 → physicsnemo-sym v2.4.0 (acaeb6dc); new `test_manifest_pin_consistency.py` (hard structure, soft license-drift, sha-exempt). |
| A5 plan v8/v9 seam | **CONFIRMED** | Two `Stage 35 (closing)` → `Stage 36 (closing audit)`; timeline text already purged (only supersession notices remain). |
| A6 NCA gate-14 matched-RNG | **CONFIRMED** | Matched PCG fire mask CLEARS the § 2.12 floor: PSNR 23.92→144.562, SSIM 0.824→1.0, LPIPS 0.0316→0.0. No HARD-STOP. |
| A7 M-6 prospective-only | **CONFIRMED** (recorded) | Half-applied state recorded (§7 below); no renames this run. |
| **PHASE B (WU-P→WU-G)** | **NOT STARTED** | Blocked behind the A1 entry-gate disposition; awaiting operator ratification. |

---

## §1 — A1: replay-target repoint + the foundation-entry gate (FACT)

**The edit (CONFIRMED).** The plan hard-coded `--audit docs/_audits/phase-3/landing-<UTC>.md`, which does not exist (Phase-3 close shipped three `close-R*.md` audits + the tag, no single landing). Repointed to `docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md` in **both** sites:
- `docs/phases/phase-4-plan.md` v9-amendment block (top of file, the `CROSS-PHASE AUDIT REPLAY` line).
- `docs/phases/phase-4-plan.md` § 7.1 (the WU-P dispatch replay invocation, ~ line 1444).

The tag is resolved from `--prior-phase phase-3` → `v0.3.0-phase-3`; the audit file is read only for front-matter (verdict `R3-R5-CORRIGENDA-TASK9-LANDED`, not in `{CONFIRMED,PASS,OK}`, so no claimed-vs-actual cross-check fires). The repoint removes the uncaught `FileNotFoundError`. **This part is exactly as the dispatch specified.**

**The gate (BLOCKED — measured live, contradicts the probe).** With the repoint, the replay **runs** but returns:

```
PASS integrity | FAIL pytest | PASS equivalence | PASS determinism
PASS perf-ledger | PASS property | FAIL mutation | PASS tolerance-budget
summary: prior_phase=v0.3.0-phase-3 ok=False
```

The probe (§2) reasoned the repoint would be "functionally a valid replay" *assuming the eight gates pass at the tag*. **They do not.** Decomposition (all measured live, both at the tag in a worktree AND at HEAD `main`):

| Failure | At tag | At HEAD main | Class | Fixable? |
|---|---|---|---|---|
| `pytest` → `test_i7_no_agent_tags` | FAIL | **PASS** | Tag-ordering **artifact** — `v0.3.0-phase-3` was added to the I7 allowlist in commit `638b247`, *after* the tag (`362179f`); `git tag` is repo-global so the worktree sees the tag but the tagged-commit allowlist lacks it. Benign. | n/a (expected) |
| `pytest` → `test_i6_convention_12` | FAIL | **FAIL** | **Live on main.** Commit `abf1d46` ("re-back-fill render-similarity Stage 0 head_sha…", ancestor of the render-similarity tag) has a back-fill *subject* but no "Convention #12" body cite. Latent-red since render-similarity landed (Phase 3); undetected because lfs_migration meta-tests are **not run by any CI workflow**. | **NO without fighting an invariant** — fixing means rewriting immutable history (forbidden) or weakening the I6 test. **HARD RULE 2.** |
| `pytest` → `test_cost_axis…registry_is_complete` | FAIL | **FAIL** | **Live on main.** `pinn-train.yml` (added by task-7 pinn-poisson) is absent from the `WORKFLOW_CAPTURE_REQUIREMENT` registry. | YES — a one-line registry addition (in-scope of a focused fix; not in A1–A7). |
| `mutation` gate (`gate_helpers mutation-baseline-present`) | FAIL | **FAIL** | **Live on main.** The gate_helper expects baseline `status='framework-validated'`; the on-disk baseline (`baseline-2026-05-28T03-23-44Z.json`) says `status='real-baseline'` (the format evolved during Phase 3). | YES — update the gate_helper's accepted status set (in-scope of a focused fix; not in A1–A7). |

**Material facts.** The full `pytest -W error tools/testkit/` suite is **2 failed / 268 passed at HEAD** (`test_i6_convention_12`, `test_cost_axis`); these tests are not gated in any CI workflow, so **GitHub CI on main is green** while the spec § 7.5 replay gate (which runs the full suite) is red. None of these failures touch a Phase-3 *deliverable's correctness* — they are hygiene/registry/citation-format residue from the Phase-3 close that the replay gate surfaces.

**Disposition (recommendation, operator ratifies):**
1. `test_i7` — **accept** as a known tag-ordering artifact (passes at HEAD). Optionally teach the replay/I7 test to tolerate "tag's own allowlist commit is a descendant."
2. `test_cost_axis` + `mutation` gate_helper — **a focused infrastructure-hotfix sub-phase** (registry entry for `pinn-train.yml` + gate_helper accepted-status set). Clean, low-risk, ~1 commit.
3. `test_i6` — **operator decision.** Immutable history makes it permanently red under `pytest -W error tools/testkit/`; options are (a) re-scope the I6 detector to exclude legitimate "re-back-fill" corrections, or (b) accept the documented exception. **I did NOT touch it** (fixing fights the append-only invariant — HARD RULE 2).

Until these are dispositioned, the foundation-entry gate is RED; **PHASE B is not begun** (green acceptance is the dispatch's precondition for auto-proceed).

---

## §2 — A2: tag-moat doc honesty (CONFIRMED, FACT)

Corrected, in `docs/architecture.md`, every claim of *server-side / pre-receive* enforcement of the tag/branch/audit moats — none exists:

- **§ 7.12** — the "Server-side git hooks (mechanical enforcement)" subsection rewritten: the tag-push separation is **convention + post-hoc detection** (`test_i7_no_agent_tags.py`, `audit-append-only.yml`), not branch-protection HARD_FAIL. Added a FACT note: `branches/main/protection` → **404** (measured), github.com has **no custom pre-receive hooks**, rulesets **cannot verify tag signatures**, and the phase tags are **annotated-UNSIGNED**.
- **Appendix D § D.8 items 14–16** — "Server-side hook rejects" replaced with the real mechanism (convention; post-hoc `audit-append-only.yml`; the agent *does* push refs+objects to `main` per § Q.6, only tags/non-main/force are restricted).
- **Appendix G § G.10 hooks table** — relabelled "Enforcement posture"; rows 1–4 marked **NOT configured (desired)**, rows 5–7 are the **present** post-hoc floor; row 4 (`git verify-tag`) explicitly corrected (no signer moat; tags unsigned).
- Propagations corrected: the two top-of-file revision-log bullets (§7.12, G.10), the § 7.13 "mechanical floor" cross-reference.

**Posture correction (FACT, important).** An initial draft overstated "the operator is the sole pusher to main." Corrected per § Q.6 + D.8 item 14: **the agent commits and pushes refs + LFS objects to `main` directly** (trunk-based); only **phase tags** are operator-only (I7), and non-`main` branches / force-pushes are forbidden by convention. "Single-operator" = one developer-operator in the loop, not "operator is the only one who runs `git push`".

Direct-edited (not routed via `spec-amendments-proposed.md`): the § 9.6 freeze lifted at the Phase-3 close boundary (`da61e86`); the spec is editable between phases, and the dispatch authorized direct edits with FACT notes.

---

## §3 — A3: mutation source-only re-measure + § 2.13 honesty (SHIFTED, FACT)

**Config fix (CONFIRMED).** `tools/testkit/mutation/mutmut-config.toml`: added `exclude = "tests"` to the `code_verification_mms` and `property` targets; `run-mutation.sh` extended to pass it as `mutmut --paths-to-exclude tests` (fnmatch on basename → the nested `tests/` subtrees are no longer mutated). mutmut's default tests-dir guess only excludes a *top-level* `tests/`, so the nested subtrees had been diluting the kill rate.

**Re-measure (SHIFTED — honest below-floor record).** Run **directly** (not via the wrapper — the `run-mutation.sh` EXIT-trap raced a `.bak` restore and crashed the first attempt at mms 431/642; the lenia lesson "run mutmut directly" reproduced):

| Target | Pre (tests/-included) | Source-only (this run) | Floor | Status |
|---|---|---|---|---|
| `code_verification_mms` | 0.2650 | **0.2243** (138 killed / 498 surv / 6 timeout, 642) | 0.80 | below — recorded honestly |
| `property` | 0.2034 | **0.3455** (151 killed / 286 surv, 437) | 0.80 | below — recorded honestly |

Ledger artifact: `tools/testkit/mutation/phase-4-a3-source-only-20260530T181620Z.json`.

**Finding (FACT — full run).** The dispatch's "tests/ inclusion diluted the score" hypothesis holds **asymmetrically**: for `property` excluding `tests/` **raised** the score (0.2034 → 0.3455, +0.14 — the nested test-file mutants were genuinely surviving/diluting); for `code_verification_mms` it **dropped** the score (0.2650 → 0.2243 — the prior figure was partly *inflated* by killed test-file mutants). **Either way both stay well below the 0.80 floor**, because the dominant residual dilutant is **source the per-target runner does not exercise** — `mms` includes `solutions/{incompressible_ns_2d,reaction_diffusion_2d,reaction_diffusion_3d}` (driven by other sims' runners, not `mms/tests/`); `property` includes `sims/*/invariants.py` + `invariants/` (driven by per-sim package tests, not `property/tests/`). **Not widened** — recorded honestly per the dispatch; the lever to clear the floor is target-specific constraining tests, not a config tweak.

**§ 2.13 spec edit (CONFIRMED).** `docs/architecture.md` § 2.13: the "HARD_FAIL on phase landings" claim was **aspirational, not wired** (it would block every landing while these two targets sit below floor on their own merits). Rewritten to **SOFT_WARN everywhere today** (CI pushes AND landings); HARD_FAIL is an **earned per-target promotion** once a module's constraining tests lift its source-only kill rate to the floor. The top-of-file § 2.13 changelog bullet corrected to match.

---

## §4 — A4: A-6 pin re-point + MANIFEST guard (CONFIRMED, FACT)

**Pin re-point.** `docs/phases/phase-3-plan.md` § 2.18: `NVIDIA/physicsnemo@766e485a (v2.1.0)` → `NVIDIA/physicsnemo-sym@acaeb6dc38ecda58559b5286d3cb743e8cf930d3 (v2.4.0, Apache-2.0)`, matching the already-applied spec D.3 corrigendum A-6 (`da61e86`) and the as-vendored `references/PhysicsNeMo-PINN/MANIFEST.toml` (which already records sym v2.4.0). The PINN tutorials live in physicsnemo-sym, not the core repo.

**MANIFEST guard.** New `tools/integrity/tests/test_manifest_pin_consistency.py` (in the CI-wired `tools/integrity/tests/` meta-test suite):
- **HARD (assert):** every `references/*/MANIFEST.toml` `[upstream]` is structurally complete (name/version/sha/url/license non-empty; url is `https://github.com/<org>/<repo>`; `license_file` present unless `license == "NONE"` for cite-only deps like PhysGaussian).
- **SOFT (warn, never fails):** manifest `license` vs the architecture.md § D.3 registry for deps whose repo D.3 names — `@pytest.mark.filterwarnings("always")` so the suite-wide `filterwarnings=["error"]` does not escalate it (the suite would otherwise turn the warning into a hard error; this is the faithful "SOFT_WARN on drift").
- **SHA exempt** for all deps (probe-then-pin OpenVDB/Newton resolve at vendoring time by design; pins drift legitimately on re-release). When their manifests land, the guard checks presence + repo + license, never a pre-baked SHA.
- Result: **2 passed**; full integrity meta-suite **82 passed**; ruff/mypy strict clean. Zero current drift (SPlisHSPlasH/PositionBasedDynamics MIT, physicsnemo-sym Apache-2.0 all agree with D.3).

**FLAGGED (do not fix, per dispatch).** The plan § 3.3 + WU-E "pin PhysicsNeMo 1.x" runtime guidance is **stale** (core 1.x ended at v1.3.0; framework is 2.x; physicsnemo-sym is the read-only PINN reference). The WU-E agent re-resolves the runtime pip pin at its probe. Surfaced, not changed.

---

## §5 — A5: plan v8/v9 seam (CONFIRMED, FACT)

`docs/phases/phase-4-plan.md`: the two v8-leftover `Stage 35 (closing)` references corrected so Stage 36 = closing audit and Stage 35 = last frontier sim, consistent with the rest of the doc:
- The `FAILING-TESTS OUTPUT HASH` v9-amendment line: "Stage 35 (closing) replays 3 random sim stages" → "Stage 36 (the closing audit) replays…".
- The `OPERATOR-ONLY TAG PUSHING` line: "final stage of stage 35" → "Stage 36, after the last frontier sim at Stage 35".

**Timeline text.** The live "3–5 days" / "30–95 weeks" calendar-pacing text was **already purged** at v9 — the only remaining mentions (lines 44, 2968) are **supersession notices** that quote the old numbers to document their replacement by spec § 11.0. Retained as the purge record (removing the quotes would lose the audit trail). No live calendar-pacing remains.

---

## §6 — A6: NCA gate-14 matched-RNG fix (CONFIRMED — CLEARS FLOOR, FACT)

Committed the banked matched-RNG fix and **re-ran gate-14 — it CLEARS the § 2.12 floor**, so no HARD-STOP.

- `model.forward(..., step, seed)` draws the **matched stateless PCG fire mask**, bit-identical to the WGSL/oracle `pcg_fire(x,y,step,seed)` (locked by new meta-test `test_matched_fire_field_equals_oracle`, verified equal across steps 0/1/7/50/200/999). `infer.run_inference` uses it; **training keeps `torch.rand`** (stochasticity drives learning).
- D capture regenerated (sha256 `0bf35df4…`); gate-14 re-measured over the 20 non-seed frame pairs against the committed B (WGSL) capture:

| Metric | Was (torch.rand) | Now (matched PCG) | § 2.12 floor |
|---|---|---|---|
| mean PSNR | 23.92 | **144.562** | ≥ 28 ✓ |
| mean SSIM | 0.824 | **1.0000** | ≥ 0.85 ✓ |
| mean LPIPS_alex | 0.0316 | **0.0000** | ≤ 0.15 ✓ |

- `tolerance.toml` row **RE-LOCKED** with margin below the measured means (`psnr_min 140.0 / ssim_min 0.99 / lpips_max 0.01`) — a **tightening**, not a § 2.6 widening. `equivalence.md` QUALITY-CONCERN flag → **RESOLVED**. Both captures are committed/fixed so the measurement is deterministic. Full neural-ca suite **11 passed**; ruff/mypy strict clean.
- The diagnosis flagged this as "task-9/Phase-5 candidate, NOT a task-6 re-open"; the operator's A6 directive supersedes that advisory.

---

## §7 — A7: M-6 prospective-only — recorded half-applied state (CONFIRMED record, FACT)

No renames this run. The accepted **half-applied** state of the `articulated-pedagogical` ↔ `rigid-body-pedagogical` rename (M-6):

| Surface | State | Reason frozen |
|---|---|---|
| Spec (`architecture.md`) + package dir `packages/articulated-pedagogical/` | **CANONICAL** (renamed; A-1/M-6 at `da61e86`) | — |
| `captures/rigid-body-pedagogical-ref/…json` (`"name": "rigid-body-pedagogical"`) + dir leaf | **FROZEN legacy name** | Renaming drags LFS OIDs + recomputes the JSON `name`. |
| `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.{h5,json}` | **FROZEN legacy name** | Renaming collides with the WU-A 26-pair corpus round-trip (the HARD gate). |
| `.github/workflows/python-strict.yml` `test-rigid-body-pedagogical:` job key + `captures/rigid-body-pedagogical-ref/**` LFS glob + comment | **FROZEN legacy name** | Cosmetic; every step inside already uses `packages/articulated-pedagogical`. |
| `docs/_audits/phase-3/task-4-rigid-body-pedagogical.md` | **FROZEN (append-only-locked)** | Close R4 attempted the rename and **reverted under HARD RULE 2** (broke a referencing audit's `verify_evidence` head_sha 8/0 → 6/2). |

Disposition: **all NEW Phase-4 artifacts use `articulated-pedagogical`; the legacy capture/CI/audit names stay frozen.** Apply prospectively in a dedicated rename sub-phase if ever, not folded in silently.

---

## §8 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / probe) | Measured live | Disposition |
|---|---|---|---|
| C-1 | Repoint → "functionally a valid replay" (gates pass at tag) | replay **ok=False**: pytest + mutation gates fail | **BLOCKED** — §1; PHASE B not begun. |
| C-2 | (probe) Phase-3 close left a clean `pytest tools/testkit/` | **2 failed / 268** at HEAD (`test_i6`, `test_cost_axis`) — latent-red, not CI-gated | Surfaced; focused-fix + I6 operator decision. |
| C-3 | (probe) mutation gate baseline `status` consistent | gate_helper expects `framework-validated`; baseline is `real-baseline` | Surfaced; one-line gate_helper fix recommended (not in A1–A7). |
| C-4 | A3: excluding `tests/` un-dilutes the mutation score | minor only; dominant dilutant is unexercised solution/sim source → still below floor | **SHIFTED** — recorded honestly; floors not widened. |
| C-5 | (initial A2 draft) "operator is sole pusher to main" | agent **does** push refs+objects to main (§ Q.6); only tags are operator-only | Corrected in the A2 edits. |

---

## §9 — Disposition & next action

**PHASE A is complete** (A1–A7 executed; A6 cleared its built-in HARD-STOP). **PHASE B (WU-P → WU-G) is NOT begun**: the spec § 7.5 cross-phase replay — the WU-P first action and the foundation-entry gate — returns ok=False, so the dispatch's "green acceptance" precondition for auto-proceed is unmet, and HARD RULE 2 forbids forcing a red entry gate.

**Operator ratification needed before PHASE B (and before push):**
1. Replay residue disposition (§1): accept `test_i7` artifact; authorize a focused hotfix for `test_cost_axis` + the mutation gate_helper status; decide `test_i6` (re-scope the detector vs documented exception).
2. Confirm the A6 task-6 re-open (capture regen + tolerance re-lock) is ratified as landed.

**Commits.** PHASE A landed locally on `main` (NOT pushed — surfaced for review). SHAs in §10. The mutation re-measure numbers (§3) and the measured integrity digest (§R, front-matter) are filled in before this audit's commit.

---

## §10 — PHASE-A commit ledger

All on `main`, local (NOT pushed):

| SHA | Scope |
|---|---|
| `4997dc8` | `docs(phase-4-a1-a5)` — replay-target repoint (A1) + Stage 35/36 seam (A5) |
| `0a89d51` | `docs(phase-4-a2-a3)` — tag-moat honesty (A2) + § 2.13 SOFT_WARN wiring (A3-spec) |
| `e315f52` | `chore(phase-4-a3)` — mutmut config SOURCE-ONLY (A3-config) |
| `48743cc` | `feat(phase-4-a4)` — physicsnemo-sym pin + MANIFEST pin-consistency guard (A4) |
| `887d4df` | `fix(phase-4-a6-neural-ca-matched-rng)` — gate-14 clears § 2.12 floor (A6) |
| `4c92133` | `chore(phase-4-a3)` — mutation source-only ledger (A3) |
| _(this audit)_ | `docs(phase-4-pre-dispatch-review)` + Convention #12 SHA back-fill |

§ R measured-live at the post-commit working tree: integrity **0 HARD_FAIL /
14 SOFT_WARN**; `integrity_digest_at_head` = `45eed4ca…3018d2` (unchanged from the
close-R3-R5 measurement — the PHASE-A edits added no golden tables / audit-log
emitters that perturb the report).

## Provenance

Convention #12 SHA back-fill applies to `head_sha:` above. The integrity invariant
(0 HARD_FAIL / 14 SOFT_WARN) is preserved; `integrity_digest_at_head` is measured
live in this session (§ R — never copied). No tag pushed (I7). Not pushed to origin
this run — surfaced for operator review of the foundation-entry-gate disposition.
