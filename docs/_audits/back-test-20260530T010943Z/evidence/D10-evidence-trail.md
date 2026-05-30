# D10 — Evidence-trail integrity [BLOCKER dimension]

Pin HEAD `4ee0ea9` (`4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9`). Worktree
`/home/otacon/Projects/bp-audit-2`. Read-only over source; ran via
`uv run --no-sync python -m integrity.scripts.verify_evidence` (cwd `tools/integrity`).
Newest LFS-bearing phase tag reachable: `v0.2.4-sub-phase-phase-3-lenia`
(`7bde4d44a6084245a283d4d493f038ae97c2f32e`).

## Denominators (declared, all checked, checked == denominator)

| denominator | value | method |
|---|---|---|
| audit `.md` total | 310 | `git grep -l '' -- 'docs/_audits/**/*.md'` |
| evidence_hashes-bearing audits | **215** | `git grep -l evidence_hashes -- 'docs/_audits/**/*.md'` |
| append-only file set @ lenia tag | **576** | `git ls-tree -r --name-only v0.2.4-… -- docs/_audits/` |

(prior back-test had 197 evidence-bearing / 576 tag-files; the +18 evidence-bearing
audits are tasks 5–8 landings + ising/rigid/cloth/mpm/pinn intermediates.)

## D10.1 — verify_evidence over all 215 evidence-bearing audits

Ran `verify_evidence --audit <a> --strict` on **all 215**. Per-audit log:
`checkpoints/d10/verify-evidence-results.txt`; per-failure detail:
`checkpoints/d10/nonpass-detail.txt`.

**Result: 191 PASS / 24 non-pass / 215 total** (191+24 == 215, accounted).

The 24 non-pass categorized (every one an INTERMEDIATE / process audit —
checkpoint, probe, plan-drafting, sha-back-fill, harness-investigation,
progress tracker; NO load-bearing LANDING audit fails):

| category | n | audits | severity |
|---|---|---|---|
| no YAML front-matter (over-included tracker) | 1 | `phase-3/progress.md` | N/A (not an audit report) |
| missing valid `head_sha` | 7 | phase-1 prerequisite-hotfix, stage-1-verification, stage-2-checkpoint ×2; phase-2 LBM-d3q19 stage-0 + stage-1a sha-back-fill | MINOR (unverifiable-by-schema) |
| `evidence_hashes is not a mapping` (malformed YAML shape) | 4 | phase-0 block-1-foundation; rd-2d-stack-c stage-0 / 1b / 1c | MINOR (schema defect) |
| dangling evidence `.txt` (path not present at sha) | 2 | closed-form stage-0; continuous-ca-rd3d stage-0-blocked-replay | MINOR |
| empty-file evidence (`__init__.py` is empty) | 2 | numba-integration landing; taichi-integration stage-1 | MINOR (weak evidence) |
| sha256 mismatch — capture sidecar `.json` drift | 3 | rd-3d stage-1; rd-2d-stack-d stage-1b + 1c | MINOR (post-checkpoint sidecar/eof normalization) |
| sha256 mismatch — `head_sha not present in repo` | 1 | eulerian-smoke stage-1 (sha `c20d24d6dd24` rebased away) | MINOR |
| sha256 mismatch — mutable-doc `claimed=at-head` drift | 4 | lenia-mypy-strict-fix; ising plan-draft / probe / harness-investigation; rigid-body plan-draft — cite phase-3-plan.md / architecture.md / sub-phase docs / workflows "at head"; those evolved after the audit | MINOR (stale at-head hash on mutable file) |

Counts: 1+7+4+2+2+3+1+4 = 24. **F-D10-1** carries forward (malformed
evidence_hashes ×4 — the documented mapping-vs-list gotcha). **F-D10-2** carries
(capture-sidecar `.json` hash drift ×3). **F-D10-3** carries (a class of audit
types carry evidence_hashes without the `head_sha` verify_evidence requires).
**No NEW verify_evidence failure class introduced by tasks 5–8** (the new
ising/rigid intermediates fall into the existing `claimed=at-head` mutable-doc
drift class).

