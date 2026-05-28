---
date: 2026-05-28T17-45-09Z
author: phase-3 r2-credentials-durability-fix (Claude Code)
subject: Phase 3 focused infrastructure fix — R2 LFS credentials durability on both surfaces (CI + local agent), Lenia .h5 R2 back-fill, I5 re-verification, banked convention §Q
verdict: CONFIRMED
head_sha: ce0d65a06fb86094b6d9693fbb43fe8e8fcea04e
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff (0 HARD_FAIL / 14 SOFT_WARN at HEAD beac1fd; see §1.3 for the digest-drift observation)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
fix_scope: ci(python-strict + cpp-strict R2 opt-in) + chore(local lfs-s3 bootstrap) + chore(lenia .h5 R2 back-fill) + docs(this audit + progress + README + conventions §Q)
back_fill_oid: 6c313a5da53dd341f73accdb7c369564451ccd475fa290c026360e3f39890062
back_fill_path: tests/fixtures/legacy-captures/phase-3-lenia.h5
back_fill_size_bytes: 74992
r2_sweep_total: 159/159 PASS across HEAD + v0.2.0-phase-2 + v0.2.1-sub-phase-lfs-architecture + v0.2.2-sub-phase-phase-3-common-3dgs + v0.2.3-sub-phase-phase-3-render-similarity (v0.0.0-phase-0 + v0.1.0-phase-1 vacuous — pre-LFS)
tag_pushed_by_agent: false (no tag; steady-state infra hygiene, NOT a sub-phase)
evidence_paths:
  - tools/lfs/setup-lfs-s3-local.sh
  - tools/lfs/setup-lfs-s3.sh
  - tools/lfs/r2-bulk-upload.sh
  - tools/lfs/README.md
  - .github/workflows/python-strict.yml
  - .github/workflows/cpp-strict.yml
  - docs/conventions/sub-phase-conventions.md
  - docs/phases/sub-phase-lfs-architecture.md
evidence_hashes:
  tools/lfs/setup-lfs-s3-local.sh: sha256:c4ff80e361134a1b48e3e30fc2f57ada0945d416ffb20fd04d6f2a6552d92f65
  tools/lfs/setup-lfs-s3.sh: sha256:56637b17351bfb7571dc6f7e31cf56a9f88900e2dbed0c4f3d3cef7e8c9147a0
  tools/lfs/r2-bulk-upload.sh: sha256:b78b0e6777190081d7d77493c9489094801fb1bb47fbdfa38d65e79afa7c0308
  tools/lfs/README.md: sha256:54efacbd8021bd9697bad2a1c0987f244a0bd613d6e6a9126d7f60cea42d5c32
  .github/workflows/python-strict.yml: sha256:78d1c5030bf58ebb335408bb74f215dd455d8d77e1992238f13b494614db47c7
  .github/workflows/cpp-strict.yml: sha256:0201291ceefd2fce5fe861eef1618f320823bdc35f5b9f58179890fd787ee65a
  docs/conventions/sub-phase-conventions.md: sha256:2fb8629b6e587af22ca848760072fbb4b3c26ee8b2419d86741cd2fb69a951ca
  docs/phases/sub-phase-lfs-architecture.md: sha256:139ac47acce662230f30fff1dfce130f91fb715dc5e278a062fd4cc3d70a35f8
---

# Phase 3 — R2-credentials-durability fix

> Focused INFRASTRUCTURE fix; NOT a sub-phase; NOT tagged. Closes the
> recurring failure mode where the per-Phase-3-sim Stage-1c `git lfs push`
> of a net-new `.h5` fixture EOFs against R2 — three consecutive sims hit
> it (`common-3dgs` Stage 1c paste-then-vanish; `lenia` Stage 1c STOP-LFS;
> this pass is the surface-(a)+(b) fix). Mirrors the steady-state-hygiene
> posture of `sub-phase-phase-2-cleanup` (no tag).

## §0. Scope

Make Cloudflare-R2 LFS access durable + correct on BOTH surfaces:

