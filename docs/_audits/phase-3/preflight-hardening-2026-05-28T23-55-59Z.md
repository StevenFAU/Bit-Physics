---
date: 2026-05-28T23-55-59Z
author: tooling-hardening (infra task, outside any sub-phase — Convention I) (Claude Code)
subject: Harden tools/dispatch/preflight-phase.py against the two stale-tooling false-positives (F1 integrity env-binding; F2 phantom port-dir layout) that tripped ACTION #1 of the rigid-body (task-4) preflight.
verdict: LANDED — preflight 3 exit 1 -> 0; integrity count invariant unchanged (0 HF / 14 SW); fix at 4bc150c.
head_sha: b741533c22a713200f751d39daa0530eec4da81a
fix_sha: 4bc150c
authority_audit: docs/_audits/phase-3/sub-phase-phase-3-rigid-body-preflight-drift-2026-05-28T22-50-13Z.md
authority_audit_commit: 7d52ce1
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_before: 6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac
integrity_digest_after: 6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac
integrity_invocation: uv run python -m integrity --all --mode strict   # canonical (CI integrity.yml:25)
preflight_exit_before: 1
preflight_exit_after: 0
stale_install_path: /home/otacon/Projects/GPU-Sims/GPU-Sims/tools/integrity/integrity
phase_4_disposition: 4-of-5 phantom paths repointed (layout root only); learned-dynamics SURFACED (not swapped)
d_tag: NO
evidence_paths:
  - tools/dispatch/preflight-phase.py
  - .github/workflows/integrity.yml
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-preflight-drift-2026-05-28T22-50-13Z.md
---

# Tooling-hardening — `preflight-phase.py` stale-tooling false-positives (F1 + F2)

## Scope & authority

Infra task per **Convention I** (outside any sub-phase, trunk-based to `main`,
D-TAG NO). Authority: the rigid-body (task-4) plan-drafting block audit
`docs/_audits/phase-3/sub-phase-phase-3-rigid-body-preflight-drift-2026-05-28T22-50-13Z.md`
(committed `7d52ce1`), findings **F1** and **F2**. That audit found ACTION #1
(`preflight-phase.py 3`) exited 1 on two independent stale-tooling
false-positives while the genuine Phase-3 preconditions were independently MET.

**SCOPE GUARD honoured:** only `tools/dispatch/preflight-phase.py` was edited
(diffstat: 1 file, +41 / -15). No rigid-body artifacts, sim code, or other files
touched. No test file exists under `tools/dispatch/` and none was added (net-new
scope; surfaced as a candidate below).

## Re-anchor (probe before edit, Convention #8/M)

The authority audit's line numbers are anchor sketches; the current lines were
grepped before editing. Probe results (FACT):

- **F1 — integrity call.** `phase_{1..5}_preflight` each invoked
  `check_command([sys.executable, "-m", "integrity", "--all"], ...)`. On this
  machine `python3 -m integrity` (== `sys.executable -m integrity`) resolves to
  a **stale pre-rename editable install**:
  `/home/otacon/Projects/GPU-Sims/GPU-Sims/tools/integrity/integrity/__init__.py`
  (confirmed via `python3 -c "import integrity; print(integrity.__file__)"`).
  That build predates the `--all` flag, so argparse errors `unrecognized
  arguments: --all` (exit 64) regardless of THIS repo's state.
- CI canonical form (FACT): `.github/workflows/integrity.yml:25` runs
  `uv run python -m integrity --all` (working-directory `tools/integrity`).
  `uv run python -m integrity --all` from repo root resolves to this workspace's
  pinned build and is GREEN (exit 0).
- **F2 — port-dir checks.** `phase_3_preflight` checked four phantom
  category-folder paths. None of `continuous-ca/`, `particle-fluid/`,
  `hybrid-pg/` (nor `volumetric-grid/`, `rigid-body/`) exist as top-level dirs.
  All four real sims exist under `packages/` (FACT, `ls -d packages/*/`):

  | phantom path (before) | real path (after) | exists |
  |---|---|---|
  | `continuous-ca/reaction-diffusion-2d/ref-stack-c` | `packages/reaction-diffusion-2d-stack-c` | yes |
  | `continuous-ca/reaction-diffusion-2d/ref-stack-d` | `packages/reaction-diffusion-2d-stack-d` | yes |
  | `particle-fluid/sph-water/ref-stack-d` | `packages/sph-water-stack-d` | yes |
  | `hybrid-pg/mpm-multimaterial/ref-stack-e` | `packages/mpm-multimaterial-stack-e` | yes |