**None of the 24 is a pointer-masquerade** (hash computed over an LFS pointer
where content was expected). All are schema-shape, missing-head_sha,
dangling-`.txt`, empty-file, sidecar-drift, rebased-sha, and `at-head` mutable-doc
drift — NOT pointer-vs-content.

## D10.2 — Append-only CONTENT invariant (byte-prefix over the 576 tag files)

For every file under `docs/_audits/` present at `v0.2.4-sub-phase-phase-3-lenia`,
compared the tag blob bytes against the HEAD blob: identical, or tag bytes are a
byte-prefix of HEAD bytes (append-only). Log: `checkpoints/d10/append-only-violations.txt`.

**Result: 576 checked / 0 violations.** Exactly one file differs between tag and
HEAD — `docs/_audits/phase-3/progress.md` (78174 B → 183838 B), and it is a clean
APPEND (tag content is a verbatim byte-prefix of HEAD content, `cmp -s` clean).
No file DELETED, SHRANK, or MUTATED. **Append-only invariant HELDS in practice.**

## D10.3 — B-1 re-test: the append-only WORKFLOW glob

`.github/workflows/audit-append-only.yml:62-63` feeds the enforcement loop from:

```
git ls-tree -r --name-only "$PRIOR_TAG" -- docs/_audits/ | grep -E '\.ledger\.md$' || true
```

Ran that exact pipeline against the tag file list. Match log:
`checkpoints/d10/b1-glob-matches.txt`.

**Match count = 0 of 576.** No file in `docs/_audits/` is named `*.ledger.md`.
The real ledgers present at the tag are `docs/_audits/phase-0/ledger.md` (would need
`/?ledger\.md$`) and a `perf-ledger-…txt` (a `.txt`, never appendable-md anyway).
The `while … done < <(…)` loop iterates over the EMPTY set, so the workflow
exits `fail=0` unconditionally — it guards **zero** files.

**B-1 status: LIVE (UNRESOLVED).** The CI enforcement of append-only is hollow:
mechanically it can never HARD_FAIL. The invariant it claims to guard currently
holds only because no actor has mutated an audit (D10.2: 0/576), i.e. the risk is
latent/unenforced, not realized.

## D10.4 — Evidence-hash integrity / pointer-masquerade

The 4 worktree-dirty `tests/fixtures/legacy-captures/*.h5` files. `.gitattributes`
declares `tests/fixtures/legacy-captures/**/*.h5 filter=lfs`, but the COMMITTED
HEAD blobs are NOT LFS pointers — they are plain small PLACEHOLDER text
(`PHASE-1-STAGE-2 PLACEHOLDER — not an HDF5 file. See sidecar …`), the
pre-existing SIBLING-FIXTURE-LFS condition from v0.1.0-phase-1. The "dirty"
worktree status is gitattributes/filter churn, not a content edit.

Computed working-tree content sha256 == committed HEAD-blob sha256 for all 4,
byte-for-byte (log: `checkpoints/d10/h5-content-check.txt`):

| file | committed blob sha256 | size | WT sha256 | match |
|---|---|---|---|---|
| physarum-ref.h5 | acd78588…3dd69a64 | 81 B | acd78588…3dd69a64 | YES |
| reaction-diffusion-3d-ref.h5 | 5760c1e5…f00db3ae | 109 B | 5760c1e5…f00db3ae | YES |
| sph-water-ref.h5 | 8b60e76b…43b5ddb8 | 97 B | 8b60e76b…43b5ddb8 | YES |
| strange-attractors-ref.h5 | 4e4597af…97bd5802 | 263 B | 4e4597af…97bd5802 | YES |

