---
date: 2026-05-20T03-20-49Z
author: phase-1-stage-1-agent
phase: 1
stage: 1
artifact: stage-1-blocked-replay
artifact_id: phase-1-stage-1-blocked-replay
verdict: BLOCKED
blocker: cross-phase-audit-replay (Stage 1 Task 1.0)
head_sha: 30d88877d64b66f136503c8e27c9cb9aaeefa049
parent_audit: docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md
prior_phase_tag: v0.0.0-phase-0
prior_phase_tag_sha: 727ffb9b513f77a9a38442b256db3a416547d3c8
evidence_paths:
  - docs/_audits/phase-1/stage-1-blocked-replay-2026-05-20T03-20-49Z.replay-output.txt
  - docs/_audits/phase-1/stage-1-blocked-replay-2026-05-20T03-20-49Z.preflight-output.txt
  - docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md
  - docs/phases/phase-1-plan.md
  - tools/integrity/integrity/scripts/replay_prior_phase.py
  - tools/dispatch/preflight-phase.py
  - justfile
gates_failed:
  - pytest (harness defect — unscoped invocation; see § 3.1)
  - property (unknown gate — not wired into GATE_COMMANDS)
  - mutation (unknown gate — not wired into GATE_COMMANDS)
  - tolerance-budget (unknown gate — not wired into GATE_COMMANDS)
gates_passed:
  - integrity
  - equivalence
  - determinism
  - perf-ledger
charter_drifts:
  - charter §11 R9 names `--prior-phase phase-0`; actual Phase 0 tag is `v0.0.0-phase-0`
  - charter §11 R9 lists 8 gates; GATE_COMMANDS wires only 5
  - GATE_COMMANDS subprocess argv hardcodes `python`, not present on PATH outside an activated venv
phase0_substance_assessment: HEALTHY (per § 3 below — every replay failure is a harness defect; no Phase 0 regression observed)
---

# Stage 1 — BLOCKED on Task 1.0 (cross-phase audit replay)

> **Per Phase 1 plan § 9.3 P20:** the cross-phase audit replay (Task 1.0)
> exited non-zero. Stage 1 is BLOCKED. The agent does NOT proceed to
> Task 1.1; the operator decides whether to repair Phase 0, patch the
> replay harness, or revise the plan.

## 1. The replay command and its result

FACT — invoked from `/home/otacon/Projects/Bit-Physics` with `.venv` active:

```
python -m integrity.scripts.replay_prior_phase \
  --prior-phase v0.0.0-phase-0 \
  --audit docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

FACT — exit code: **1** (full output captured in
`stage-1-blocked-replay-2026-05-20T03-20-49Z.replay-output.txt`):

```
  PASS  gate=integrity         audit_verdict=SHIFTED
  FAIL  gate=pytest            audit_verdict=SHIFTED
  PASS  gate=equivalence       audit_verdict=SHIFTED
  PASS  gate=determinism       audit_verdict=SHIFTED
  PASS  gate=perf-ledger       audit_verdict=SHIFTED
  FAIL  gate=property          audit_verdict=SHIFTED  (unknown gate)
  FAIL  gate=mutation          audit_verdict=SHIFTED  (unknown gate)
  FAIL  gate=tolerance-budget  audit_verdict=SHIFTED  (unknown gate)
summary: prior_phase=v0.0.0-phase-0 ok=False
```

INFERENCE — the script's `ReplayResult.ok` property requires every gate
to satisfy `passed and discrepancy is None`. Four FAILs → `ok=False`
→ exit 1. (Source: `tools/integrity/integrity/scripts/replay_prior_phase.py`
lines 63–65.)

## 2. Charter-vs-HEAD drifts encountered en route

FACT — the charter command in § (R9 amendments, line ~13) is:

```
python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-0 \
  --audit docs/_audits/phase-0/landing-<UTC>.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Three deviations from HEAD were required to invoke the script at all
(per Hard-Rule-2: HEAD wins):

**Drift D1 — tag name.** Charter says `--prior-phase phase-0`. No git ref
named `phase-0` exists at HEAD. The Phase 0 tag landed by the operator
is `v0.0.0-phase-0` (FACT — `git tag --list` returns one tag,
`v0.0.0-phase-0`, pointing at SHA `727ffb9b`). The replay script's
`_checkout_worktree` (line 95–107) treats `--prior-phase` as a literal
git ref passed to `git worktree add --detach`. With `phase-0` the
checkout fails:

```
Command '['git', 'worktree', 'add', '--detach',
'/home/otacon/Projects/Bit-Physics/.replay-phase-0', 'phase-0']'
returned non-zero exit status 128.
```

**Drift D2 — `python` not on PATH.** GATE_COMMANDS (line 39–45) hardcodes
`"python"` in the integrity gate argv. On this system only `python3` is
on the OS PATH; `python` resolves only inside the project's `.venv`. The
script propagates the parent shell's PATH into the worktree subprocess,
so the integrity gate raises `FileNotFoundError: 'python'` unless the
caller activates `.venv` first. The preflight script
(`tools/dispatch/preflight-phase.py`) at HEAD has the same defect — see
`preflight-output.txt`: `[FAIL] integrity-all-green — command not found: python`.

**Drift D3 — three gates unwired.** Charter lists 8 gates; GATE_COMMANDS
(line 39–45) wires only 5: `integrity, pytest, equivalence, determinism,
perf-ledger`. `property`, `mutation`, and `tolerance-budget` are not
defined. The script handles unknown gates by appending a `GateResult`
with `passed=False` and `discrepancy="unknown gate ..."` (line 137–145),
which forces `ok=False`.

INFERENCE — D1/D2/D3 together indicate the R9 amendment text was added
to the charter without correspondingly updating the replay script's
GATE_COMMANDS, default arg-name convention, or PATH discipline. None of
the three drifts is a Phase 0 substance defect; all three are
post-Phase-0 charter-vs-harness drift that the operator authoring R9
must reconcile before the replay gate can be honored on its own terms.

## 3. Phase 0 substance health — independently re-verified

The replay's only "real" FAIL (i.e. not a charter-vs-harness drift) is
the **pytest gate**. The agent re-verified Phase 0 pytest health by
hand to determine whether this reflects a Phase 0 regression.

### 3.1 pytest gate — diagnosis

FACT — GATE_COMMANDS pytest argv is `["pytest", "-W", "error"]` (no
testpath). FACT — the project's own justfile (`justfile` line 17–18)
defines its pytest gate as `uv run pytest -W error tools/testkit/`
(scoped). FACT — `pytest -W error` (unscoped, no testpath) ALSO fails
on the current `main` HEAD with `ModuleNotFoundError: No module named
'tests.test_*'` collection errors. So the GATE_COMMANDS pytest
invocation has never passed in this repo — it is a harness defect that
predates Phase 0 landing.