- **"phase_4 branch"** (INFERENCE→FACT): there is no `phase_4` git branch
  (`git branch -a` shows none). The dispatch's "phase_4 branch" = the
  `phase_4_preflight()` function in the same file. It carries the identical
  phantom-path staleness (`continuous-ca/lenia`, `continuous-ca/neural-ca`,
  `rigid-body/articulated-pedagogical`, `soft-body/cloth-xpbd`,
  `learned-dynamics`).

## Fixes applied

### F1 — env-independent integrity invocation (durable; load-bearing)

Hoisted a module constant
`INTEGRITY_CMD = ["uv", "run", "python", "-m", "integrity", "--all"]` and
repointed all five phase preflights (`phase_1..5`) to it, replacing the
`sys.executable`-bound form. This mirrors `integrity.yml` and resolves to this
workspace's integrity build regardless of any stray editable install first on
the bare interpreter's path. A `NOTE` comment documents the root cause inline.

### F2 — Phase-3 port-dir paths

Repointed the four checks to the live `packages/<sim>-stack-X` paths (table
above), with a `NOTE` recording the never-adopted-layout root cause.

### Forward-looking — Phase-4 (bounded)

Repointed the four **category-prefixed** Phase-4 sim paths to `packages/<sim>`:
`packages/lenia`, `packages/neural-ca`, `packages/articulated-pedagogical`,
`packages/cloth-xpbd`. **Layout ROOT only** — the three not-yet-built sims
(`neural-ca`, `articulated-pedagogical`, `cloth-xpbd`) still FAIL, *correctly*,
against their real target path, so the precondition's intent is preserved (it
does not pass spuriously).

**`learned-dynamics` — SURFACED, not swapped.** It is a bare single-segment
category, not a `category/sim` pair, so there is no mechanical layout-root swap
and the concrete Phase-3 learned-dynamics sim folder under `packages/` is not
yet built nor knowable from here. Per the dispatch ("more entangled than a
path-string swap → leave it and SURFACE; do NOT guess"), it was left unchanged
and flagged in an inline `NOTE` for resolution when that sim lands.

## Verification (FACT)

| check | before | after |
|---|---|---|
| `python3 tools/dispatch/preflight-phase.py 3` exit | 1 | **0** (ALL PASSED) |
| `python3 tools/dispatch/preflight-phase.py 4` integrity check | FAIL (`--all` unrecognized) | PASS |
| `python3 tools/dispatch/preflight-phase.py 4` port-dir checks | 5 phantom-path FAILs | repointed: `packages/lenia` PASS; `neural-ca`/`articulated-pedagogical`/`cloth-xpbd` FAIL correctly (unbuilt); `learned-dynamics` FAIL (surfaced) |
| `uv run python -m integrity --all --mode strict` | 0 HF / 14 SW, exit 0 | **0 HF / 14 SW, exit 0** |

Note: `python` is not on PATH on this machine (only `python3`); the dispatch's
`python tools/dispatch/preflight-phase.py` must be run as `python3 …`. This is
orthogonal to F1/F2 and not in scope to fix (it is the operator's shell, not the
tool).

**Count invariant (§R) HELD.** 0 HARD_FAIL / 14 SOFT_WARN before and after; the
fix did not change the count. The full-report sha256 digest is byte-identical
before and after (`6096fa35cc2aa35c…90c7e1ac`) — expected, since the edited
source file is not itself an integrity-scanned audit and this audit was not yet
committed at measurement time. Per the r2-credentials-durability landing, the
**counts** are the invariant, not the digest (which drifts as the audit trail
grows).

## Phase_4 disposition

4 of 5 Phase-4 phantom paths repointed (layout root, intent preserved);
`learned-dynamics` SURFACED, not guessed. No phase-4 logic beyond path strings
was entangled. The integrity invocation in `phase_4_preflight` (and 1, 2, 5) is
fixed by the shared `INTEGRITY_CMD` constant.

## Operator action — stale editable install

The load-bearing fix is the `uv run` change; the stale install is **not**
removed by this task (operator's to remove). Exact path:

```
/home/otacon/Projects/GPU-Sims/GPU-Sims/tools/integrity/integrity
```

Removing it would also let a bare `python3 -m integrity` resolve correctly, but
the preflight no longer depends on that.

## Surfaced (not owned here)

- **No `tools/dispatch/` test coverage.** A regression test asserting
  `phase_3_preflight()` PASSES and that `INTEGRITY_CMD` is the `uv run` form
  would lock these fixes in. Net-new scope (no test harness exists under
  `tools/dispatch/`); candidate follow-up.
- **`learned-dynamics`** Phase-4 path needs a concrete `packages/<sim>` target
  when the learned-dynamics sim lands.
