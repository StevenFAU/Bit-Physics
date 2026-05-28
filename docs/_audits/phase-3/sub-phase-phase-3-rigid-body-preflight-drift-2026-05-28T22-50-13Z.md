---
date: 2026-05-28T22-50-13Z
author: phase-3 rigid-body-pedagogical plan-drafting (Claude Code)
subject: task-4 rigid-body-pedagogical (sub-phase 3.3) — ACTION #1 preflight exited 1; STOP filed per dispatch. Verdict — STALE-TOOLING FALSE-POSITIVE, genuine Phase-3 preconditions CONFIRMED MET.
verdict: STOP (preflight exit 1) — preconditions independently verified MET; awaiting operator routing
head_sha: 2da281a5eae38adc33ae9880c505ae331275773e
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac
integrity_invocation: uv run python -m integrity --all --mode strict   # canonical (CI integrity.yml:25); NOT bare `python3 -m integrity`
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]   # not re-swept this session (plan-drafting, halted at ACTION #1)
stop_reason: preflight-phase.py 3 exit 1 — two independent stale-tooling false-positives; dispatch directs STOP on exit 1
evidence_paths:
  - tools/dispatch/preflight-phase.py
  - .github/workflows/integrity.yml
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/phases/sub-phase-phase-3-lenia.md
  - docs/_audits/phase-3/progress.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-preflight-drift-2026-05-28T22-50-13Z.md
findings:
  - F1-env: `python3 -m integrity` resolves to a STALE editable install at /home/otacon/Projects/GPU-Sims/GPU-Sims/tools/integrity/integrity (pre-rename project root) which lacks the `--all` flag → preflight's integrity check errors out. Canonical `uv run` resolves to THIS repo and is GREEN.
  - F2-layout: preflight-phase.py:308-312 checks four phantom category paths (continuous-ca/.../ref-stack-c, particle-fluid/sph-water/ref-stack-d, hybrid-pg/mpm-multimaterial/ref-stack-e) — a never-adopted layout. All four sims EXIST under packages/<sim>-stack-X.
  - F3-dispatch-framing: dispatch + plan §6.4 (line 1565/1594-95) prescribe a "NEW top-level rigid-body/ folder" mirroring "hybrid-pg/ volumetric-grid/ particle-fluid/" — none of which exist. Live convention = packages/<sim>/. RESOLVED-BY-PRECEDENT (§0.3; lenia/ising D-LAYOUT), NOT a novel STOP.
---

# Phase 3 task-4 rigid-body-pedagogical — plan-drafting halted at ACTION #1 (preflight exit 1)

## Verdict

`python tools/dispatch/preflight-phase.py 3` exited **1**. The dispatch directs:
"Exit 1 → file the block audit and STOP." This audit is that block report.

**However, the exit-1 is a STALE-TOOLING FALSE-POSITIVE on two independent
axes. The genuine Phase-3 preconditions are independently CONFIRMED MET.** This
audit documents both root causes with exact fixes and pre-resolves the one
load-bearing question (folder layout) so operator routing is a single decision.

I halted at ACTION #1 per the explicit directive and did **not** draft the
charter. This file is written but **NOT committed** — the resolution path
(fix env / harden preflight / ratify-and-proceed) determines what the permanent
record should say, and that routing is the operator's.

## What the preflight reported

```
[PASS] prior-phase-tag:v0.2.0-phase-2
[PASS] path-exists:common/common-warp
[PASS] path-exists:docs/common/warp.md
[FAIL] path-exists:continuous-ca/reaction-diffusion-2d/ref-stack-c
[FAIL] path-exists:continuous-ca/reaction-diffusion-2d/ref-stack-d
[FAIL] path-exists:particle-fluid/sph-water/ref-stack-d
[FAIL] path-exists:hybrid-pg/mpm-multimaterial/ref-stack-e
[FAIL] integrity-all-green
       exit=64; integrity: error: unrecognized arguments: --all
=== FAILED ===
```

## Finding F1 — `integrity --all` failure is an environment-resolution artifact

- `tools/dispatch/preflight-phase.py:316` runs `[sys.executable, "-m", "integrity", "--all"]`.
- In this session `python3 -m integrity` resolves to a **stale editable install
  outside this repo**:
  `/home/otacon/Projects/GPU-Sims/GPU-Sims/tools/integrity/integrity`
  (the pre-rename "GPU-Sims" project root). That old build predates the `--all`
  flag, so argparse errors with `unrecognized arguments: --all`.
- THIS repo's source **does** define `--all`
  (`tools/integrity/integrity/__main__.py:33`).
- The canonical invocation — the one CI uses
  (`.github/workflows/integrity.yml:25` → `uv run python -m integrity --all`) —
  resolves to `/home/otacon/Projects/Bit-Physics/tools/integrity/integrity` and
  is **GREEN**:

  ```
  $ uv run python -m integrity --all --mode strict
  summary: 0 HARD_FAIL, 14 SOFT_WARN        # exit 0
  ```

  - Invariant **0 HARD_FAIL / 14 SOFT_WARN** — matches the established Phase-3
    baseline (per the r2-credentials-durability landing: verify the 0HF/14SW
    counts, not a frozen digest).
  - Full-report digest at HEAD `2da281a`: `6096fa35cc2aa35c…90c7e1ac`
    (informational; digest drifts with audit-trail growth — counts are the
    invariant).

