# Probe report — sub-phase-lfs-architecture (plan-drafting)

- **Probe author:** plan-drafting agent (Claude Code)
- **Probe date (UTC):** 2026-05-26
- **Repo HEAD at probe:** `fd21445614d2f87549a4c660da91c988c4c6b1eb` (`fd21445`)
- **Phase tag present:** `v0.2.0-phase-2` (FACT — `git tag -l 'v0.2.0-phase-2'` → present)
- **Convention #8 posture:** every concrete claim below is grep-verified against repo HEAD
  or web-fetched from an official source with URL + access date. Claims grounded in the
  *local* master-catalog planning artifact (see preamble) are tagged
  `[CATALOG — not in repo]` so they are never mistaken for repo-HEAD facts.

---

## Preamble — preconditions + a documentation-state finding

### Preconditions (all PASS — no Hard Rule 2 STOP at session start)

| # | Precondition | Result | Evidence |
|---|---|---|---|
| 1 | HEAD resolves to `fd21445` or successor | **PASS** | `git rev-parse HEAD` → `fd21445…b1eb`; `git log --oneline -5` top = `fd21445 chore(phase-2-stage-9-landing-sha-backfill)` |
| 2 | `v0.2.0-phase-2` tag exists | **PASS** | `git tag -l 'v0.2.0-phase-2'` → `v0.2.0-phase-2` |
| 3 | Integrity baseline `c19492ad…d22cb52` (0 HARD_FAIL) | **PASS** | `python -m integrity --all --mode strict` → `summary: 0 HARD_FAIL, 14 SOFT_WARN`; sha256 of the full report (printed to **stderr**, per [[integrity-baseline-digest-method]]) = `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (exact baseline match) |
| 4 | `git lfs ls-files --long \| wc -l` non-zero | **PASS** | 31 |
| 5 | `verify_evidence.py` runnable on a prior Phase-2 audit with LFS evidence | **PASS** | 3 audits run (see § P4): 9/0, 48/0, 13/0 pass/fail |

CLI note (FACT): the integrity CLI flag is `--all` (with `--mode strict`), **not** `--check-all`
as the dispatch brief wrote (`python -m integrity --help` at HEAD). Substantively identical;
recorded so Stage-0 does not chase a non-existent flag.

### Finding D0 — the master catalog is a *local-only* planning artifact, not in the repo

(FACT) `bit-physics-master-catalog.md` is **not tracked anywhere in the Bit-Physics repo at
HEAD `fd21445`** (`find . -iname "*catalog*"` returns only unrelated GPU-Sims sibling-project
files; `grep -rln "master.catalog" docs/` → 0 hits). The operator confirmed it lives locally at
`/home/otacon/Downloads/bit-physics-master-catalog.md` ("Bit-Physics Master Catalog v2.0",
5,252 lines; its own preamble L8: *"This is a planning artifact … It does not amend
`docs/architecture.md`."*).

**Consequence for Convention #8:** catalog section numbers (Part V §§ 40–46, §§ 34–35, etc.) are
cited in this report and the charter **as a local planning artifact**, tagged `[CATALOG — not in
repo]`. They are real (read directly), but they are not repo-HEAD facts and must not be treated
as such. Stage 0 should re-confirm the catalog path the operator intends to use, and the charter
flags (UNKNOWN-1) whether the catalog should be vendored into the repo before its tier model is
treated as normative.

---

## § P1 — Current LFS inventory

(FACT) Method: `git lfs ls-files --long` for path↔OID; per-file byte size read from the
`size <bytes>` line of each pointer stub at HEAD via `git show HEAD:<path>`; rollups computed
with Python over the captured data.

### P1.1 Per-file table (31 pointers)

| Size (bytes) | Size (human) | Content OID (sha256, first 10) | Path |
|---|---|---|---|
| 738,260,192 | 704.06 MiB | `4604ebdc40` | captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.h5 |
| 1,125,718,712 | 1073.57 MiB | `73e00d0976` | captures/mpm-ref/drop-impact-128cube-seed42-step500.h5 |
| 1,125,718,712 | 1073.57 MiB | `d8d38c8d22` | captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.h5 |
| 1,125,718,712 | 1073.57 MiB | `dfc4d69957` | captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.h5 |
| 2,192,384 | 2.09 MiB | `689609bb46` | captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.h5 |
| 202,350,128 | 192.98 MiB | `0e0843aa87` | captures/lbm-ref/poiseuille-64x32-seed42-step1000.h5 |
| 202,350,128 | 192.98 MiB | `d7ace41e54` | captures/lattice-boltzmann-d3q19-stack-d/poiseuille-64x32-seed42-step1000.h5 |
| 202,350,128 | 192.98 MiB | `c44cd395fb` | captures/lattice-boltzmann-d3q19-stack-e/poiseuille-64x32-seed42-step1000.h5 |
| 27,405,152 | 26.14 MiB | `7a94843457` | captures/lbm-ref/couette-32x16-seed42-step500.h5 |
| 27,405,152 | 26.14 MiB | `4d171c5163` | captures/lattice-boltzmann-d3q19-stack-d/couette-32x16-seed42-step500.h5 |
| 27,405,152 | 26.14 MiB | `71cd6e14e4` | captures/lattice-boltzmann-d3q19-stack-e/couette-32x16-seed42-step500.h5 |
| 61,659,800 | 58.80 MiB | `7590149221` | captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5 |
| 61,659,800 | 58.80 MiB | `8435f16677` | captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.h5 |
| 46,194,424 | 44.05 MiB | `a970ea2919` | captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.h5 |
| 6,000,248 | 5.72 MiB | `6c0c239e85` | captures/physarum-ref/network-canonical-seed42-step5000.h5 |
| 4,385,176 | 4.18 MiB | `e13b0d0524` | captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.h5 |
| 4,385,176 | 4.18 MiB | `db05a65254` | captures/eulerian-smoke-stack-d/lid-driven-cavity-128sq-re100-seed42-step1000.h5 |
| 4,385,176 | 4.18 MiB | `aa67929f4c` | captures/eulerian-smoke-stack-e/lid-driven-cavity-128sq-re100-seed42-step1000.h5 |
| 2,940,664 | 2.80 MiB | `bcae544ae5` | captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5 |
| 2,940,664 | 2.80 MiB | `00081dc42b` | captures/reaction-diffusion-2d-stack-c/gray-scott-lambda-128sq-seed42-step2000.h5 |
| 2,940,664 | 2.80 MiB | `2e93a75164` | captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5 |
| 585,080 | 571.4 KiB | `7e9064aff9` | captures/boids-3d-ref/flock-1000agents-seed42-step1000.h5 |
| 55,960 | 54.6 KiB | `a0f8757a4d` | captures/boids-3d-ref/flock-3agents-canonical-seed42-step1000.h5 |
| 49,976 | 48.8 KiB | `9d34df5f64` | captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.h5 |
| 22,928 | 22.4 KiB | `0e1a3fa1f1` | captures/mandelbulb-explorer-ref/de-probe-points-seed42.h5 |
| 4,385,176 | 4.18 MiB | `aa67929f4c` | tests/fixtures/legacy-captures/phase-2-eulerian-smoke-stack-e.h5 |
| 27,405,152 | 26.14 MiB | `4d171c5163` | tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-d-couette.h5 |
| 202,350,128 | 192.98 MiB | `d7ace41e54` | tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-d-poiseuille.h5 |
| 27,405,152 | 26.14 MiB | `71cd6e14e4` | tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-e-couette.h5 |
| 204,684,176 | 195.20 MiB | `652abcf3c5` | tests/fixtures/legacy-captures/phase-2-mpm-multimaterial-stack-d-representative.h5 |
| 2,940,664 | 2.80 MiB | `00081dc42b` | tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-c.h5 |

### P1.2 Totals (logical vs physical) — the load-bearing distinction

(FACT) git-LFS stores **one blob per unique content OID**; multiple pointers to the same OID
cost storage once. Of 31 pointers there are **26 unique OIDs** (5 legacy-captures entries reuse
the OID of a `captures/` stack capture — see P1.4).

- **Logical total (sum of all 31 pointers):** 5,474,250,736 bytes = **5.098 GiB**
- **Physical total (sum of 26 unique OIDs):** 5,209,764,464 bytes = **4.852 GiB**
- **Offline dedup saving:** 264,486,272 bytes = **0.246 GiB**

The **physical 4.852 GiB** is the number that bills against a storage quota. (INFERENCE — git-LFS
dedups by OID; the legacy-captures reuse means the corpus adds < its apparent footprint.)

### P1.3 Distribution + per-directory rollup

(FACT) Largest single file: `1,125,718,712` B (1073.57 MiB) — the three MPM `drop-impact-128cube`
captures (ref + stack-d + stack-e all share that *size* but are **distinct OIDs**: different
backends produce byte-distinct outputs). Smallest: `22,928` B (22.4 KiB,
`mandelbulb-explorer-ref/de-probe-points-seed42.h5`). Median pointer size: `27,405,152` B
(26.14 MiB).

Per-directory rollup (count, logical MiB):

| Files | Logical MiB | Directory |
|---|---|---|
| 2 | 0.61 | captures/boids-3d-ref |
| 2 | 708.24 | captures/eulerian-smoke-ref |
| 1 | 4.18 | captures/eulerian-smoke-stack-d |
| 1 | 4.18 | captures/eulerian-smoke-stack-e |
| 2 | 219.11 | captures/lattice-boltzmann-d3q19-stack-d |
| 2 | 219.11 | captures/lattice-boltzmann-d3q19-stack-e |
| 2 | 219.11 | captures/lbm-ref |
| 1 | 0.02 | captures/mandelbulb-explorer-ref |
| 1 | 1073.57 | captures/mpm-multimaterial-stack-d |
| 2 | 1075.66 | captures/mpm-multimaterial-stack-e |
| 1 | 1073.57 | captures/mpm-ref |
| 1 | 5.72 | captures/physarum-ref |
| 1 | 2.80 | captures/reaction-diffusion-2d-ref |
| 1 | 2.80 | captures/reaction-diffusion-2d-stack-c |
| 1 | 2.80 | captures/reaction-diffusion-2d-stack-d |
| 1 | 44.05 | captures/reaction-diffusion-3d-ref |
| 1 | 58.80 | captures/sph-water-ref |
| 1 | 58.80 | captures/sph-water-stack-d |
| 1 | 0.05 | captures/strange-attractors-ref |
| 6 | 447.44 | tests/fixtures/legacy-captures |

`captures/**` = 25 pointers; `tests/fixtures/legacy-captures/**` = 6 pointers. Three families
(MPM, eulerian-smoke Taylor-Green, LBM Poiseuille) dominate: MPM alone is ~3.15 GiB logical
(three 1.05-GiB captures).

### P1.4 Shared OIDs (offline dedup detail)

(FACT) 5 OIDs each have 2 pointers — a `captures/` stack capture and its
`legacy-captures/` corpus copy:

- `aa67929f4c` → eulerian-smoke-stack-e LDC + `phase-2-eulerian-smoke-stack-e.h5`
- `4d171c5163` → lbm-d3q19-stack-d couette + `phase-2-…-stack-d-couette.h5`
- `d7ace41e54` → lbm-d3q19-stack-d poiseuille + `phase-2-…-stack-d-poiseuille.h5`
- `71cd6e14e4` → lbm-d3q19-stack-e couette + `phase-2-…-stack-e-couette.h5`
- `00081dc42b` → rd-2d-stack-c + `phase-2-reaction-diffusion-2d-stack-c.h5`

The one legacy entry with a **unique** OID is `phase-2-mpm-multimaterial-stack-d-representative.h5`
(`652abcf3c5`, 195.20 MiB) — a representative *subset* extracted via
`tools/testkit/scripts/extract_capture_subset.py`, not a byte-copy of any canonical capture.

### P1.5 File-count growth per phase

(FACT — by directory naming + audit chain) Phase 0 seeded the schema corpus (the
`-ref` references began landing in Phase 1; e.g. boids-3d-ref, strange-attractors-ref,
mandelbulb-explorer-ref, physarum-ref, rd-2d/3d-ref, sph-water-ref, lbm-ref, eulerian-smoke-ref,
mpm-ref). Phase 2 added the `-stack-c/-stack-d/-stack-e` ports (cross-stack replication) plus the
6 legacy-corpus entries. The 25 `captures/` files therefore span Phase 1 references + Phase 2 port
captures; the 6 corpus entries are the Phase-2 schema-corpus seeds. (INFERENCE on exact
per-phase counts — the canonical per-phase tally lives in each phase landing audit; Stage 0
should pin exact counts if a growth-rate figure becomes load-bearing.)

---

## § P2 — GitHub LFS billing / quota state

(WEB-FETCH, accessed 2026-05-26) **The dispatch brief's quota premise is stale and is corrected
here — this materially reframes the sub-phase (see charter § 1).**

- **Brief stated:** "1 GB storage + 1 GB bandwidth/month per account" (GitHub LFS free quota).
- **Verified current (2026):** GitHub Free **and** GitHub Pro each include **10 GiB storage +
  10 GiB bandwidth per month** (Team/Enterprise: 250 GiB each). Source:
  https://docs.github.com/en/billing/concepts/product-billing/git-lfs and
  https://docs.github.com/billing/managing-billing-for-git-large-file-storage/about-billing-for-git-large-file-storage
  (accessed 2026-05-26).
- **Data packs removed.** Verbatim: *"Previously, Git LFS billing used pre-paid data packs. These
  have been removed and replaced with metered billing and you only pay for what you actually use."*
  Source: https://docs.github.com/en/billing/how-tos/products/upgrade-git-lfs-storage (accessed
  2026-05-26). So the brief's "GitHub LFS data packs … stackable" option (§ S3) no longer exists.
- **Metered rates beyond the free 10 GiB:** storage **$0.07 / GiB-month**; bandwidth (egress)
  **$0.0875 / GiB**. Source: https://github.com/pricing/calculator (accessed 2026-05-26).
- **Overage behavior:** with a **$0 budget**, *"you are not charged for overages, but Git LFS
  usage is blocked for the rest of the calendar month"* (bandwidth exhausted → LFS disabled until
  next month; storage exhausted → cannot push new files). Deleting the budget removes the cap and
  bills all overage. Source: https://docs.github.com/en/billing/concepts/product-billing/git-lfs
  (accessed 2026-05-26).
- **No dashboard output pasted by operator.** §P2 NOTE — actual live usage at
  `github.com/settings/billing` (storage GiB used / bandwidth GiB used this cycle) was **not
  provided**. Not fabricated. Stage 0 should paste the live dashboard so the projection in § P6 is
  anchored to a real starting point, not an inferred one.

**Decision-relevant synthesis (INFERENCE):** current physical storage **4.852 GiB < 10 GiB free
storage** — so the project is **not over the storage quota today**. The live pressure is
**bandwidth**: every CI checkout that smudges LFS pulls up to ~4.85 GiB, and the 10 GiB/month
free bandwidth is consumed in ~2 such full pulls. § P3 shows the bandwidth is concentrated in 2
workflows that mostly don't need the bytes — making selective-fetch (catalog § 45.1) the single
highest-leverage lever, ahead of (not instead of) the backend migration that absorbs the
Phase-4+ storage crossing of 10 GiB.

---

## § P3 — CI workflow inventory

(FACT) `.github/workflows/*.yml` at HEAD = **10 files** (matches brief). All 10 trigger on
`push: branches:[main]` **and** `pull_request`. **None** is scheduled (`on: schedule`) or
manual-only (`workflow_dispatch`) — i.e., the entire suite currently runs at "per-push + per-PR"
cadence; there is no nightly/weekly tier in existence yet.

| Workflow | checkout | `lfs:` | Needs LFS captures? | Cadence (current) | Catalog tier (target) |
|---|---|---|---|---|---|
| `python-strict.yml` | @v6 | **`lfs: true`** | **Only `tests/fixtures/legacy-captures/**`** (corpus test) | push + PR | T1/T2 |
| `cpp-strict.yml` | @v6 | **`lfs: true`** | **No** (writes runtime `.h5`; reads none committed) | push + PR | T1/T2 |
| `determinism.yml` | @v6 | none | No (regenerates captures in-test) | push + PR | T1/T2 |
| `equivalence.yml` | @v6 | none | No | push + PR | T2/T3 |
| `integrity.yml` | @v6 | none | No (offline OID; § P4) | push + PR | T1/T2 |
| `mutation-testing.yml` | @v6 | none | No | push + PR | **T4 (weekly)** — mis-tiered |
| `structure.yml` | @v6 | none | No | push + PR | T1 |
| `tolerance-budget-check.yml` | @v6 | none | No | push + PR (path-filtered) | T1/T2 |
| `ts-strict.yml` | @v6 | none | No | push + PR | T1/T2 |
| `audit-append-only.yml` | @v6 (`fetch-depth` 0) | none | No | push + PR | T1 + landing |

**P3 key findings (FACT):**

1. **Only 2 of 10 workflows fetch LFS** (`python-strict`, `cpp-strict`, both via `with: lfs: true`
   under `actions/checkout@v6`). The other 8 checkout without LFS and therefore receive **pointer
   stubs only** — they already operate "selective-fetch-free."
2. **`cpp-strict`'s `lfs: true` is unnecessary.** The C++ smoke binaries *write* to
   `captures/common-cpp-smoke/` (runtime output dir: `common/common-cpp/smoke/advection_1d.cpp:57`,
   `common/common-cpp/smoke/advection_diffusion_2d_main.cpp:16`); the C-6 interop ctest reads a **C++-emitted** `.h5`
   generated at test time (`common/common-cpp/tests/python/test_cross_language_interop.py`). No
   committed `captures/**` or `legacy-captures/**` LFS object is read. → `lfs: false` is safe.
3. **`python-strict`'s LFS need is narrow.** Its `pytest … capture/tests/` step
   (`.github/workflows/python-strict.yml:42`) runs `capture/tests/test_legacy_captures_corpus.py`, which globs
   `tests/fixtures/legacy-captures/phase-*.json` and calls `load_capture()` →
   reads the sidecar `.h5` payloads (asserts `arr.size > 0`). It needs **only
   `tests/fixtures/legacy-captures/**`** (447.44 MiB logical / smaller after dedup), **not** the
   multi-GB `captures/**` canonical refs. → `lfs: false` + targeted
   `git lfs pull --include="tests/fixtures/legacy-captures/**"`.
4. **`mutation-testing.yml` is mis-tiered.** Its own header says *"SOFT_WARN on push
   (informational), HARD_FAIL at phase landing only"* yet it runs on every push + PR; the catalog
   places mutation/fuzz at **T4 (weekly)** `[CATALOG — not in repo, § 41.4]`. Re-tiering candidate.

(INFERENCE) Per-run LFS bandwidth today ≈ python-strict (~4.85 GiB full pull) + cpp-strict
(~4.85 GiB full pull) per push **and** per PR event. After the § P3 fixes: python-strict ≈
447 MiB (corpus only), cpp-strict ≈ 0 → ~**20× per-run reduction** on the dominant bandwidth term,
independent of any backend change.

`gh run list` per-workflow history was not queried (no evidence the operator wants live CI-run
timestamps for plan-drafting); Stage 0 can attach last-success/last-fail rows if useful.

---

## § P4 — `lfs_pointer_oid()` and `verify_evidence` semantics (Invariant I1)

### P4.1 `lfs_pointer_oid()` contract (FACT — `tools/integrity/integrity/common/repo.py:85-106`)

```
_LFS_POINTER_PREFIX = b"version https://git-lfs.github.com/spec/v1"   # repo.py:81
_LFS_OID_RE = re.compile(rb"(?m)^oid sha256:([0-9a-f]{64})$")          # repo.py:82
```

Docstring (verbatim excerpt, `tools/integrity/integrity/common/repo.py:88-101`): *"A git-lfs pointer stub (spec v1) embeds the
content's sha256 directly … The `oid` is the content-addressed sha256 of the smudged artifact —
exactly the value an audit's `evidence_hashes` records for LFS-tracked captures … Parsing it from
the pointer text needs no `git lfs smudge` / network / working-tree access: the OID is
deterministic, offline, and content-addressed."* Non-pointer blobs return `None` (caller hashes
the blob directly).

### P4.2 `verify_evidence` LFS branch (FACT — `tools/integrity/integrity/scripts/verify_evidence.py:113-128`)

```
blob = file_at_sha(root, head_sha, path_str)                 # :113  git show <sha>:<path>
oid = lfs_pointer_oid(blob)                                  # :120
actual = oid if oid is not None else hashlib.sha256(blob).hexdigest()   # :121
claimed_hex = claimed[len("sha256:"):] if claimed.startswith("sha256:") else claimed  # :122
if actual != claimed_hex: result.failures.append(...)        # :123-126
```

**Load-bearing architectural fact (FACT):** `verify_evidence` is **fully offline**. It calls
`git show <sha>:<path>` (`tools/integrity/integrity/common/repo.py:63-78`, `file_at_sha`), which returns the **pointer stub** (git
does not smudge under `git show`), then parses the embedded `oid sha256:` line. It **never fetches
LFS content**, never calls `git lfs smudge`, needs no network and no LFS auth. → **I1 (the
audit-chain content-OID invariant) is decoupled from LFS *backend availability*.** A backend
migration that leaves every pointer-stub's bytes byte-identical cannot break `verify_evidence` /
I1, because the OID lives in the stub (which is a normal git blob), not in the hosted content.
This is the central reason the migration is low-risk for the evidence chain (charter § 7, I1).

### P4.3 Three Phase-2 audits verified (FACT — all PASS at HEAD)

| Audit | head_sha (audit) | pass / fail | LFS coverage |
|---|---|---|---|
| `…/sub-phase-eulerian-smoke-stack-e/landing-2026-05-25T13-21-16Z.md` | `c6ac4dfb65c1` | **9 / 0** | mixed (capture + corpus json + docs) |
| `…/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-2026-05-24T04-15-37Z.md` | `832964982b78` | **48 / 0** | schema-corpus heavy — incl. 4 LFS `.h5` (`… (sha256 OK)`) |
| `…/sub-phase-reaction-diffusion-2d-stack-c/landing-2026-05-25T23-30-00Z.md` | `62d9671157eb` | **13 / 0** | capture `…/gray-scott-lambda-128sq-…h5 (sha256 OK)` |

Command form: `python -m integrity.scripts.verify_evidence --audit <path>` (exit 0 each).
The LBM-D landing exercises multiple LFS `.h5` evidence_hashes resolving via content-OID — the
strongest single demonstration that I1 holds at HEAD. (Cross-ref spec § 7.5 `docs/architecture.md:1455`;
Appendix G.7 `docs/architecture.md:3135`; conventions § B.6 Mode-2 RESOLVED.)

---

## § P5 — Schema-corpus inventory + Phase-4 readiness

(FACT) `tests/fixtures/legacy-captures/` contains **6 `.h5` LFS payloads** + their JSON sidecars
(the corpus test globs `phase-*.json`):

| Corpus entry (.h5) | Size | Producing sub-phase (by name + OID match) |
|---|---|---|
| phase-2-eulerian-smoke-stack-e.h5 | 4.18 MiB | eulerian-smoke-stack-e (OID `aa67929f4c`, = the stack-e LDC capture) |
| phase-2-lattice-boltzmann-d3q19-stack-d-couette.h5 | 26.14 MiB | lbm-d3q19-stack-d (OID `4d171c5163`) |
| phase-2-lattice-boltzmann-d3q19-stack-d-poiseuille.h5 | 192.98 MiB | lbm-d3q19-stack-d (OID `d7ace41e54`) |
| phase-2-lattice-boltzmann-d3q19-stack-e-couette.h5 | 26.14 MiB | lbm-d3q19-stack-e (OID `71cd6e14e4`) |
| phase-2-mpm-multimaterial-stack-d-representative.h5 | 195.20 MiB | mpm-multimaterial-stack-d (UNIQUE subset, OID `652abcf3c5`) |
| phase-2-reaction-diffusion-2d-stack-c.h5 | 2.80 MiB | rd-2d-stack-c (OID `00081dc42b`) |

(FACT — `.gitattributes:38-45`) corpus `.h5` route through LFS as of LBM-stack-d Stage 2 N1
(the 202-MB Poiseuille exceeds GitHub's 100 MB hard per-file push limit); the comment notes
pre-existing non-LFS corpus entries (e.g. sph-water 61 MB) remain committed historical blobs, not
retroactively re-tagged.

(FACT) Round-trip mechanism: `capture/tests/test_legacy_captures_corpus.py` —
`test_legacy_capture_round_trips` (load + payload read), `test_legacy_capture_manifest_schema_valid`
(`validate_capture_manifest`), `test_corpus_has_phase_0_seed`. Its header (`:1-8`):
*"Activates the legacy-captures corpus replay at Block 9 LANDING … Phase 4 WU-A is the first schema
bump."*

**Phase-4 readiness (FACT — `docs/phases/phase-4-plan.md:14-15`, `:262-264`):** WU-A bumps
`schema_version` 1.0.0 → 1.1.0 adding `gradient_fields`; WU-B adds `active_mask` (same 1.1.0
bump); both additive. *"the post-bump capture reader MUST round-trip every entry in
`tests/fixtures/legacy-captures/` without loss"* (`:14`). The corpus "by Phase 4 open … ~25 entries
total" (`:15`). **Architecture impact (INFERENCE):** the round-trip is a *reader* contract on
*payload bytes*; it is **agnostic to where those bytes are hosted**. As long as the migration keeps
every corpus pointer-stub byte-identical (so `load_capture` smudges the same content), the
round-trip is unaffected. → answers D9 (just works).

---

## § P6 — Forward growth projection (Phase 4 + Phase 6 + decade horizon)

(INFERENCE throughout — labeled; ranges not point estimates.)

### P6.1 Existing per-capture size precedent (FACT, from § P1)

- Tiny (closed-form / agent): 22 KiB – 6 MiB (mandelbulb, strange-attractors, boids, physarum).
- Mid (2D / moderate 3D): 2.8 – 58 MiB (RD-2D, RD-3D, sph-water, eulerian LDC).
- Large (full-cadence 3D fields): 193 MiB – 704 MiB (LBM Poiseuille, eulerian Taylor-Green).
- Very large (3D MPM full-cadence): **1.05 GiB** (drop-impact-128cube).

Variance spans **~5 orders of magnitude.** The dispatch's anchors check out: RD-2D-stack-D
2.80 MiB (FACT), eulerian-smoke Taylor-Green 704 MiB (FACT, = the file the prior LFS migration was
created to absorb), MPM 1.05 GiB (FACT).

### P6.2 Phase 4 — 27 frontier variants

(FACT — `docs/phases/phase-4-plan.md:127` *"Phase 4 enumerates 27 frontier-variant sims"*; line 2440 each
produces `captures/<sim>-<variant>/<descriptor>.h5` **and** a corpus seed copy at
`tests/fixtures/legacy-captures/phase-4-<sim>-<variant>.h5`.) So each variant adds **≥ 2 LFS
pointers** (canonical + corpus seed), though the corpus seed may dedup against the canonical OID
(as 5 of 6 Phase-2 corpus entries do, § P1.4) or be a smaller representative subset (as the MPM
entry is).

Projection (27 variants × 1 canonical capture each; corpus seeds assumed mostly OID-dedup or
subset, so excluded from the physical estimate):

- **Optimistic** (variants skew mid-size, ~25 MiB median): 27 × 25 MiB ≈ **0.66 GiB**.
- **Pessimistic** (variants skew large — frontier 3D diff-sims with `gradient_fields` *double*
  field count; ~400 MiB median): 27 × 400 MiB ≈ **10.5 GiB**.
- **Range:** **+0.7 GiB … +10.5 GiB** on top of today's 4.85 GiB → **5.5 – 15.4 GiB physical**
  after Phase 4. (INFERENCE — `gradient_fields` per WU-A adds per-cell gradient arrays, plausibly
  ~2× the field payload for diff-enabled variants, pushing several variants into the large band.)

**Crossing point (INFERENCE):** the **10 GiB free storage** quota is crossed somewhere inside
Phase 4 under the pessimistic skew, and comfortably by Phase 4 close if even ~8 of 27 variants are
large-band. This is the concrete event the external-backend architecture exists to absorb.

### P6.3 Phase 6 — first ~16 priority sims

`[CATALOG — not in repo, § 35]` The catalog's 16-item leverage-ordered priority list (ranks 1–16)
begins with a Phase-6.0 maintenance sweep + common-module promotions (no captures), then sims:
MD-with-MLIPs, shallow-water + sediment, continuum MHD, buoyancy composition, phase-field fracture,
cardiac digital twin, dendrite growth, wildfire CA, multiphase VOF, MC radiation transport, PIC
plasma, combustion, tensor-network DMRG, robotic manipulation. (INFERENCE) Most are Tier-0/1
friendly (smaller captures) but several (MHD, PIC plasma, combustion, MD) are 3D field/particle
sims in the large band, and each may ship on 1–4 stacks (`[CATALOG § 44.1]`) with cross-tier
matched pairs → **1–3 capture instances per sim**. Rough Phase-6-first-16 add: **+3 – 12 GiB**.

### P6.4 Decade horizon

`[CATALOG — not in repo, L3381]` *"~170 phenomena and ~95 compositions (potential maximum;
realistic implementation will be 15-30 % of that over a multi-year horizon)."* 15–30 % of 265
phenomena+compositions ≈ **40 – 80 implemented units**, each × 1–3 stack/tier capture instances ×
periodic re-baseline cadence.

- **Storage upper bound (INFERENCE):** 60 units (mid) × 2 instances × ~300 MiB mean ≈ **36 GiB**;
  large-skew worst case (many 3D full-cadence ≈ 1 GiB) → **100+ GiB**.
- **Bandwidth (INFERENCE):** the binding constraint long before storage. At ~40 GiB physical, any
  CI job that full-pulls LFS burns ~40 GiB/run; even one full pull/month exceeds the 10 GiB free
  bandwidth 4×. → selective fetch + tiered cadence are **mandatory**, not optional, at horizon;
  an external **zero-egress** backend (R2) removes the bandwidth term entirely.

**Honest framing:** every figure in § P6 is a forecast. The Phase-4 27-count and per-variant
capture+corpus rule are FACT (`phase-4-plan.md`); the size-skew and stack-instance multipliers are
INFERENCE. The architecture must hold across the whole range, which is why it is tiered-CI +
selective-fetch + zero-egress-backend rather than a single point solution.

---

## § P7 — Determinism / integrity replay invariants in force (must survive transition)

| Invariant | Canonical value | Verification at HEAD `fd21445` | Result |
|---|---|---|---|
| Integrity baseline (I3) | `c19492ad…d22cb52`, 0 HARD_FAIL / 14 SOFT_WARN | `python -m integrity --all --mode strict`; sha256 of full stderr report | **PASS** (exact digest match) |
| Bit-identity replay (I2) | `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (conventions § D.3 `:253-257`; phase-1 → `v0.1.0-phase-1`) | `replay_prior_phase --prior-phase phase-1 --audit …/phase-1/landing-2026-05-20T14-18-00Z.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget` | **PASS** — `summary: prior_phase=v0.1.0-phase-1 ok=True`; 8/8 gates PASS |

(FACT) Replay invocation form per conventions § D.5 (`uv run --no-sync python -m
integrity.scripts.replay_prior_phase …` from `tools/integrity/`); exit 0. Note (FACT): the brief's
I2 label "(Phase 2)" is imprecise — per conventions § D.3 + § D.4 sub-phases do **not** join the
replay chain; the canonical bit-identity replay is **phase-1 → `v0.1.0-phase-1`** and that is what
re-verifies at HEAD. The digest itself is the cached value documented at § D.3; the replay tool
reports `ok=True` (verdict-match) rather than re-printing the 64-hex string. Stage-1a/1b/1c
harnesses should assert byte-equality against the § D.3 value explicitly.

Both invariants are **content-addressed** (sha256 of report / of replay gate-set) and **offline**;
neither reads hosted LFS content. (INFERENCE) Like I1, they are therefore robust to a backend
migration that preserves pointer-stub bytes — the migration moves *content*, not the *git objects*
the invariants hash.

---

## External backend survey (§ S1–S7)

All facts web-fetched 2026-05-26 by dedicated research passes; URLs + access date inline. No
training-data fabrication; unverifiable items marked UNVERIFIED.

### § S1 — Cloudflare R2

- **Free tier:** 10 GB-month storage; 1 M Class A ops/mo; 10 M Class B ops/mo; **egress free**.
  Source: https://developers.cloudflare.com/r2/pricing/ (2026-05-26).
- **Paid (Standard):** storage **$0.015/GB-mo**; Class A **$4.50/M**; Class B **$0.36/M**; egress
  **free** (verbatim: *"Egressing directly from R2 … does not incur data transfer (egress) charges
  and is free."*).
- **S3 compatibility:** implements S3 API incl. full multipart-upload set + Get/Put/Head/Delete/
  List/Copy — *all an S3 LFS transfer agent needs*. Not supported: ACLs, bucket policies,
  versioning, replication, object tagging, KMS, object-lock. Region fixed `auto`. Source:
  https://developers.cloudflare.com/r2/api/s3/api/ (2026-05-26).
- **Git-LFS integration:** (a) custom-transfer agent (`lfs-s3`, § S7) — lightest, no server;
  (b) S3-backed LFS server (`rudolfs`/`giftless`) pointed at R2; (c) CDN-fronted bucket for reads.
- **GitHub Actions creds:** **R2 has NO OIDC federation with GitHub Actions** (verified). Temp
  credentials are derived from a parent R2 API token (static secret). 2026 pattern = store a
  scoped R2 API token in Actions Secrets, optionally mint short-lived scoped creds at job start.
  Sources: https://developers.cloudflare.com/r2/api/s3/temporary-credentials/ ,
  https://community.cloudflare.com/t/openid-connect-authentication-for-cloudflare-api/492897 .
- **Lock-in:** low — S3 API means exit via `rclone sync` / `aws s3 sync`; zero egress makes the
  read side of any future migration free; LFS objects are OID-addressed so re-pointing storage
  needs no history rewrite.

### § S2 — Backblaze B2

- **Free tier:** first 10 GB storage free; Class A/B/C transactions free; Class D first 2,500/day
  free; egress free up to **3× monthly-average storage**. Sources:
  https://www.backblaze.com/cloud-storage/pricing , …/transaction-pricing (2026-05-26).
- **Paid:** storage **$0.005/GB-mo** (~3× cheaper than R2); egress beyond 3× = $0.01/GB, **OR
  unlimited free via Cloudflare CDN / Bandwidth Alliance**.
- **Bandwidth Alliance (verified active 2026):** Backblaze remains a partner; free egress
  "to or through partner CDNs … including Fastly, Cloudflare, bunny.net …". Expanded to 20 partners
  (Oct 2025). Sources: https://www.cloudflare.com/bandwidth-alliance/ ,
  https://blog.cloudflare.com/bandwidth-alliance-charges-forward/ .
- **S3 compatibility:** S3-compatible API (object + multipart). Same LFS-agent paths as R2.
- **Creds:** application keys (keyID + appKey, bucket-scopable); **no GitHub OIDC**; temporary-
  credential equivalent UNVERIFIED.

### § S3 — GitHub LFS "data packs"

- **REMOVED** — replaced by metered billing (§ P2). The "stay-and-pay, stackable $5 packs" option
  the brief described no longer exists. The honest lowest-friction paid option is now: **delete the
  $0 budget and pay metered** ($0.07/GiB-mo storage + $0.0875/GiB bandwidth). Source:
  https://docs.github.com/en/billing/how-tos/products/upgrade-git-lfs-storage (2026-05-26).
- Lowest-friction dollar-for-dollar at small overage; but bandwidth metering is the expensive term
  for CI-heavy egress, which is exactly where R2's free egress wins.

### § S4 — DVC + cloud storage — **disqualifier on the sha256 invariant**

- **Not a drop-in for git-LFS;** adoption = full migration off LFS (`.dvc` pointer files replace
  `.gitattributes` LFS filters; separate cache→remote model). Sources:
  https://doc.dvc.org/user-guide/data-management/remote-storage ,
  https://lakefs.io/blog/dvc-vs-git-vs-dolt-vs-lakefs/ (2026-05-26).
- **Default hash = MD5; sha256 is NOT a supported option** (verbatim: cache path
  `.dvc/cache/files/md5/…`; feature request #3069 open since 2020-01-06 unresolved). Sources:
  https://doc.dvc.org/user-guide/project-structure/internal-files ,
  https://github.com/treeverse/dvc/issues/3069 .
- **Decision-relevant (INFERENCE):** DVC's MD5 keying is incompatible with the project's
  **sha256 content-OID invariant (I1, IC-16)**. Adopting DVC would force sha256 to be carried as a
  *separate* manifest layer atop DVC's MD5 cache — strictly worse than keeping git-LFS's native
  sha256 OID. **DVC is contraindicated** for this project on determinism grounds.

### § S5 — AWS S3 (reference only; operator excluded self-hosting/AWS)

- us-east-1: storage **$0.023/GB-mo**; egress **$0.09/GB** (first 100 GB/mo egress free,
  permanent, aggregated across AWS); PUT **$0.005/1k**; GET **$0.0004/1k**. New-account free tier
  is now a **$200-credit / 6-month** model (no fixed 5 GB). Source: https://aws.amazon.com/s3/pricing/ .
- The one S3-compatible option with **GitHub OIDC keyless CI** (AWS STS added GitHub OIDC claim
  validation Jan 2026: https://aws.amazon.com/about-aws/whats-new/2026/01/aws-sts-supports-validation-identity-provider-claims/).
  Egress cost makes it the *most expensive* for CI-heavy pulls, so it is reference-only.

### § S6 — Research-data archives (complement, not LFS backend)

- **Hugging Face Datasets** — Hub uses git+LFS with **sha256 OIDs natively** (the *only* surveyed
  archive whose content addressing matches I1). Free: 100 GB private; public best-effort; hard
  single-file cap 500 GB. No DOI. Source: https://huggingface.co/docs/hub/en/storage-limits .
- **Zenodo** — 50 GB / 100-file default per record (expandable on request), **DOI per record**,
  MD5 fixity. Best for *citable paper-supplement* snapshots. Sources:
  https://support.zenodo.org/help/en-gb/1-upload-deposit/80-… , https://help.zenodo.org/docs/deposit/manage-quota/ .
- **Internet Archive** — free, ≤500 GB/1000 files practical per item, MD5/SHA1 fixity, no DOI.
  Source: https://help.archive.org/help/uploading-tips/ .
- (INFERENCE) These map to catalog product-mode reuse `[CATALOG § 33]`; appropriate as a **D7**
  periodic captures-archive complement (deferrable to Phase 5 preprint-extraction), not a backend.
  HF Datasets is the natural complement (sha256-native); Zenodo for the DOI a paper needs.

### § S7 — Custom-transfer agents / S3-compatible LFS servers

- **git-lfs custom-transfer API:** an external process git-lfs spawns, speaking line-delimited
  JSON over stdin/stdout (`init`/`upload`/`download`/`progress`/`complete`); object bytes bypass
  the git host while the host still serves the LFS *batch* metadata. Configured via
  `lfs.customtransfer.<name>.path` + `lfs.standalonetransferagent`. Source:
  https://github.com/git-lfs/git-lfs/wiki/Implementations .

| Project | License | Last release | S3-compat | Type |
|---|---|---|---|---|
| **`lfs-s3`** (nicolas-graves) | MIT | **v0.2.2, 2026-04-21** | Yes (R2/B2/any) | custom transfer agent (Go) |
| `rudolfs` (jasonwhite) | MIT | recency UNVERIFIED | Yes (S3 + MinIO) | full LFS server (Rust), cache+crypto |
| `giftless` (datopian) | MIT | v0.6.2, 2024-12-16 | Yes (S3/Azure/GCS) | full LFS server (Python) |
| `git-remote-s3` (awslabs) | Apache-2.0 | v0.3.2, 2026-03-14 | **AWS-only** | git remote helper + LFS transfer |
| `lfs-folderstore` (sinbad) | MIT | **ARCHIVED 2023-12-01** | No (filesystem) | custom transfer agent |

(INFERENCE) **`lfs-s3` is the best-maintained, provider-portable choice** (fresh 2026 release,
S3-generic so it works with both R2 and B2). `git-remote-s3` is more popular but AWS-locked
(excluded). `rudolfs`/`giftless` add a server to host (more operational burden — counter to the
operator's "low ongoing operational burden" preference).

---

## Synthesis → routes into the charter

1. **Reframe (P2):** quota is 10 GiB+10 GiB, not 1+1; data packs gone. Storage is *under* free
   quota today; **bandwidth from 2 CI workflows is the live pressure**. The backend migration is a
   *forward-looking* capacity move for the Phase-4 10-GiB storage crossing (P6.2), not an
   emergency unblock.
2. **Highest-leverage immediate lever (P3):** selective LFS fetch — `lfs: false` on cpp-strict
   (needs zero captures), `lfs: false` + targeted corpus pull on python-strict — ~20× per-run
   bandwidth cut. This is catalog § 45.1 applied to LFS; correct regardless of backend (charter
   § A1).
3. **Backend lean (S1/S2/S4/S5):** R2 (zero egress, 10 GB free, S3-compat, low lock-in) via the
   `lfs-s3` custom-transfer agent; B2+Cloudflare is the cheaper-storage alternative; **DVC is
   contraindicated (MD5 breaks I1)**; AWS reference-only. → charter D1.
4. **Invariants are backend-robust (P4/P7):** I1/I2/I3 are all offline + content-addressed; a
   pointer-byte-preserving migration cannot break them. The risk surface is **content
   *availability*** (I5 — historical captures resolvable at old tags during cutover), not OID
   *resolution*. → charter § 7, D3 (cutover strategy).
5. **Phase-4 just-works (P5):** corpus round-trip is a reader contract on payload bytes,
   host-agnostic. → charter D9 = just works (verify, don't re-architect).
