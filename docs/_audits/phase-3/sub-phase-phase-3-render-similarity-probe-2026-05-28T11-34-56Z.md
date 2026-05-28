---
date: 2026-05-28T11-34-56Z
author: phase-3 render-similarity plan-drafting (Claude Code)
subject: Phase 3 second sub-phase — render-similarity ANCHOR-PROBE
verdict: CONFIRMED
head_sha: 01764a6a462e7f15b8a1a68e494744c380c31e86
prior_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
scope_note: >
  Probe-only artifact. Every concrete claim is tagged FACT / INFERENCE / WEB and
  cites full repo-relative `path:line` for repo facts. WEB-FACTs (PyPI versions,
  security-advisory status) are captured at probe time with the fetched URL.
  This probe re-anchors the phase-3-plan-encoded scope (§6.2 + §3.2.2 + §2.12 +
  §3.5 + §6.0) for the second Phase-3 sub-phase (task-2 render-similarity, the
  remaining infrastructure root) against HEAD before the charter is drafted; it
  does NOT re-author DELIVERABLES / OUT OF SCOPE / ANCHOR-PROBE content from §6.2.
evidence_paths:
  - docs/phases/phase-3-plan.md
  - docs/phases/sub-phase-phase-3-common-3dgs.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/equivalence/harness.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/pyproject.toml
  - tools/testkit/mutation/mutmut-config.toml
  - tools/integrity/tests/test_adversarial_coverage.py
evidence_hashes:
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/phases/sub-phase-phase-3-common-3dgs.md: sha256:baacf95280042684ae38b9336b0a00cab8d582b7eb4514d71bb5c9cdd224f1e4
  tools/testkit/equivalence/harness.py: sha256:4a1478c86b1e23aa4ab89faf17286290305c94d999db0ca7f627ef24acff9958
  tools/testkit/equivalence/tolerance.toml: sha256:af42cac965de8f368f945f9b4dee325debcaca3950738493d724e06cb2f97111
  tools/testkit/equivalence/tolerance-schema.json: sha256:d4e57cc4f84ea196f6b438c5edcd00c3f45eebdb9a84b0146bf1127c7fbee9c2
  tools/testkit/pyproject.toml: sha256:4d2c6d71059399e20fe4a9f10a896d04edea024e5a84cde55c141f13819ee811
  tools/testkit/mutation/mutmut-config.toml: sha256:d60b28fee41f00b271f3b5326452d1f2f0f161600ba2947a8151d420e87d1a89
---

# Phase 3 second sub-phase (render-similarity) — anchor-probe report

> Sibling of `docs/phases/sub-phase-phase-3-render-similarity.md` (the charter).
> This document holds the probe FACTs + INFERENCEs + WEB-FACTs; the charter
> summarizes + routes. Posture per Convention #8 (grep-verify, no fabrication)
> and Convention M (HEAD wins on drift). Probe run UTC `2026-05-28T11-34-56Z`.

## §0 — Mission re-statement

Determine the SECOND Phase-3 sub-phase. The §3.1 deliverable map
(`docs/phases/phase-3-plan.md:319-334`) has exactly two hard-blocking infrastructure
roots — task-1 common-3dgs (LANDED at `v0.2.2-sub-phase-phase-3-common-3dgs`) and
task-2 render-similarity. The first-sub-phase determination ratified D-A
"hold task-1 first" (common-3dgs plan-drafting audit § 5); the remaining
infrastructure root (task-2) is the natural second sub-phase. This probe
re-anchors the §6.2 + §3.2.2 surfaces against HEAD before the charter drafts.

## §1 — State checks (FACT)

All re-run at HEAD `01764a6` (Convention M — `git rev-parse HEAD` ==
`git rev-parse origin/main`; no successor commit at probe time):