Cross-check: **NO evidence_hashes-bearing audit references any
`legacy-captures/*.h5`**, and **NO `.h5` appears in any evidence_hashes block at
all** (`git grep` over the 215). Audits hash the capture `.json` sidecars, not the
`.h5` binaries. So there is no audit hash computed over a placeholder/pointer
where HDF5 content was expected.

**Pointer-masquerade: PASS.** No content masquerading as a different hash; no
pointer masquerading as content in the evidence trail. (BLOCKER condition NOT met.)

## D10.5 — Integrity meta-test-in-CI claim

`docs/architecture.md:770`: *"The meta-test is itself part of CI: any fixture that
should be flagged but isn't fails the build."* (referring to
`tools/integrity/tests/test_adversarial_coverage.py`).

Grepped ALL 13 `.github/workflows/*.yml` for `tools/integrity/tests`,
`test_adversarial_coverage`, `pytest … integrity`, `adversarial`:
**NO MATCHES.** The integrity workflow `integrity.yml:25` runs
`uv run python -m integrity --all` (the Cat 1–5 + Cat-X CHECKS over the repo), NOT
the pytest meta-test. `python-strict.yml` pytest steps are scoped to
`tools/testkit/…`, `common/common-3dgs/tests/`, `render_similarity/tests/`,
`packages/lenia/…` — never `tools/integrity/tests/`. `mutation-testing.yml`
mutates `tools/integrity/**` source but drives `tools/testkit/mutation/run-mutation.sh`,
not the meta-test pytest.

**Verdict: doc claim is FALSE.** The adversarial-fixture meta-test is NOT invoked
by any CI workflow. Candidate sibling sub-phase: **integrity-meta-test-ci-wiring**
(add a `pytest tools/integrity/tests/` step to `integrity.yml`).

---

## Findings

| ID | severity | file:line | claim | observed | status | remediation |
|---|---|---|---|---|---|---|
| F-D10-B1 | BLOCKER-class enforcement gap (currently latent, not realized) | `.github/workflows/audit-append-only.yml:62-63` | workflow enforces append-only over docs/_audits | glob `\.ledger\.md$` matches 0 of 576; loop guards ∅; exits fail=0 unconditionally | LIVE/UNRESOLVED | feed ALL `docs/_audits/**/*.md` (drop the `*.ledger.md` filter) — append-only is a per-audit-file invariant, not a ledger-only one |
| F-D10-METATEST | MINOR (false doc claim) | `docs/architecture.md:770` | integrity meta-test "is itself part of CI" | no workflow invokes `pytest tools/integrity/tests/`; integrity.yml runs only `integrity --all` | NEW (confirmed) | wire `pytest tools/integrity/tests/` into integrity.yml (sibling sub-phase integrity-meta-test-ci-wiring) |
| F-D10-1 | MINOR | 4 intermediate audits | evidence_hashes mapping | `not a mapping` (list/scalar shape) | CARRIED | reshape to YAML mapping |
| F-D10-2 | MINOR | 3 checkpoint audits | capture-sidecar `.json` hash | sha256 drift (post-checkpoint normalization/eof) | CARRIED | re-pin sidecar hash or mark non-`at-head` |
| F-D10-3 | MINOR | 7 audit types | evidence_hashes without head_sha | verify_evidence cannot anchor | CARRIED | require head_sha on evidence-bearing audits |

## Verdict

Landing-audit evidence trail SOUND (191/215 PASS; all 24 non-pass are
intermediate/process audits, no LANDING fails). Append-only CONTENT invariant
HELD (576/576, 0 violations — only progress.md appended). Pointer-masquerade
PASS (no audit hashes any `.h5`; the 4 dirty placeholders are byte-identical to
committed blobs). The two structural concerns are CI-enforcement, not realized
corruption: **F-D10-B1** (append-only workflow guards ∅ — BLOCKER-class but
latent) and **F-D10-METATEST** (integrity meta-test unwired; doc claim false).
