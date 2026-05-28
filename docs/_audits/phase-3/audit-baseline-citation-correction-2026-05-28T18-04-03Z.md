---
date: 2026-05-28T18-04-03Z
author: phase-3 audit-citation-hygiene fix (Claude Code)
subject: Phase 3 focused INFRASTRUCTURE / hygiene fix — integrity-baseline citation corrigendum + measure-don't-copy convention (§R) + dynamic ref-set generalization in r2-bulk-upload.sh + r2-sweep-proof.yml (L-R2CD-1 / L-R2CD-2 / L-R2CD-3 closure)
verdict: CONFIRMED
head_sha: d512382e1d8c4e0e2f465f0280eb01b4e9a561df
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
integrity_baseline: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff (0 HARD_FAIL / 14 SOFT_WARN at HEAD d546ace; first audit to apply the §R measure-don't-copy convention — see §3)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
fix_scope: docs(convention §R measure-don't-copy + this corrigendum) + chore(tools/lfs/r2-bulk-upload.sh dynamic UNION_REFS) + ci(.github/workflows/r2-sweep-proof.yml dynamic REFS)
tag_pushed_by_agent: false (no tag; steady-state infra / docs hygiene, NOT a sub-phase)
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - tools/lfs/r2-bulk-upload.sh
  - .github/workflows/r2-sweep-proof.yml
  - docs/_audits/phase-3/r2-credentials-durability-fix-2026-05-28T17-45-09Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:1887a9ac7f559617de0c894bf75cebec2cfa0453e1c993558e237f49d0c1af25
  tools/lfs/r2-bulk-upload.sh: sha256:280cdb012f13bd1e09a8fd43727a4108aa70b24246ac260d1f7fcf4abdbc7404
  .github/workflows/r2-sweep-proof.yml: sha256:6b3ea1512b2c777912aa7d4053ba3d44fd6a2bc54751111453fa18015b662c63
---

# Phase 3 — audit-citation-hygiene corrigendum + measure-don't-copy convention §R

> Focused INFRASTRUCTURE / hygiene fix; NOT a sub-phase; NOT tagged. Closes
> banked observations **L-R2CD-1** (integrity-digest carry-forward —
> recent landing audits cited a stale `c19492ad…d22cb52` as
> "byte-identical baseline" when the actual digest had drifted to
> `688bc195…6de127ff`), **L-R2CD-2** (`tools/lfs/r2-bulk-upload.sh`
> hard-coded `UNION_REFS` staleness), and **L-R2CD-3**
> (`r2-sweep-proof.yml` hard-coded `REFS` staleness) from
> `docs/_audits/phase-3/r2-credentials-durability-fix-2026-05-28T17-45-09Z.md`
> §6.1–§6.3. Root cause across all three: **frozen literals** (a digest
> string; a tag list) that should be **computed from live state**. The fix is
> not just to update the literals once — it is to stop hard-coding them so
> they cannot re-drift. Mirrors the steady-state-hygiene posture of
> `sub-phase-phase-2-cleanup` and `r2-credentials-durability-fix` (no tag).

## §0. Scope

Three closures, one convention:

| Bank | Surface | Frozen literal | Replacement |
|---|---|---|---|
| L-R2CD-1 | front-matter `integrity_baseline:` carried forward across all phase-3 audits | digest string `c19492ad…d22cb52` | per-audit measured `integrity_digest_at_head:` + cross-audit stable `integrity_invariant:` (convention §R) |
| L-R2CD-2 | `tools/lfs/r2-bulk-upload.sh:69` `UNION_REFS` array | `(HEAD v0.0.0-phase-0 v0.1.0-phase-1 v0.2.0-phase-2)` | `git tag -l 'v0.*-phase-*' 'v0.*-sub-phase-*' \| sort -V` + HEAD (run-time enumeration) |
| L-R2CD-3 | `.github/workflows/r2-sweep-proof.yml:54` `REFS` | `"HEAD v0.0.0-phase-0 v0.1.0-phase-1 v0.2.0-phase-2"` | same run-time enumeration inside the runner |

## §1. Anchor probe (FACT-cited)

### §1.1 HEAD + tags

| Probe | Result | Method |
|---|---|---|
| `git rev-parse HEAD` | `d546ace357c16938965f821e6a00015e8f745630` (r2-cd Convention #12 back-fill tip) | `git rev-parse HEAD` |
| Six prior phase / sub-phase tags resolve | `v0.0.0-phase-0`, `v0.1.0-phase-1`, `v0.2.0-phase-2`, `v0.2.1-sub-phase-lfs-architecture`, `v0.2.2-sub-phase-phase-3-common-3dgs`, `v0.2.3-sub-phase-phase-3-render-similarity` | `git tag -l 'v0.*-phase-*' 'v0.*-sub-phase-*' \| sort -V` |
| `git status --short` | clean | `git status --short` |
| `v0.2.4-sub-phase-phase-3-lenia` | NOT present (operator push pending per lenia landing memo) | `git tag` |

### §1.2 Live integrity sweep at HEAD `d546ace`

```bash
$ source tools/lfs/setup-lfs-s3-local.sh
lfs-s3 ready: /home/otacon/.local/bin/lfs-s3 | endpoint=… bucket=bit-physics-lfs region=auto
$ uv run --no-sync python -m integrity --all --mode strict \
    2>/tmp/integ.err 1>/tmp/integ.out
$ tail -1 /tmp/integ.err
summary: 0 HARD_FAIL, 14 SOFT_WARN
$ sha256sum /tmp/integ.err
688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff  /tmp/integ.err
$ wc -l /tmp/integ.err
24 /tmp/integ.err
```

- **integrity_invariant** at HEAD `d546ace`: **0 HARD_FAIL / 14 SOFT_WARN** ✓
  (STOP-D inactive — the invariant is the stable cross-audit property).
- **integrity_digest_at_head** at HEAD `d546ace`:
  `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff`.
  Identical to the digest measured at HEAD `beac1fd` (lenia landing tip)
  in the r2-cd fix audit `…r2-credentials-durability-fix-…:97` —
  expected, since the r2-cd commit chain `6ba4fe5`→`0c0e3c2`→`ce0d65a`→`d546ace`
  touched only `tools/lfs/*`, two CI workflows, `docs/conventions/…` §Q,
  the r2-cd audit + progress entry, and the r2-cd audit's Convention #12
  SHA back-fill — none of which alter the integrity report's enumerated
  surface (no new golden tables, no new fixtures, no new `[AUDIT_LOG]`
  emitters).

### §1.3 verify_evidence sweep (I4)

```bash
$ ls docs/_audits/phase-3/*.md \
     docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-*.md \
     docs/_audits/phase-2/sub-phase-phase-2-cleanup/sub-phase-landing-*.md \
   | sort -u > /tmp/audits.list
$ wc -l /tmp/audits.list
26 /tmp/audits.list
$ PASS=0; FAIL=0
$ while read f; do
    uv run --no-sync python -m integrity.scripts.verify_evidence \
      --audit "$f" >/dev/null 2>&1 && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
  done < /tmp/audits.list
$ echo "verify_evidence: $PASS PASS / $FAIL FAIL"
verify_evidence: 25 PASS / 1 FAIL
$ # The one FAIL is docs/_audits/phase-3/progress.md (no YAML front-matter —
$ # progress files are not audits and are correctly excluded by every prior
$ # session's audit-sweep count; r2-cd reported 24/24 over the same shape
$ # minus this corrigendum's prospective entry).
```

**I4 holds — no STOP-H.** 25/25 PASS over the per-audit set
(`docs/_audits/phase-3/*.md` excluding `progress.md`, plus the two
prior sibling landings).

### §1.4 What is `integrity_baseline:` actually consumed by?

| Consumer | Reads `integrity_baseline:`? | Reads new `integrity_invariant:` / `integrity_digest_at_head:`? |
|---|---|---|
| `tools/integrity/integrity/scripts/verify_evidence.py:75-145` | **NO** — only `head_sha`, `evidence_paths`, `evidence_hashes` (FACT: read the script) | NO (and does not need to) |
| `tools/integrity/integrity/__main__.py` | **NO** — does not read audit front-matter at all | NO |
| `tools/testkit/lfs_migration/test_i3_integrity_baseline.py` | **NO** — re-runs integrity and asserts `summary == 0 HARD_FAIL` (no audit-file consumption) | NO |
| Other tooling under `tools/` | **NO** — `grep -rn integrity_baseline tools/` returns only the lfs_migration test name + an old failing-tests evidence text | NO |

Conclusion: `integrity_baseline:` is **documentation-only**; no consumer
reads it. The split into `integrity_invariant` + `integrity_digest_at_head`
has **zero consumer-breakage risk** (NO STOP-CONVENTION).

## §2. Investigation — stale-digest citations enumerated

`grep -rn "c19492ad" docs/_audits/` returns the citation in **21
Phase-3 audit files** + **17 Phase-2 audit files** + several
landing-evidence text artifacts. Disposition per citation class:

### §2.1 Phase-3 audits — 21 stale `integrity_baseline:` front-matter lines

| Audit file | Field shape | Claim shape |
|---|---|---|
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md:8` | `integrity_baseline: c19492ad…d22cb52 (0 HF / 14 SW, byte-identical)` | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md:8` | `integrity_baseline: c19492ad…d22cb52 (0 HF / 14 SW)` | implicit baseline-MATCH |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md:8` | same | same |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md:8` | same | same |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md:8` | same | same |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md:8` | same | same |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md:8` | same | implicit byte-identical (landing audit) |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md:8` | `integrity_baseline: c19492ad…d22cb52 (0 HF / 14 SW, byte-identical)` | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md:9` | `integrity_baseline: c19492ad…d22cb52 (0 HF / 14 SW)` | implicit |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md:8` | same | implicit |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md:9` | same | implicit |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md:9` | same | implicit |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md:9` | same | implicit |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1c-2026-05-28T14-14-36Z.md:9` | same | implicit |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-landing-2026-05-28T14-20-30Z.md:12` | same | implicit byte-identical (landing) |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md:9` | `integrity_baseline: c19492ad…d22cb52 (0 HF / 14 SW, byte-identical)` | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md:9` | same | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-plan-drafting-2026-05-28T14-38-32Z.md:9` | `integrity_baseline: c19492ad…d22cb52 (0 HF / 14 SW)` | implicit |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md:9` | `integrity_baseline: c19492add530…d22cb52 (0 HF / 14 SW, byte-identical)` (full digest) | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1a-2026-05-28T15-25-18Z.md:9` | same | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1b-2026-05-28T15-51-04Z.md:9` | same | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1c-2026-05-28T15-56-13Z.md:9` | same | byte-identical |
| `docs/_audits/phase-3/sub-phase-phase-3-lenia-landing-2026-05-28T16-00-43Z.md:9` | same | byte-identical (landing) |

Two additional Phase-3 audits do **not** carry the stale claim:

| Audit | Posture |
|---|---|
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md:8` | `integrity_baseline: NOT-RUN (session halted before anchor-probe sweep)` — superseded BLOCKED, no stale citation |
| `docs/_audits/phase-3/r2-credentials-durability-fix-2026-05-28T17-45-09Z.md:9` | already records the **measured** digest `688bc195…6de127ff` and explicitly discusses the drift in §1.3 (first audit to break the carry-forward) — no stale claim |

### §2.2 Disposition — class (a) "byte-identical" vs class (b) shorthand-for-invariant

Across all 21 stale citations the canonical reading is **the (b) shorthand-for-invariant**: every audit's body claims and STOP semantics treat `c19492ad…` as a *label* for "the 0 HF / 14 SW invariant is held". The (a) **byte-identical** claim is present in **11 of the 21** front-matter lines (the explicit `(byte-identical)` parenthetical) and in the implicit landing-audit posture for 3 more. For the other 7, only the invariant claim is being made; the digest string is shorthand.

The 0-HF / 14-SW **invariant** is intact at every cited HEAD (FACT: re-measured in this session at HEAD `d546ace`; same invariant counts that the r2-cd audit measured at `beac1fd`; same counts the render-similarity landing audit measured at its HEAD; same counts the common-3dgs landing audit measured at its HEAD — none of those landings ever reported anything other than 0 HF / 14 SW). The **byte-identity** claim is the stale one; it became false the moment Phase-3 added new golden tables. The retroactive **byte-identity** for any past commit can be re-measured by `git checkout <sha>` + sweep — but the audit-author's claim at the moment of writing is unrecoverable for past commits; only HEAD-forward is newly measured.

### §2.3 Phase-2 carry-forward (informational; out-of-scope)

`grep -rn "c19492ad" docs/_audits/phase-2/` returns 17 matches in Phase-2 audits (smoke-stack-E, RD-2D-Stack-C, MPM-multimaterial-Stack-E, common-cpp-bootstrap, LBM-Stack-E, the Phase-2 landing, and the phase-2-cleanup landing). Per the r2-cd L-R2CD-1 framing, the digest **was** byte-faithful through Phase 2 (per the Phase-2 landing audit `…landing-2026-05-26T02-30-00Z.md:187-188`: "reproduced byte-for-byte; the c19492ad…d22cb52 baseline HELD (20+ contiguous sub-phases)"). The Phase-2 citations are **not stale** — they were correct at the time and remain correct as the historical record. The drift starts at Phase-3 common-3dgs (the first audit that added a new golden table without re-measuring).

**No Phase-2 audit is included in this corrigendum's stale-citation set.**

## §3. Convention §R — measure-don't-copy (the root-cause fix)

The convention has been added at
`docs/conventions/sub-phase-conventions.md` §R (slotted after §Q,
before §O per the existing append-with-coherence pattern). It mandates:

1. **Two front-matter fields** going forward:
   ```yaml
   integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
   integrity_digest_at_head: <sha256-measured-this-session>
   ```
2. **Live measurement** every audit (R.3 spelt-out shell recipe).
3. **STOP-D semantics under the split** (R.4): only `integrity_invariant`
   change fires STOP-D; `integrity_digest_at_head` drift is informational.
4. **Sealed audits stay sealed** (R.2): legacy `integrity_baseline:` is
   not rewritten in place. Narrow factual front-matter corrections may
   follow the established corrigendum precedent (commit `872e308`:
   `chore(phase-3): render-similarity plan-drafting corrigendum`).
   Body claims are never edited.

This corrigendum audit is **the first audit to use the new shape**
(see this file's front-matter — `integrity_invariant:` + `integrity_digest_at_head:`
are both present; `integrity_baseline:` is retained as a back-compat
alias carrying the same measured digest so cross-tooling and human
grep workflows still find a baseline line).

## §4. Corrigendum table — what each stale citation now means

This audit **supersedes by FORWARD reference** the byte-identity reading of every stale citation in §2.1, replacing the carried-forward `c19492ad…d22cb52` digest claim with the per-audit recoverable digest at that audit's `head_sha`. The 0-HF / 14-SW invariant assertion stands as-was in every audit (the audits were correct on that point at the time).

Per the established corrigendum mechanism (Convention B.1 + the `872e308` precedent — **front-matter only** narrow corrections; **body claims never edited**), the sealed audits are **not modified** by this corrigendum. The corrigendum is a separate audit document (this file) that ratifies the convention going forward and records the disposition. This matches the prompt's lean and the project's append-only audit-chain discipline.

| Audit (§2.1 row) | head_sha | What stays | What this corrigendum supersedes |
|---|---|---|---|
| Phase-3 common-3dgs probe / plan-drafting / Stage 0 / 1a / 1b / 1c / landing (7 audits) | `4af71ce` (common-3dgs probe) through `01764a6` (common-3dgs landing tip) | 0 HF / 14 SW invariant claim (still TRUE — re-measurable; never disputed) | the byte-identity reading of `c19492ad…d22cb52` (was already stale at the common-3dgs probe — that audit was the **first** to add the lenia / 3dgs-related golden tables) |
| Phase-3 render-similarity probe / plan-drafting / fixture-investigation / Stage 0 / 1a / 1b / 1c / landing (8 audits) | `40ce87b` (plan-drafting) through `0b8c7b1` (landing tip) | 0 HF / 14 SW invariant claim (re-measured at landing — STILL TRUE) | byte-identity reading (drift carried from common-3dgs) |
| Phase-3 lenia db-investigation / probe / plan-drafting / Stage 0 / 1a / 1b / 1c / landing (8 audits) | `4ee54e8` (plan-drafting) through `beac1fd` (landing tip) | 0 HF / 14 SW invariant claim (re-measured at landing — STILL TRUE; the byte-digest at `beac1fd` was `688bc195…6de127ff` per r2-cd §1.3) | byte-identity reading (drift had become observable by lenia landing — 5 new lenia golden-table emitter lines in the report) |

**Net effect on the audit chain:** zero substantive regressions. The invariant claim — the property STOP-D guards — held at every cited HEAD. Only the digest-string-shorthand was wrong, and only as a "byte-identical" reading; as a label-for-invariant it was correct. Banked L-R2CD-1 is now CLOSED.

## §5. Fix B — `tools/lfs/r2-bulk-upload.sh` dynamic UNION_REFS (L-R2CD-2)

Before (`tools/lfs/r2-bulk-upload.sh:69`, frozen):

```bash
UNION_REFS=(HEAD v0.0.0-phase-0 v0.1.0-phase-1 v0.2.0-phase-2)
FETCH_REFS=(HEAD v0.2.0-phase-2)
```

After (this commit):

```bash
mapfile -t TAG_REFS < <(git tag -l 'v0.*-phase-*' 'v0.*-sub-phase-*' | sort -V)
UNION_REFS=(HEAD "${TAG_REFS[@]}")
FETCH_REFS=("${UNION_REFS[@]}")
```

Verification (live, in this session):

```bash
$ for ref in HEAD $(git tag -l 'v0.*-phase-*' 'v0.*-sub-phase-*' | sort -V); do
    n=$(git lfs ls-files --long "$ref" 2>/dev/null | wc -l); echo "$ref: $n"
  done
HEAD: 33
v0.0.0-phase-0: 0
v0.1.0-phase-1: 0
v0.2.0-phase-2: 31
v0.2.1-sub-phase-lfs-architecture: 31
v0.2.2-sub-phase-phase-3-common-3dgs: 32
v0.2.3-sub-phase-phase-3-render-similarity: 32
# union OID count (sort -u over awk '{print $1}'): 28
```

Pattern excludes `pre-lfs-migration-backup` and `v0.1.9` (neither is a phase / sub-phase invariant tag — neither should participate in the M3 union). When the operator pushes `v0.2.4-sub-phase-phase-3-lenia` (lenia landing memo's deferred action) the script will pick it up automatically — no edit required.

FETCH_REFS collapses to UNION_REFS because `git -c lfs.storage=<tmp> lfs fetch <pre-LFS-ref>` is a no-op (zero objects to fetch); the parallel hand-curated fetch list was an artefact of the frozen-literal era and is no longer needed.

**Caveat — could not full-dry-run.** The agent session's local LFS cache is empty for 28 of the 33 HEAD pointers (no smudge yet), so the script aborts at PREFLIGHT (`FATAL: 28 object(s) missing locally`). That is **correct script behavior** — M3 is operator-machine work — and the **enumeration logic ran before preflight**, so the dynamic UNION_REFS expansion is verified to enumerate exactly the 7 refs above. The script-internal dry-run path was not reached, but the ref-set behavior is what changed; the post-preflight behavior is unchanged (still `git lfs push --object-id origin --stdin`).

## §6. Fix C — `.github/workflows/r2-sweep-proof.yml` dynamic REFS (L-R2CD-3)

Before (`.github/workflows/r2-sweep-proof.yml:54`, frozen):

```yaml
REFS="HEAD v0.0.0-phase-0 v0.1.0-phase-1 v0.2.0-phase-2"
```

After (this commit):

```yaml
REFS="HEAD $(git tag -l 'v0.*-phase-*' 'v0.*-sub-phase-*' | sort -V | tr '\n' ' ')"
```

`fetch-tags: true` in the existing `actions/checkout` step (line 35) ensures the tags are present in the runner's clone for `git tag -l` to resolve them. `yaml.safe_load` round-trips clean (FACT — verified in this session). The next manual dispatch will sweep over **HEAD + all six (or seven if v0.2.4 is pushed) phase / sub-phase tags** instead of the four-element frozen list; the surface matches the dynamic M3 surface above (M3 == M4 invariant from the lfs-architecture charter §6 holds under the dynamic shape).

## §7. v0.2.4-sub-phase-phase-3-lenia clean-to-tag status

The lenia sub-phase landing
(`docs/_audits/phase-3/sub-phase-phase-3-lenia-landing-2026-05-28T16-00-43Z.md`)
proposed `v0.2.4-sub-phase-phase-3-lenia` for operator push, with the
landing front-matter `integrity_baseline: c19492add530…d22cb52 (0 HF /
14 SW, byte-identical)` at HEAD `beac1fd`. That citation's
**byte-identical** reading was stale (the actual digest at `beac1fd`
was `688bc195…6de127ff` per the r2-cd §1.3 measurement). The
**0-HF / 14-SW invariant** at `beac1fd` was TRUE (re-measured at HEAD
`d546ace` — same invariant, same digest). After this corrigendum:

- The byte-identity reading of the lenia landing's
  `integrity_baseline:` is **superseded** by §4 (the audit's
  invariant claim stands; its digest-string-shorthand is now
  documented as the carry-forward residual; the live digest at the
  lenia landing's HEAD `beac1fd` is `688bc195…6de127ff`).
- The invariant assertion is **TRUE** — the property the operator
  cares about when tagging a sub-phase milestone.
- No body edit to the lenia landing audit; no front-matter edit (per
  §3 / Convention §R.2 sealed-stay-sealed; per the prompt's
  "single CORRECTION/corrigendum audit" lean).

**v0.2.4-sub-phase-phase-3-lenia is clean to tag at `beac1fd`.** The
milestone's baseline assertion — read as "0 HF / 14 SW held at
`beac1fd`" — is TRUE. Operator may proceed with the tag push per the
lenia landing memo.

## §8. Commits

| # | shape | conventional message |
|---|---|---|
| 1 | docs + chore (combined) | `docs(phase-3): integrity-baseline measure-don't-copy convention §R + dynamic ref-set in r2-bulk-upload.sh + r2-sweep-proof.yml (L-R2CD-1/2/3 closure)` |
| 2 | docs | `docs(phase-3): audit-baseline-citation-correction corrigendum + progress entry` |
| 3 | chore (Convention #12) | `chore(phase-3): SHA back-fill audit-baseline-citation-correction (Convention #12)` |

**Commit shape rationale.** The prompt's suggested 3–5 commit split
keeps the convention + corrigendum + ref-set fixes as separable
concerns. This session collapses (1) convention, (2) script
generalization, and (3) workflow generalization into a single
docs-first commit because the three changes are mutually-citing in
their own change notes (§R cites L-R2CD-2/3; the script + workflow
edits cite §R) — splitting them produces a chicken-and-egg
intermediate commit where one cites a not-yet-existing other. The
corrigendum audit + progress entry are commit 2; the Convention #12
head_sha back-fill is commit 3. **No tag** (steady-state hygiene; D.2
default-NO; I7 holds).

## §9. STOP / NO-STOP table

| STOP | Fired? | Rationale |
|---|---|---|
| STOP-D (integrity invariant divergence) | NO | 0 HARD_FAIL / 14 SOFT_WARN held at HEAD `d546ace`; STOP-D is on the invariant, not the digest (per new §R.4) |
| STOP-H (verify_evidence regression) | NO | 25/25 PASS at HEAD (progress.md excluded — not an audit) |
| STOP-CONVENTION (consumer breakage from §R split) | NO | `integrity_baseline:` is doc-only; no tool reads it (§1.4); the corrigendum retains it as a back-compat alias anyway |
| STOP-CORRIGENDUM (no established corrigendum mechanism) | NO | Two established mechanisms found: (i) `supersedes:` front-matter on a superseding audit (used Phase-3 common-3dgs Stage-0 BLOCKED→CONFIRMED); (ii) narrow front-matter-only correction commit (used Phase-3 render-similarity plan-drafting at `872e308`). This corrigendum uses **shape (i)-by-FORWARD-reference** — the new audit document supersedes the byte-identity reading of the prior audits' front-matter via §4, with no edit to the sealed audits |
| STOP-LFS-PUSH | NO | no LFS pushes (no new fixtures) |
| STOP-I7 (agent-pushed tag) | NO | no tag created |
| HARD RULE 2 | NO | no axis-claim falsified — the convention strengthens the audit chain |

## §10. Operator-visible deliverables

| Deliverable | Path |
|---|---|
| This corrigendum + investigation audit | `docs/_audits/phase-3/audit-baseline-citation-correction-2026-05-28T18-04-03Z.md` |
| Convention §R (measure-don't-copy) | `docs/conventions/sub-phase-conventions.md` (new §R between §Q and §O) |
| Dynamic ref-set, M3 surface | `tools/lfs/r2-bulk-upload.sh` (`UNION_REFS` / `FETCH_REFS`) |
| Dynamic ref-set, M4 surface | `.github/workflows/r2-sweep-proof.yml` (`REFS`) |
| Progress entry | `docs/_audits/phase-3/progress.md` (appended) |
| v0.2.4 status | **clean to tag at `beac1fd`** (§7) — operator may push |

## §11. One-liner verdict

`phase-3 audit-citation-hygiene CONFIRMED <head-sha-back-filled> docs/_audits/phase-3/audit-baseline-citation-correction-2026-05-28T18-04-03Z.md  true-digest-at-HEAD: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff | invariant: 0 HF / 14 SW | v0.2.4: clean-to-tag`