| Check | Expectation | Result |
|---|---|---|
| HEAD on `origin/main` | clean | `01764a6` ✓ |
| `v0.0.0-phase-0` resolves | yes | `727ffb9b513f…` ✓ |
| `v0.1.0-phase-1` resolves | yes | `990856502ac4…` ✓ |
| `v0.2.0-phase-2` resolves | yes | `fd21445614d2…` ✓ |
| `v0.2.1-sub-phase-lfs-architecture` resolves | yes | `8f4dea3069fb…` ✓ |
| `v0.2.2-sub-phase-phase-3-common-3dgs` resolves | yes | `07aa1f5c87ae…` ✓ |
| Integrity Cat 1–5 sweep | 0 HARD_FAIL / 14 SOFT_WARN, digest `c19492ad…d22cb52` | **byte-identical** (`uv run python -m integrity --all --mode strict` → stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`; summary line `0 HARD_FAIL, 14 SOFT_WARN`) ✓ |
| `uv sync --all-packages` | clean | dev extras present (`pytest`, `ruff`, `mutmut`, `pytest-timeout`, `pytest-cov`, `toml`) ✓ |

**Invariants I1–I7 hold at HEAD** (I3 byte-identical baseline; I7 test 16/16 from
the lfs/cleanup arc; I4 / I6 carried). I2 replay verified per §1.2.

### §1.1 — verify_evidence sweep across prior landing audits + all Phase-3 stage audits (FACT)

`uv run python -m integrity.scripts.verify_evidence --audit <A>`, all PASS / 0 fail
on every Phase-3 audit (incl. the BLOCKED stage-0 artifact, per the dispatch):

| Audit | Result |
|---|---|
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md` | 4 pass / 0 fail @ `b6230663b1d6` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md` | 0 pass / 0 fail @ `44cc8cbfadc4` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md` | 7 pass / 0 fail @ `6dd5494f2b7a` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md` | 12 pass / 0 fail @ `a376ee2e900e` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md` | 12 pass / 0 fail @ `f19b525fd986` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md` | 14 pass / 0 fail @ `9121e31459cc` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md` | 16 pass / 0 fail @ `d8e4c483b47a` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md` | 22 pass / 0 fail @ `e4011f2c0b58` |

No new regression on any Phase-3 audit (incl. the BLOCKED artifact, which the
dispatch flagged specifically). Pre-existing fails reported on phase-0/1/2
checkpoint/blocked-replay artifacts are **historical** (unchanged across the
landed common-3dgs sub-phase per its probe §1.1 + Stage-0 sweep + landing-audit
sweep) → no STOP-H condition.

### §1.2 — Cross-phase replay (FACT — for the dispatch's awareness; charter routes Stage-0 replay)

Stage-0 will run `replay_prior_phase --prior-phase phase-2`; the I2 bit-identity
invariant against `v0.1.0-phase-1` (`9399fc33…718909f34`) was last verified at
common-3dgs Stage-0 (CONFIRMED audit §1.1 row `replay --prior-phase phase-1` →
`ok=True` 8/8); replay against `v0.2.0-phase-2` and `v0.2.2-…-common-3dgs` is
Stage-0 work for this sub-phase (per the charter Stage-0 entry conditions). The
[[replay-needs-lfs-cache-recovery]] caveat applies: replays may need the local
`.git/lfs/objects/<2>/<2>/<oid>` cache repopulated from byte-identical working-
tree content (OID==sha256) under agent sessions where the LFS backend is unreachable.

## §2 — Phase-3-specific surfacings (consumed by the charter)

### §2.1 — Phase 3 pre-dispatch-review status (FACT — historical context)

`docs/_audits/phase-3/pre-dispatch-review-*.md` does NOT exist, AND the common-3dgs
Stage-0 CONFIRMED audit recorded the operator-ratified **STOP-B removal** (`docs/_audits/phase-3/progress.md:31,36`) — "pre-dispatch-review overhead retired;
charter ratification substitutes." This is settled at the Phase level and does
NOT regate this sub-phase. The render-similarity charter inherits this ratified
posture (Convention M — operator-ratified state wins over the v9 amendment).

### §2.2 — External-SHA pinning status: **NOT APPLICABLE** to render-similarity (FACT)

Render-similarity vendors **no git upstream**. Its deps are PyPI:
- `scikit-image` (already a transitive consideration; not in `tools/testkit/pyproject.toml` yet — grep `scikit-image` → no hit in repo manifests at probe).
- `lpips` (NEW PyPI dep; not present at probe).
- `torch` (transitive of `lpips`; declare in manifest per §6.2 deliverable E).

The §2.18 pin table (`docs/phases/phase-3-plan.md:258-318`) covers the five git
upstreams (Inria, PhysGaussian, Bender, PhysicsNeMo, Lenia); none gate task-2.
The dispatch's expectation "no git upstream is vendored" is **CONFIRMED**. The
STOP-A-analog for task-2 is PyPI dep-pinning — handled at Stage 0 via the WEB-
fetched versions in §3.2 below.

### §2.3 — Legacy-capture .h5 fixture status (FACT — confirms dispatch hypothesis)

The phase-3-plan §11.3-style "schema-corpus growth fixture per sim" rule
(`docs/phases/phase-3-plan.md:42` v9 amendment carry; common-3dgs Stage-1b/1c
encoded as `tests/fixtures/legacy-captures/phase-3-common-3dgs.h5`) targets
**each sim task** (writes a capture, the fixture is its representative). Task-2
is INFRA, writes no capture, has no representative fixture. The fixture-growth
discipline therefore does NOT apply to render-similarity. The dispatch's
hypothesis ("likely no legacy-capture .h5 fixture") is **CONFIRMED**. The
SIBLING-FIXTURE-LFS basket (banked at common-3dgs Stage 2, the 12 pre-existing
`tests/fixtures/legacy-captures/` placeholder fixtures from `v0.1.0-phase-1`)
is a **separate** dir from render-similarity's planned adversarial fixtures
(`tools/integrity/tests/fixtures/adversarial/...` or the design-shifted
testkit-local location, §3.5 below) — **no overlap, no regression risk**.

## §3 — Surface probes (consumed by the charter)

### §3.1 — Render-similarity module presence at HEAD (FACT — both forms ABSENT)

Net-new sub-phase. Neither location resolves at HEAD:

```
$ find tools/testkit -name 'render_similarity*' -o -name '*render_similarity*' 2>/dev/null
(no output — neither form present)
```

Equivalence module content at HEAD (`tools/testkit/equivalence/`):
```
harness.py    __init__.py    tests/
tolerance-budget.toml   tolerance-schema.json   tolerance.toml
```

→ **D-LOC is unconstrained by HEAD evidence**; the §3.2.2-vs-§6.2 plan conflict
resolves via the dispatch's structural ruling: §3.2.2 (Interface contracts) is
the most-recent normative statement (`docs/phases/phase-3-plan.md:373-405`), v8
locked-item-3 (`:64`) + v4 amendment-4 (`:75`) both name `tools/testkit/render_similarity/`
(underscored package under tools/testkit/). The §6.2 prompt + §3.1 deliverable
map (`:324`) + §6.2 INTERFACE block (`:1212`) name `tools/testkit/equivalence/render_similarity.py`
(file under equivalence/). The §6.2 form is the **stale** form (parallel
mechanism to common-3dgs §6.1's `GaussianSet`/`forward_splat` staleness; charter
§1.3 of the common-3dgs charter governs that pattern explicitly).

**Resolution (charter records this):** `tools/testkit/render_similarity/`
package (per §3.2.2 + v8/v4 amendments; see charter § 1.3). Stale §6.2 +
§3.1-deliverable-map references **surfaced, not edited** (D1-style narrow
carve-out — plan-edits only land via operator-approved separate commits per the
common-3dgs precedent; the K-2 fix in common-3dgs plan-drafting was a
pre-banked cleanup, this is not). Consumer import path: `from render_similarity
import psnr, ssim, lpips` (task-6 / task-8 consume by this contract).

### §3.2 — PyPI dep versions (WEB — fetched 2026-05-28)

Convention #8 — record source + version + advisory status as FACT so Stage 0
acts on the recorded values, not memory:

| Package | Latest stable | Source | Release | requires-python | Security advisories |
|---|---|---|---|---|---|
| `lpips` | **0.1.4** | `https://pypi.org/pypi/lpips/json` | 2021-08-25 | not specified | **none** (`https://github.com/advisories?query=lpips` → 0 advisories) |
| `scikit-image` | **0.26.0** | `https://pypi.org/pypi/scikit-image/json` | (recent; not yanked) | `>=3.11` (project requires `>=3.12` per `tools/testkit/pyproject.toml:8` — compatible) | **none open** (`https://github.com/scikit-image/scikit-image/security/advisories` → "no published security advisories") |

`torch` is the transitive dep of `lpips`; declare in `tools/testkit/pyproject.toml`
explicitly (matches the existing posture for `numba`/`numpy`/etc.). Versioning
of `torch` will be governed by `lpips`'s compatibility window; Stage 0 records
the resolved pin.

**Note on `lpips` age (FACT).** The package is from 2021-08-25 (current dep cap
~4.5 years); release cadence has been very low (single 0.1.x line). This is
typical for academic perceptual-loss packages but means:
- The package vendors pretrained weights internally OR downloads on first use
  (D-WEIGHTS interrogates this at Stage-1b probe).
- Any patches/fixes the project needs (CPU-only path, weight-cache control, eval
  determinism) must be tested under the same release; no patch upstream is
  realistic.

### §3.3 — Existing harness shape (FACT — Stage-1a design input)

`tools/testkit/equivalence/harness.py` exposes a **programmatic** API,
**no CLI** at HEAD:
- `compare_captures(left: Path, right: Path, tolerance_table_path: Path | None) -> EquivalenceVerdict` (`tools/testkit/equivalence/harness.py:86-185`).
- `load_tolerance_table(path: Path) -> dict` (`:50-59`).
- `EquivalenceVerdict` dataclass (`:30-41`).
- Resolution is field-by-field numeric tolerance on capture-manifest fields.

The §3.2.2 spec describes an invocation:
```
python -m equivalence.harness \
  --mode render-similarity \
  --left <capture-dir-or-image-sequence> \
  --right <capture-dir-or-image-sequence> \
  --tolerance-key <e.g., continuous-ca.neural-ca>
```

→ **At HEAD there is no `--mode` flag, no `__main__.py` in `equivalence/`, no
CLI**. Stage 1a will need to either (a) ADD a CLI wrapper around `compare_captures`
+ dispatch to a new `render-similarity` mode, or (b) keep numeric tolerance
purely-programmatic and ship the render-similarity surface as a SEPARATE entry-
point. The charter routes this as a **Stage-1a probe item** (D-HARNESS-CLI), not
a formal D-class — the operator does not need to choose between (a)/(b) until
Stage 1a probes the consumer shape (task-6 + task-8 call site).

Additionally, `compare_captures` pairs **capture manifests**, not **image
sequences** — task-6/task-8 may consume the metric *functions* directly (from
their own test code) without going through the equivalence harness mode. The
function-level surface (`psnr` / `ssim` / `lpips`) is the **hard** dependency
per §3.1 row 3.x; the harness mode is the **convenient CLI dispatch** but not
the only consumption path. Stage 1a's probe confirms the consumer pattern.

### §3.4 — Existing tolerance.toml schema (FACT — Stage-1a design input)

`tools/testkit/equivalence/tolerance.toml` + `tolerance-schema.json` define
a JSON-Schema-validated table:
- `[defaults.<category>] {relative, absolute}` — numeric per-category caps.
- `[overrides.<sim-name>] {category, relative, absolute}` — per-sim overrides.

The §3.2.2 schema addition (`docs/phases/phase-3-plan.md:396-403`) prescribes:
```toml
[<category>.<sim>]
psnr_min = <float>
ssim_min = <float>
lpips_max = <float>
```

→ This is a **different shape** from the existing `[defaults.…]` / `[overrides.…]`
tree; render-similarity metrics are **thresholds** (lower-bound on PSNR/SSIM;
upper-bound on LPIPS), NOT relative/absolute tolerances on a numeric field. The
tolerance schema therefore needs an **additive top-level section** (e.g. a
`[render_similarity.<category>.<sim>]` table tree distinct from `[defaults.…]`)
to avoid breaking the existing schema validation. Or it could ship as a
**separate file** (`render-similarity-tolerance.toml`) loaded by the new mode.
**Charter routes this as a Stage-1a probe item** (D-SCHEMA — surface, not a
formal D-class).

### §3.5 — Adversarial-fixture pattern (FACT — surface for charter)

`tools/integrity/tests/fixtures/adversarial/` holds **six** integrity fixture
families (`cat1_broken_citations`, `cat2_phantom_contracts`, `cat3_wrong_goldens`,
`cat4_unverified_assertions`, `cat5_orphan_claims`, `catx_over_budget_tolerance`).
Each fixture dir has a `manifest.json` of shape:
```json
{ "check": "cat3.golden-values", "fixture_files": [...],
  "expected_findings_min": 1, "severity": "SOFT_WARN_or_HARD_FAIL" }
```
The meta-test (`tools/integrity/tests/test_adversarial_coverage.py`) iterates
each family and invokes the matching `run_catN_*` integrity check, asserting
≥ `expected_findings_min` findings. This is **the integrity toolkit's
correctness gate** — a fixture is "adversarial" because some `run_catN_*`
function should detect it.

**Render-similarity is NOT an integrity check** (no `run_catN_*` handler).
v9's amendment (`docs/phases/phase-3-plan.md:1250`) proposed
`tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/` —
but `cat3` is the numerical-golden integrity check, and render-similarity has
no `run_cat3_render_similarity` handler. **Placing render-similarity adversarial
fixtures under `tools/integrity/...` would silently break the integrity meta-
test contract** (the test would discover the new fixture dir, fail to find a
matching `run_catN_*` handler, and either NOOP or error).

→ **Resolution (charter records this as DESIGN-SHIFTED):** render-similarity
adversarial fixtures live under the render-similarity module's **own** tests
directory (`tools/testkit/render_similarity/tests/fixtures/adversarial/`) with
a parallel meta-test (`tools/testkit/render_similarity/tests/test_adversarial_coverage.py`)
that invokes the metric functions directly. This **mirrors** the integrity
adversarial pattern in form (manifest.json + meta-test loop) but is owned by
the testkit module under test, not by integrity. Surface only; no edit of
`phase-3-plan.md`.

### §3.6 — Mutmut config pattern (FACT — Stage-1c design input)

`tools/testkit/mutation/mutmut-config.toml` holds per-target sections of shape:
```toml
[targets.<target_name>]
path      = "<repo-relative-source-tree>"
threshold = 0.80
runner    = "uv run --no-sync pytest <test-dir> -x -q --tb=no"
```

common-3dgs is registered at `:241-244` (target `common_3dgs`, path
`common/common-3dgs/src/common_3dgs`, threshold 0.80, runner pytests the
common-3dgs suite from repo root). render-similarity will register an analogous
target — Stage 1c work; charter Stage-1c § notes the registration.

Threshold for render-similarity is **≥ 0.85** (phase-3-plan.md:1248 v9
amendment: "Mutation threshold ≥ 85% (higher than standard 80% because false-
negatives here let broken neural sims ship"). This is **higher** than common-3dgs's
0.80 floor.

### §3.7 — Capture format (FACT — for completeness; render-similarity may not use)

`tools/testkit/capture/` holds the canonical capture writer/reader/manifest.
The §3.2.2 invocation describes "capture-dir-or-image-sequence" pairing; the
**precise** input form (capture files via `tools/testkit/capture/` vs raw image
sequences via `PIL`/`imageio`) is a Stage-1a probe item (depends on how task-6
+ task-8 will *invoke* the harness mode, which is consumer-shape-dependent).

## §4 — Inherited-vs-reframed surfaces (for the charter §1.3)

The render-similarity §6.2 prompt (`docs/phases/phase-3-plan.md:1189-1280`)
carries v8 single-agent-sequential machinery + at least one stale surface (the
D-LOC issue) that must be re-framed under the matured per-sub-phase cadence:

| §6.2 surface | Stale form | Governing form (charter follows) |
|---|---|---|
| Module location | `tools/testkit/equivalence/render_similarity.py` (`:1212`, deliverable A `:1254`) + §3.1 row 2 (`:324`) | `tools/testkit/render_similarity/metrics.py` package per §3.2.2 (`:375`) + v8 locked-item-3 (`:64`) + v4 amendment-4 (`:75`) — **§3.2.2 governs on conflict** |
| Branch / PR ceremony | `BASE BRANCH: phase-3-integration`, `phase-3/task-2-render-similarity`, `gh pr create`, MERGE PROTOCOL (`:1201-1202`, `:1273`) | trunk-based to `main` (v8 amendment `:46`) → matured Stage 1a/1b/1c/2 cadence |
| Adversarial-fixture path | `tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/` (`:1250` v9 amendment) | testkit-local `tools/testkit/render_similarity/tests/fixtures/adversarial/` with its own meta-test (§3.5 above) — DESIGN-SHIFTED, **surface only** |
| Pre-dispatch-review gate | required for first dispatch (v9 `:34`) | RATIFIED-REMOVED at common-3dgs Stage 0 (`docs/_audits/phase-3/progress.md:31,36`); does NOT regate this sub-phase |

## §5 — Probe verdict

**CONFIRMED.** All anchor checks PASS (integrity baseline byte-identical;
I1–I7 hold; verify_evidence sweep no-regression on Phase-3 audits including the
BLOCKED stage-0 artifact). External preconditions for the sub-phase are
**bounded** (no operator-pending git-SHA pin; pre-dispatch-review retired).
D-LOC is **resolvable now** via §3.2.2's most-recent normative statement; four
additional D-class items (D-WEIGHTS, D-DET, D-ANCHOR, D-TAG) inherit the matured-
cadence routing (defaults declared, decisions ratified at the appropriate stage).
Plan-drafting may proceed; the charter records the resolutions and routings.

## §6 — Forward-routing (the charter consumes these)

- **D-LOC resolved**: `tools/testkit/render_similarity/` package (§3.1 above).
- **D-WEIGHTS** (LPIPS weights — vendor vs lazy fetch) — Stage 1b probe.
- **D-DET** (determinism class — pure numeric vs torch eval; lean bit-exact) —
  Stage 1b measure.
- **D-ANCHOR** (3 independent-reference anchors; LPIPS BAPPS-subset risk) —
  Stage 1b probe (STOP if no LPIPS reference can be grounded without a large
  fetch — Convention #8 forbids fabrication).
- **D-TAG** (`v0.2.3-sub-phase-phase-3-render-similarity`; lean YES, §D.2 (a)
  external PyPI dep + (b) durable architecture: gates ALL Phase-4 neural sims).
- **Stage-1a probe items (NOT formal D-class):** D-HARNESS-CLI (CLI wrapper vs
  separate entry-point; §3.3), D-SCHEMA (tolerance schema extension shape;
  §3.4).
- **Mutation threshold**: ≥ 0.85 (NOT 0.80; §3.6 cite). Achievability: pure
  numeric Python (PSNR / SSIM-via-scikit-image / LPIPS-via-torch-eval); fewer
  opaque kernels than common-3dgs's Warp surface that landed 0.7610. BUT
  library-delegated metrics may exhibit equivalent-mutant ceilings — Stage 1c
  pre-routes 78-84% with rationale as SHIFTED-bank-not-widen, <78% as BLOCKED.

## §7 — STOP conditions NOT fired by this probe

- STOP-D (integrity baseline divergence): NOT fired — `c19492ad…d22cb52`
  byte-identical at HEAD.
- STOP-H (verify_evidence regression on prior audits): NOT fired — Phase-3
  audits all PASS; phase-0/1/2 fails are pre-existing (unchanged across the
  common-3dgs sub-phase).
- STOP-LOC (D-LOC unresolvable without breaking consumer contract): NOT fired —
  §3.1 resolves to the §3.2.2 package form.
- Any v8/v9 conflict unresolvable by re-framing: NOT fired — all four §4
  surfaces re-frame cleanly under the matured cadence (parallel to common-3dgs).