FACT — at v0.0.0-phase-0 (in a freshly `uv sync --frozen --all-packages
--all-extras` worktree), the scoped `pytest -W error tools/testkit/`
PASSES `47 passed in 2.01s`. This matches the Phase 0 landing audit's
implicit pytest-gate claim ("every other Phase-0 acceptance gate
CONFIRMED" — landing audit § 1).

INFERENCE — Phase 0's pytest gate is healthy at the granularity Phase 0
itself defined. The replay's pytest FAIL is solely the GATE_COMMANDS
test-scope mismatch, not a Phase 0 regression.

### 3.2 property / mutation / tolerance-budget gates — unwired

These three gates are listed in the R9 amendment (line ~13) but not in
GATE_COMMANDS. The agent did NOT attempt to define what they should run
— that's a charter authorship decision for the operator. For the
record:

- **property** — Phase 0 ships `tools/testkit/property/tests/test_harness.py`;
  scoped `pytest tools/testkit/property/tests/` at v0.0.0-phase-0 passes
  (subset of the 47 above).
- **mutation** — Phase 0 ships a framework-validated mutation baseline
  at `tools/testkit/mutation/baseline-2026-05-19T17-16-17Z.json` (cited
  in the landing audit). The landing audit verdict on mutation is
  explicitly SHIFTED (the only shift); per spec § 2.13, gating activates
  in Phase 1 CI. No invocation defined in GATE_COMMANDS.
- **tolerance-budget** — Phase 0 ships
  `tools/testkit/equivalence/tolerance-budget.toml` per § (R9). The
  R9 amendment notes: "At Phase 0 close, tolerance-budget.toml is
  committed but has no per-sim overrides — the tolerance-budget gate
  passes trivially; included here for consistency with later phases."
  No invocation defined in GATE_COMMANDS.

INFERENCE — none of the three reflects Phase 0 substance failure;
all three reflect missing GATE_COMMANDS entries.

### 3.3 integrity / equivalence / determinism / perf-ledger — PASS

These four wired gates that DID pass at v0.0.0-phase-0 (with `.venv`
active so `python` is on PATH) confirm:

- `python -m integrity --all --mode strict` → exit 0
- `pytest -W error tools/testkit/equivalence/tests` → exit 0
- `pytest -W error tools/testkit/determinism/tests` → exit 0
- `python -c "print('perf-ledger gate is a phase-1+ placeholder')"`
  → exit 0 (trivial placeholder per GATE_COMMANDS comment intent)

INFERENCE — Phase 0's substantive acceptance gates are intact.

## 4. Surface-to-operator summary

The Phase 0 foundation appears HEALTHY on substance; the replay gate
returned exit 1 because of three pre-existing harness/charter drifts:

1. Phase 0 tag is `v0.0.0-phase-0`, not `phase-0` (charter wording).
2. Replay script's GATE_COMMANDS wires 5 gates; charter R9 names 8.
3. Replay script invokes `python` (not on OS PATH).

**Per P20** the agent does NOT silently adapt. Stage 1 Task 1.0 is
BLOCKED until the operator resolves these. Options the operator has
(non-exhaustive; spec § 7.5 leaves the call to the operator):

- **(a) Patch the replay script** so it (i) accepts `phase-0` and maps
  to `v0.0.0-phase-0`, (ii) wires `property`/`mutation`/`tolerance-budget`,
  (iii) uses `sys.executable` instead of `"python"`, (iv) scopes pytest
  to the same paths the justfile uses. Then re-dispatch Stage 1.
- **(b) Amend the charter** so its R9 prescription matches what the
  replay actually does (5 wired gates, correct tag name).
- **(c) Run a manual re-verification ceremony** of the missing three
  gates at v0.0.0-phase-0, recording results as an addendum to the
  Phase 0 landing audit, and dispatch Stage 1 with a charter clause
  permitting that ceremony as the cross-phase replay for this phase.
- **(d) Some combination** — e.g., (a) + an addendum amending R9 to
  the (now-wired) gate set.

No combination of these is the agent's call. The agent files this
BLOCKED audit and ends the session.

## 5. State of the repo at session end

FACT — `git status` is clean except for the new
`docs/_audits/phase-1/` directory introduced by this audit. The agent:

- did NOT touch `tools/testkit/equivalence/tolerance-budget.toml`
  (Task 1.1 not begun);
- did NOT touch any of `common/common-cpp/`, `common/common-py/`,
  `tools/diagnostics/tier2/{particle,vector_field,closed_form}/`;
- created and removed a `git worktree` at `.replay-debug` for
  diagnostic purposes during the failure investigation (now removed
  via `git worktree remove --force`);
- left `tmp/replay-full.txt` and `tmp/preflight-1.txt` on disk only as
  intermediate buffers; the canonical evidence lives at
  `docs/_audits/phase-1/stage-1-blocked-replay-2026-05-20T03-20-49Z.{replay,preflight}-output.txt`.

FACT — no Stage 1 deliverable code, doc, or test has been written.

## 6. Conventions honored

- **Hard-Rule-2 (HEAD wins)** — every drift between charter and HEAD
  resolved in HEAD's favor; documented above.
- **Convention-8 (no assertion from memory)** — every claim grep- or
  exec-verified at the moment of writing.
- **Convention-M (re-anchor first)** — preflight + replay executed
  against HEAD before any Stage 1 work began. Stage 1 work has not
  begun.
- **Append-only audit discipline (spec § 7.5)** — this report is a
  new file; no prior audit edited.
- **P20 (replay BLOCKED)** — verdict BLOCKED, evidence cited, gate
  identified, surface to operator. Phase 0 foundation is suspect by
  the strict letter of the replay's exit code; the agent declines to
  proceed.

— end of audit —