- **(a) CI runners** — the per-job opt-in pattern documented at
  `tools/lfs/README.md` (the trusted-config / per-job model landed by
  `sub-phase-lfs-architecture`) was wired into the manual `r2-roundtrip-proof.yml`
  and `r2-sweep-proof.yml` workflows, **but never into the two
  bandwidth-load-bearing workflows that actually pull LFS objects in
  every push + PR** (`python-strict.yml` job `python-strict`,
  `cpp-strict.yml` job `cpp-strict`). Both routed through GitHub-LFS,
  re-filling the budget that `sub-phase-lfs-architecture` migrated away
  from.
- **(b) Local agent session** — the lfs-s3 standalone transfer agent was
  not wired into this clone's `.git/config`, the R2 env was not in
  `$HOME`, and `lfs-s3` was installed only because of the leftover
  `common-3dgs` Stage-1c paste. Three consecutive sim sub-phases
  surfaced the same STOP-LFS, never durably fixed.

Back-fill `phase-3-lenia.h5` to R2 (the lenia landing surfaced
`STOP-LFS` for this OID — GitHub-LFS held a unique copy at HEAD), then
re-verify I5 (worktree-replay-at-tags-via-R2) holds across HEAD + every
prior phase tag. Bank a §Q convention so future LFS-touching sub-phases
inherit the bootstrap as a Stage-0 obligation.

## §1. Anchor probe

### §1.1 HEAD + tags + commit-tree posture