**Conclusion:** integrity is green. The preflight failure is solely a wrong
interpreter/environment binding, not a repo state failure.

**Operator-actionable:** the stale `GPU-Sims/GPU-Sims` editable install should
be removed (or the preflight hardened to invoke via `uv run`, matching CI), so
ACTION #1 of every future Phase-3/4 dispatch stops tripping. The bare
`python3 -m integrity` path is unsafe on this machine until then.

## Finding F2 — the four "missing port directory" checks encode a never-adopted layout

`tools/dispatch/preflight-phase.py:307` requires:

| preflight phantom path | actual live path | exists? |
|---|---|---|
| `continuous-ca/reaction-diffusion-2d/ref-stack-c` | `packages/reaction-diffusion-2d-stack-c` | **yes** |
| `continuous-ca/reaction-diffusion-2d/ref-stack-d` | `packages/reaction-diffusion-2d-stack-d` | **yes** |
| `particle-fluid/sph-water/ref-stack-d` | `packages/sph-water-stack-d` | **yes** |
| `hybrid-pg/mpm-multimaterial/ref-stack-e` | `packages/mpm-multimaterial-stack-e` | **yes** |

The repo has **no** `continuous-ca/`, `hybrid-pg/`, `volumetric-grid/`, or
`particle-fluid/` top-level directory. The Phase 0 template author wrote the
Phase-3 (and Phase-4) preflight against a category-folder layout the project
never adopted; Phase 1/2 settled on `packages/<sim>/`. All four Phase-2 port
deliverables exist under their real `packages/` paths.

**Conclusion:** the "Phase 2 port directories" precondition is MET; the check
strings are stale. (The same staleness sits in `phase_4_preflight` —
`continuous-ca/lenia`, `rigid-body/articulated-pedagogical` — and will misfire
identically when Phase 4 begins.)

**Operator-actionable:** repoint these four checks to the `packages/` paths.

## Finding F3 — the dispatch's "NEW top-level rigid-body/ folder" framing is resolved-by-precedent, not a STOP

The dispatch (and plan §6.4, `docs/phases/phase-3-plan.md:1565`,`:1594-1595`)
instruct me to design a **"NEW top-level `rigid-body/` folder"** and mirror
**"per-category folder layouts (hybrid-pg/, volumetric-grid/, particle-fluid/)."**
Those category folders do not exist. The same tension already arose for task-3
(plan prescribes `continuous-ca/lenia/python/`) and was resolved on evidence:

- Plan **§0.3** (`docs/phases/phase-3-plan.md:138`,`:968`): *"Existing
  convention … differs from §3.2 prescription | Per §0.3, follow the existing
  convention. Document SHIFTED in §1."*
- Precedent: lenia landed at `packages/lenia/` (D-LAYOUT RESOLVED-ON-EVIDENCE,
  no plan edit); ising-classical at `packages/ising-classical/`.

**Conclusion / default call for the charter (per LEAN-DON'T-WAIT):** the
rigid-body sim goes to **`packages/articulated-pedagogical/`** (mirroring
`packages/lenia/`, `packages/ising-classical/`), declared **SHIFTED per §0.3**,
**no plan edit**. This is not a STOP — it is the established precedent. It is
recorded here so the operator can wave it through with the rest of the routing.

## Genuine Phase-3 preconditions — independently verified MET

| precondition | status | evidence |
|---|---|---|
| prior-phase tag `v0.2.0-phase-2` | MET | `git tag` |
| `common/common-warp` + `docs/common/warp.md` | MET | preflight PASS |
| Phase-2 port sims present | MET | F2 table (packages/) |
| integrity green (0 HF / 14 SW) | MET | F1 (`uv run`) |
| working tree clean @ `2da281a` (== origin/main) | MET | `git status` |

## Recommended operator routing (single decision)

1. **Tooling (F1+F2):** remove the stale `GPU-Sims/GPU-Sims` editable install
   and/or harden `preflight-phase.py` (invoke integrity via `uv run`; repoint
   the four port-dir checks to `packages/`). Optionally fold the Phase-4 port
   paths in the same pass.
2. **Proceed (F3):** ratify "preconditions MET — draft the charter," with the
   folder decision resolved to `packages/articulated-pedagogical/` per §0.3.
   On ratification, plan-drafting resumes from the READ + PROBE steps with no
   substantive blocker. (No charter content depends on the preflight beyond the
   precondition check this audit already discharged.)

## What did NOT run

Charter not drafted; READ/PROBE of common-warp surfaces, golden schema,
tolerance-budget cap, and citation web-fetches not performed (halted at
ACTION #1 per the exit-1 STOP directive). No commit; no tag; no push.