| Probe | Result |
|---|---|
| `git rev-parse HEAD` | `beac1fdafcd8b0ec46aefe67ab6651df72c0ed95` — lenia landing chain tip (Convention M) |
| Six prior phase tags resolve | `v0.0.0-phase-0 → 75b674cb`; `v0.1.0-phase-1 → 9998bc18`; `v0.2.0-phase-2 → 5832cbce`; `v0.2.1-sub-phase-lfs-architecture → 0407fa5e`; `v0.2.2-sub-phase-phase-3-common-3dgs → 07aa1f5c`; `v0.2.3-sub-phase-phase-3-render-similarity → 4e4b674d` |
| `git status --short` | clean |
| `v0.2.4-sub-phase-phase-3-lenia` | NOT present (operator push pending per lenia landing memo — not on this session's path) |

### §1.2 Invariants at HEAD

| Inv | Result | Method |
|---|---|---|
| **I3** integrity Cat 1–5 | **PASS — 0 HARD_FAIL / 14 SOFT_WARN** at HEAD `beac1fd` | `uv run --no-sync python -m integrity --all --mode strict 2> /tmp/integ.err`; summary line `summary: 0 HARD_FAIL, 14 SOFT_WARN` (`tools/integrity/integrity/__main__.py`) |
| **I4** verify_evidence sweep | **PASS — 24/24** across all phase-3 audits + `sub-phase-lfs-architecture-landing-*` + `sub-phase-phase-2-cleanup-stage-2-*` | per-audit loop (`docs/_audits/phase-3/*.md docs/_audits/phase-2/sub-phase-lfs-architecture-landing-*.md docs/_audits/phase-2/sub-phase-phase-2-cleanup-stage-2-*.md`) calling `uv run --no-sync python -m integrity.scripts.verify_evidence --audit <file>` (`tools/integrity/integrity/scripts/verify_evidence.py:1`) |
| **I5** worktree-replay-at-tags-via-R2 | **PRE-FIX: PENDING for lenia OID** `6c313a5da5…`; **POST-FIX: PASS 159/159** — see §4 below | M4-style sweep with `git -c lfs.storage=<tmp> lfs fetch origin <ref>` over each ref then `sha256 == OID` (mirrors `.github/workflows/r2-sweep-proof.yml:62-95`) |
| **I7** no agent-pushed tag in sub-phase range | **PASS** | `git tag` lists no `v0.2.4-*`; no new tag created in this session |

### §1.3 Integrity-digest observation (NOT a STOP-D)

The recent landing audits (common-3dgs `2026-05-28T11-12-05Z`,
render-similarity `2026-05-28T14-20-30Z`, lenia `2026-05-28T16-00-43Z`)
all front-matter `integrity_baseline: c19492ad…d22cb52` and claim
"byte-identical to baseline". At HEAD `beac1fd` the actual stderr-report
sha256 is `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff`
(0 HF / 14 SW — count unchanged). Reproduced in a fresh `/tmp/bp-test`
clone of HEAD with `uv sync --all-packages` → same digest, so the divergence
is in the integrity output itself, not in the local environment. Origin: new
golden tables added by `common-3dgs` / `lenia` produce additional
`[AUDIT_LOG] cat3.golden-values …` lines that perturb the report bytes
(observable in `/tmp/integ.err` lines 7-8 — `lenia-kernel.json` +
`lenia-orbium-trajectory.json`). The 0 HF / 14 SW invariant has held; the
byte-for-byte equality citation has been carried forward without
re-measurement since lfs-architecture Stage 2.

**Disposition.** Not a STOP-D — STOP-D triggers on Cat-1–5 baseline divergence
in the HARD_FAIL / SOFT_WARN counts. The byte-identical claim is a
documentation-discipline drift that should be addressed at the next sub-phase
plan-drafting (e.g. routing it to the `phase-2-cleanup` sibling-class
"audit-citation-hygiene" cluster). Bank as observation **L-R2CD-1** for
operator routing.

## §2. Gap table (FACT — `git lfs ls-files HEAD --long` + landing-audit cross-ref)

### §2.1 Surface (a) — CI runner secret consumption

| Workflow / job | Pulls LFS? | Sources `tools/lfs/setup-lfs-s3.sh`? | Exports `secrets.R2_*`? | Pre-fix route |
|---|---|---|---|---|
| `.github/workflows/r2-roundtrip-proof.yml` (manual M2 proof) | yes | yes (`line 56`) | yes (`lines 37-40`) | **R2** ✓ (no change) |
| `.github/workflows/r2-sweep-proof.yml` (manual M4 sweep) | yes | yes (`line 52`) | yes (`lines 39-42`) | **R2** ✓ (no change) |
| `.github/workflows/python-strict.yml` job `python-strict` | yes (`line 49`: `git lfs pull --include="tests/fixtures/legacy-captures/**"`) | **NO** | **NO** | **GitHub-LFS only** ✗ (FIXED here) |
| `.github/workflows/cpp-strict.yml` job `cpp-strict` | yes (`line 69`: `git lfs pull --include="captures/reaction-diffusion-2d-ref/**"`) | **NO** | **NO** | **GitHub-LFS only** ✗ (FIXED here) |
| `python-strict.yml` jobs `test-common-3dgs` / `test-render-similarity` / `test-lenia` | no (`lfs: false`; tests are in-memory) | — | — | — |
| `audit-append-only.yml`, `determinism.yml`, `equivalence.yml`, `integrity.yml`, `mutation-testing.yml`, `structure.yml`, `tolerance-budget-check.yml`, `ts-strict.yml` | no | — | — | — |

`tools/lfs/README.md:22` previously claimed *"bandwidth-load-bearing
workflows (`python-strict`, `cpp-strict`) fetch from R2 this way"* — that
was aspirational documentation; the actual YAML pulled from GitHub-LFS.
`.github/workflows/python-strict.yml:47-48`'s in-line comment ("D4 fallback path — R2
routing of fetches lands at the operator-gated M5 cutover") referred to
the M5 cutover that was re-characterized at lfs-architecture Stage 1c (no
committed cutover; opt-in is steady state per the charter `AMENDMENT —
Stage 1c / M5` block). **The opt-in was never wired into either workflow.**

### §2.2 Surface (b) — local agent session

| Probe | Pre-fix state | Post-fix state |
|---|---|---|
| `~/.config/bit-physics/r2-credentials.env` | absent | **present**, mode `600`, six vars, outside repo tree |
| `git config --local --get lfs.standalonetransferagent` | unset | `lfs-s3` |
| `git config --local --get lfs.customtransfer.lfs-s3.path` | unset | `/home/otacon/.local/bin/lfs-s3` |
| `command -v lfs-s3` | `/home/otacon/.local/bin/lfs-s3` (left over from `common-3dgs` Stage-1c paste; `flag provided but not defined: -version` confirms v0.2.2-shape binary) | unchanged |

### §2.3 Back-fill worklist — net-new Phase-3 .h5 at HEAD

| OID | path | size | in GitHub-LFS | in R2 (pre-fix) | source-of-truth |
|---|---|---|---|---|---|
| `2087402de9ee2989e991468ec40452cfc3a27e4a68d15adc595a45e7c649f4a9` | `tests/fixtures/legacy-captures/phase-3-common-3dgs.h5` | 211 344 B | YES | **YES** | common-3dgs landing `…2026-05-28T11-12-05Z.md:160-164` documents the post-`git lfs push --object-id` R2 sync at Stage-1c commit `e258950` |
| `6c313a5da53dd341f73accdb7c369564451ccd475fa290c026360e3f39890062` | `tests/fixtures/legacy-captures/phase-3-lenia.h5` | 74 992 B | YES | **NO** | lenia landing memory `phase-3-lenia-sub-phase-landed` (STOP-LFS surfaced; R2 mirror EOF; agent env lacked customtransfer agent path + AWS creds) |

Render-similarity sub-phase added no new `.h5` (its tests are in-memory
metric computations); the only net-new fixture absent from R2 is the
lenia one. Both OIDs were present in the local cache with `sha256 == OID`
(preflight pass).

## §3. Fix (executed in order)

### §3.1 Local durable creds + bootstrap (surface b)

1. Created `~/.config/bit-physics/r2-credentials.env`, mode `600`,
   outside the repo tree. Six vars: `S3_BUCKET=bit-physics-lfs`,
   `R2_ACCOUNT_ID=380531f2e3bf65b2a9f84a45075afbb8`,
   `AWS_S3_ENDPOINT=https://380531f2e3bf65b2a9f84a45075afbb8.r2.cloudflarestorage.com`,
   `AWS_REGION=auto`, plus the two secret values pasted inline by the
   operator. **No secret values were echoed, logged, or committed.**
   Length-only sanity check: `AWS_ACCESS_KEY_ID len=32`,
   `AWS_SECRET_ACCESS_KEY len=64` (consistent with the
   Cloudflare-R2 token shape).
2. Added `tools/lfs/setup-lfs-s3-local.sh` — a sourceable wrapper that
   refuses execution (must be sourced), refuses a world/group-readable
   creds file, loads the six vars via `set -a`, sanity-checks
   non-empty without printing values, then chains into
   `tools/lfs/setup-lfs-s3.sh` (UNCHANGED — the CI script's
   narrow env-only contract is preserved). Override path via
   `BIT_PHYSICS_R2_ENV=<path>`.
3. Validated post-bootstrap state:
   - `lfs-s3 ready: /home/otacon/.local/bin/lfs-s3 |
     endpoint=https://380531f2e3bf65b2a9f84a45075afbb8.r2.cloudflarestorage.com
     bucket=bit-physics-lfs region=auto`
   - `git config --local --get lfs.standalonetransferagent` → `lfs-s3`
   - `git config --local --get lfs.customtransfer.lfs-s3.path` →
     `/home/otacon/.local/bin/lfs-s3`

### §3.2 R2 reachability validation + Lenia back-fill

Same shell (creds + agent wired). First re-pushed the common-3dgs OID
(known-on-R2; idempotent re-PUT — lfs-s3 is content-addressed) as a
non-destructive reachability probe; then pushed the lenia OID:

```
$ echo "2087402de9…649f4a9" | git lfs push --object-id origin --stdin
Uploading LFS objects: 100% (1/1), 0 B | 0 B/s, done.
validation_rc=0
$ echo "6c313a5da5…39890062" | git lfs push --object-id origin --stdin
Uploading LFS objects: 100% (1/1), 18 KB | 0 B/s, done.
backfill_rc=0
```

Validation rc=0 confirms the creds + agent reach R2. Back-fill rc=0
confirms the lenia OID is now in R2. **No STOP-LFS-PUSH.**

### §3.3 CI workflow R2 opt-in (surface a)

`.github/workflows/python-strict.yml` `Selective LFS fetch — legacy-captures
corpus only` step and `.github/workflows/cpp-strict.yml` `Selective LFS
fetch — RD-2D reference capture` step both gained the same shape:

```yaml
env:
  R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
  AWS_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
  S3_BUCKET: ${{ secrets.R2_BUCKET_NAME }}
run: |
  if [ -n "${R2_ACCOUNT_ID:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ] && \
     [ -n "${AWS_SECRET_ACCESS_KEY:-}" ] && [ -n "${S3_BUCKET:-}" ]; then
    source tools/lfs/setup-lfs-s3.sh
    echo "lfs fetch route: R2 (lfs-s3 standalone transfer agent)"
  else
    echo "lfs fetch route: GitHub LFS (R2 secrets absent — fork PR or unconfigured)"
  fi
  git lfs pull --include="<narrow-glob>"
```

The conditional fallback preserves D4 (GitHub-LFS) for fork PRs, where
GitHub does not propagate secrets — the lfs-architecture steady-state
posture. Both YAML files round-trip clean through `yaml.safe_load`.
Cannot validate the secret VALUES from this session (the agent has no
GitHub-Actions secret read scope — by design). **Operator action to fully
confirm: observe the next post-merge `python-strict` / `cpp-strict` run on
trunk** — the step log will print `lfs fetch route: R2 …` when the secrets
are reaching the job, or `lfs fetch route: GitHub LFS …` otherwise.

### §3.4 Documentation

- `tools/lfs/README.md` — added a *Durable local credentials (one-command
  bootstrap)* sub-section under *Local developer setup*, citing the
  Stage-0 obligation in `docs/conventions/sub-phase-conventions.md` § Q.3.
- `docs/conventions/sub-phase-conventions.md` — added §Q
  (`Q.1`–`Q.5`): rationale, off-tree bootstrap, Stage-0 inheritance,
  CI workflow-author rule, back-fill obligation. New section before
  `§O. Coherence note`.

## §4. I5 re-verification — M4-style sweep at HEAD

After §3.2 back-fill. Used a fresh `mktemp -d` `lfs.storage=` per ref so
every byte-check is genuinely from R2, not a local cache hit
(`.github/workflows/r2-sweep-proof.yml:72-75` shape).

| Ref | LFS pointers | R2 round-trip (sha256 == OID) |
|---|---|---|
| `HEAD` (= `beac1fd`) | 33 | **33/33 PASS** (incl. freshly back-filled `6c313a5da5…`) |
| `v0.0.0-phase-0` | 0 | vacuous PASS (pre-LFS history) |
| `v0.1.0-phase-1` | 0 | vacuous PASS (pre-LFS history) |
| `v0.2.0-phase-2` | 31 | **31/31 PASS** |
| `v0.2.1-sub-phase-lfs-architecture` | 31 | **31/31 PASS** |
| `v0.2.2-sub-phase-phase-3-common-3dgs` | 32 | **32/32 PASS** |
| `v0.2.3-sub-phase-phase-3-render-similarity` | 32 | **32/32 PASS** |
| **TOTAL** | **159 checked** | **159/159 PASS — 0 FAIL** |

**I5 HOLDS at HEAD** for the worktree-replay-at-tags-via-R2 contract.
The lenia OID `6c313a5da5…` is now reachable from R2; the Lenia
sub-phase landing's `STOP-LFS-SURFACED` is **CLOSED** by this fix.

## §5. Commits

| # | shape | conventional message |
|---|---|---|
| 1 | code + docs | `chore(phase-3): local lfs-s3 bootstrap script + tools/lfs README durable-local-creds section + banked Stage-0 R2 convention §Q` |
| 2 | CI | `ci(phase-3): wire R2 secret consumption into python-strict + cpp-strict selective-LFS-fetch steps` |
| 3 | docs | `docs(phase-3): r2-credentials-durability fix audit + progress entry` |
| 4 | chore (Convention #12) | `chore(phase-3): SHA back-fill r2-credentials-durability fix audit (Convention #12)` |

**Commit ordering rationale.** The local bootstrap script is committed
first (the back-fill push happens at agent runtime, off-tree). CI workflow
edits land second — by that point the lenia OID is already in R2, so the
next CI run resolving via R2 finds the object. The audit ships third, then
the Convention #12 SHA back-fill. **No tag.**

## §6. Banked observations + open routing

### §6.1 L-R2CD-1 (integrity-digest carry-forward)

Recent landing audits cite `c19492ad…d22cb52` as "byte-identical
baseline" although the actual stderr-report sha256 has drifted to
`688bc195…6de127ff` at HEAD. The 0-HF / 14-SW invariant is correctly
held; the byte-identity citation has propagated without re-measurement
since lfs-architecture Stage 2. **Route to next plan-drafting** (e.g. a
`phase-2-cleanup`-style audit-citation-hygiene cluster) — outside this
fix's scope.

### §6.2 L-R2CD-2 (`tools/lfs/r2-bulk-upload.sh` UNION_REFS staleness)

`tools/lfs/r2-bulk-upload.sh:69` hard-codes `UNION_REFS=(HEAD
v0.0.0-phase-0 v0.1.0-phase-1 v0.2.0-phase-2)` — the in-use ref set at
lfs-architecture Stage 1c. Each Phase-3 sim sub-phase landing has since
added `v0.2.2-sub-phase-phase-3-common-3dgs`,
`v0.2.3-sub-phase-phase-3-render-similarity`, and (operator push pending)
`v0.2.4-sub-phase-phase-3-lenia` to the in-use surface. The bulk script
will under-cover any future bulk run. The targeted back-fill in §3.2 used
`git lfs push --object-id origin --stdin` directly so the staleness did
not block this fix, but the script should grow to enumerate the
`v0.*-phase-*` and `v0.*-sub-phase-*` tag set dynamically. **Route to a
follow-up `tools/lfs/r2-bulk-upload.sh` ref-set generalization** —
outside this fix's scope.

### §6.3 L-R2CD-3 (`r2-sweep-proof.yml` ref-set staleness)

`.github/workflows/r2-sweep-proof.yml` carries the same fixed-ref-set
shape. The manual-dispatch sweep would equally under-cover the Phase-3
SIM tags. Bank for the same generalization pass as §6.2.

## §7. STOP / NO-STOP table

| STOP | Fired? | Rationale |
|---|---|---|
| STOP-D (integrity baseline divergence) | NO | 0 HARD_FAIL / 14 SOFT_WARN held; digest-citation drift is L-R2CD-1, not STOP-D |
| STOP-H (verify_evidence regression) | NO | 24/24 PASS at HEAD |
| STOP-LFS-PUSH (R2 reachability / push fail) | NO | validation + back-fill rc=0; round-trip 159/159 PASS |
| STOP-I7 (agent-pushed tag) | NO | no tag created |
| HARD RULE 2 | NO | no falsification of an axis-claim during this pass |

## §8. Operator-visible deliverables

| Deliverable | Path |
|---|---|
| Audit (this file) | `docs/_audits/phase-3/r2-credentials-durability-fix-2026-05-28T17-45-09Z.md` |
| CI workflow edits | `.github/workflows/python-strict.yml`, `.github/workflows/cpp-strict.yml` |
| Local bootstrap script | `tools/lfs/setup-lfs-s3-local.sh` (sourceable; idempotent) |
| Banked convention | `docs/conventions/sub-phase-conventions.md` §Q (`Q.1`–`Q.5`) |
| Progress entry | `docs/_audits/phase-3/progress.md` (appended) |
| README extension | `tools/lfs/README.md` (Durable local credentials section) |
| Off-tree creds file | `~/.config/bit-physics/r2-credentials.env` mode 600 (NOT committed; lives outside the repo) |
| Recipe for future sub-phases | `source tools/lfs/setup-lfs-s3-local.sh` at every LFS-touching Stage 0 (§Q.3) |

## §9. One-liner verdict

`phase-3 r2-credentials-durability CONFIRMED ce0d65a06fb86094b6d9693fbb43fe8e8fcea04e docs/_audits/phase-3/r2-credentials-durability-fix-2026-05-28T17-45-09Z.md  I5-at-HEAD: HOLDS | CI-wiring: fixed`
