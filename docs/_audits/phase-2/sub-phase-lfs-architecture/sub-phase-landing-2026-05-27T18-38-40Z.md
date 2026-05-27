---
date: 2026-05-27T18-38-40Z
author: lfs-architecture-stage-2-landing-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lfs-architecture-stage-2-landing
stage: stage-2-sub-phase-landing
verdict: CONFIRMED-sub-phase-landing
head_sha: 6139b5958354311cbecb1c2944ebbd41f0f908f6
head_sha_at_checkpoint: 6139b5958354311cbecb1c2944ebbd41f0f908f6
evidence_paths:
  - docs/phases/sub-phase-lfs-architecture.md
  - tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/plan-drafting-landing-2026-05-26T22-55-17Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/stage-0-checkpoint-2026-05-26T23-53-24Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/stage-1a-checkpoint-2026-05-27T11-54-39Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/r2-roundtrip-proof-2026-05-27T12-57-19Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/stage-1b-checkpoint-2026-05-27T13-06-08Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/m3-bulk-upload-2026-05-27T17-39-06Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/m3-bulk-upload-2026-05-27T17-39-06Z.manifest.json
  - docs/_audits/phase-2/sub-phase-lfs-architecture/m4-r2-sweep-proof-2026-05-27T17-47-24Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/m3-m4-m5-checkpoint-2026-05-27T18-06-21Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/sha-back-fill-2026-05-26T22-55-17Z.md
evidence_hashes:
  docs/phases/sub-phase-lfs-architecture.md: sha256:139ac47acce662230f30fff1dfce130f91fb715dc5e278a062fd4cc3d70a35f8
  tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md: sha256:68c6bd42f592cafc5bcb92de628f9daaf74005d4d8f0e146bf2591c127f01bb3
  docs/_audits/phase-2/sub-phase-lfs-architecture/plan-drafting-landing-2026-05-26T22-55-17Z.md: sha256:e0c9acd2dc1b2d73ac35d734ce98d313e7b85a7960fa1ae7f0901e5eb2e77701
  docs/_audits/phase-2/sub-phase-lfs-architecture/stage-0-checkpoint-2026-05-26T23-53-24Z.md: sha256:4c366ee310d056b8edbc373be29839a3d39ecf1b8ecadd9531d98ad6df6bb281
  docs/_audits/phase-2/sub-phase-lfs-architecture/stage-1a-checkpoint-2026-05-27T11-54-39Z.md: sha256:8d00485d9ba656428b815450d6d1d6100d575e97845242f92104353d2460763f
  docs/_audits/phase-2/sub-phase-lfs-architecture/r2-roundtrip-proof-2026-05-27T12-57-19Z.md: sha256:625f2ab1aadf46384f6001ad3f557dc4ec8d70884c9073ae4cfb799783245f8d
  docs/_audits/phase-2/sub-phase-lfs-architecture/stage-1b-checkpoint-2026-05-27T13-06-08Z.md: sha256:7463ad64f395140e2a17a41eb2fd2b660d67d1f9f25f1c10ef654cbbaff01191
  docs/_audits/phase-2/sub-phase-lfs-architecture/m3-bulk-upload-2026-05-27T17-39-06Z.md: sha256:f1036b91103758db3d6a921c871ec022a462e518ee602ce49fdc59c5f5238c7a
  docs/_audits/phase-2/sub-phase-lfs-architecture/m3-bulk-upload-2026-05-27T17-39-06Z.manifest.json: sha256:1eca03379974fd11c6ba3af4e9ce9b2758b15187ceaf0811fe57886545d9ed15
  docs/_audits/phase-2/sub-phase-lfs-architecture/m4-r2-sweep-proof-2026-05-27T17-47-24Z.md: sha256:5ae21027e8da3e264d834ce5c47bdb36a6c6cdcd072e172edaedf9f59e4f7604
  docs/_audits/phase-2/sub-phase-lfs-architecture/m3-m4-m5-checkpoint-2026-05-27T18-06-21Z.md: sha256:b0d09ffe2dde1c8e0547b1fe26116e8cf277ce3a516344eaa796153fe32e7896
  docs/_audits/phase-2/sub-phase-lfs-architecture/sha-back-fill-2026-05-26T22-55-17Z.md: sha256:8cc1afe7d8159fb9af1ed620dc16045ec889bef327b548e636b01e43f23f5704
deferred_items:
  - "M6 (decommission GitHub LFS → R2-only): deferred indefinitely; future operator decision, out of this sub-phase"
  - "D7 (captures-archive complement: Zenodo/HF DOI snapshots): routed to Phase 5 preprint-extraction"
  - "Shared dependency-graph selective-fetch filter (D6 deferred half): deferred until workflow count grows"
  - "comprehensive-cleanup sub-phase: queued (Phase-2-tail; § 13 of phase-2 landing = 41 banked items)"
ci_activation: []
top_level_deps_to_merge: []
---

# Sub-phase landing audit — sub-phase-lfs-architecture — CONFIRMED

**Verdict: CONFIRMED-sub-phase-landing.** This is the formal close of
`sub-phase-lfs-architecture` per the phase-2 § 2.12 closing-audit mechanism, scoped to a
single sub-phase. The substantive migration work landed at Stage 1c (HEAD `15b8bc3`,
back-filled `6139b59`); Stage 2 synthesizes, verifies, and closes. Every named invariant
(I1–I7) re-verified PASS at HEAD `6139b59`; every D-class decision (D1–D9 + the Stage-0
mutation re-tier rider) carries a clean cumulative disposition consistent with the charter
§ 8 amendments at HEAD; the four substantive corrections that surfaced during execution are
banked with their structural patterns named. No further charter amendment is required to
close cleanly. No tag is pushed by the agent (I7) — the operator pushes
`v0.2.1-sub-phase-lfs-architecture` pointing at this commit (§ 11).

The migration's load-bearing result: **CI's GitHub-LFS bandwidth exhaustion (10 GB / 10 GB
free tier, throttled, at sub-phase open) is dissolved.** Selective LFS fetch dropped the
dominant per-run term ~20×; the two strict workflows opt into R2 (zero egress) per-job; all
26 in-use LFS objects are in R2 (M3) and every LFS pointer at HEAD + every prior phase tag
resolves from R2 alone (M4, 62/62). GitHub LFS is retained as a steady-state fallback (D4
re-characterized).

---

## § 1 — Sub-phase scope + narrative arc

(FACT — charter § 0/§ 1.) `sub-phase-lfs-architecture` is the Phase-2 infrastructure tail:
it designs and proves the tiered-CI + selective-LFS-fetch + external-LFS-backend
architecture for capture/audit-evidence hosting at portfolio scale, from first principles,
preserving every determinism / audit-chain invariant (I1–I7). It is **NOT** a history
rewrite (contrast the prior `sub-phase-git-lfs-migration`); every LFS pointer stub stays
byte-identical — the migration moves *content bytes* to a new backend, never *git objects*.

**Narrative arc (plan-drafting → Stage 0 → 1a → 1b → 1c → 2):**

- **Plan-drafting (CONFIRMED, `01b651e`/`c771d70`/`7215a09`).** Probe + charter + landing.
  The probe forced a **framing SHIFT**: the dispatch brief's "1 GB + 1 GB free, data packs"
  quota premise was stale — GitHub LFS free quota is **10 GiB + 10 GiB metered**, data packs
  removed, $0 budget blocks overage. Current physical storage (4.852 GiB) is *under* the free
  storage quota → the live pressure is **CI bandwidth**, not storage-today; the external
  backend is a forward-looking capacity move for the Phase-4 10-GiB crossing. Two self-caught
  corrections at final verification (probe `cat1.intra-repo` citations → full paths;
  `evidence_hashes` list → mapping).
- **Stage 0 (CONFIRMED-Stage-0, `df4b6cc`).** Catalog vendored to
  `docs/planning/bit-physics-master-catalog.md` (UNKNOWN-1 resolved); all in-flight citations
  re-anchored; D-class routings ratified (D1 = R2 via `lfs-s3`; D2/D5/D6 locked); anchors
  re-checked clean. The mutation-testing re-tier rider was **HELD** (Hard-Rule-2 surface:
  `mutation-testing.yml` was a required-must-run check; re-tiering it without a coupled
  branch-protection de-listing risked breaking the required status check) and routed to a
  separate sibling chain (§ 9).
- **Stage 1a (CONFIRMED-Stage-1a-RED, `8971432`).** Invariant-verification test surface
  `tools/testkit/lfs_migration/` committed RED-first (13 passed / 3 xfailed; the three RED
  tests are the Stage-1b PASS targets). UNKNOWN-2 (live billing dashboard) + UNKNOWN-4 (R2
  secrets) resolved and folded into charter § 11. One self-caught correction (`eb4b5f3`:
  scope the I6 lock to the commit subject line).
- **Stage 1b (CONFIRMED-Stage-1b-GREEN, `9096eaf`).** M1 (per-job `lfs-s3` config via
  `tools/lfs/setup-lfs-s3.sh` — the **mechanism substitution**, no committed root
  `.lfsconfig`) + M2 (live R2 round-trip proof, run 26512325545) + selective fetch (both
  strict workflows `lfs: false`). RED surface fully GREEN (16/0). One mid-flight fix-forward
  (`0c8aeb1`: the probe's "cpp-strict needs zero captures" was falsified by live CI — the
  RD-2D-Stack-C gate-14 ctest reads a committed reference capture).
- **Stage 1c (CONFIRMED-with-M5-re-characterization, `15b8bc3`).** M3 (26/26 objects → R2,
  operator-run, full round-trip sha256) + M4 (62/62 pointers resolve from R2 across HEAD +
  phase tags, CI run 26528423418). M5's planned committed-`.lfsconfig` cutover was found
  **mechanically unreachable** (git-lfs ignores `lfs.standalonetransferagent` from an in-repo
  `.lfsconfig` — a security feature) and **re-characterized** (Hard-Rule-2, operator-ratified):
  per-job trusted-config opt-in is the steady-state end state; D4 GitHub-LFS fallback is
  steady-state, not transitional; M6 deferred indefinitely.
- **Stage 2 (this audit, CONFIRMED-sub-phase-landing).** Closing audit + cumulative registry
  + back-fill.

---

## § 2 — Cumulative SHA ledger (the sub-phase chain, in order)

Every commit on the sub-phase's own chain (`v0.2.0-phase-2..HEAD`), in order, with verdict at
landing. Five peer-chain commits (mutation re-tier ×4, golden-path fix ×1) are **excluded**
here and recorded separately in § 9. Sub-phase commits: **34** (39 in-range − 5 peer).

### Plan-drafting (6 commits) — verdict: plan-drafting-CONFIRMED

| # | SHA | Title |
|---|---|---|
| 1 | `d17a479` | docs(lfs-architecture-plan-drafting): plan-drafting probe report |
| 2 | `1a96fbd` | docs(lfs-architecture-plan-drafting): sub-phase charter |
| 3 | `01b651e` | docs(lfs-architecture-plan-drafting): plan-drafting landing audit — CONFIRMED |
| 4 | `7ccdeaf` | chore(…plan-drafting-sha-backfill): back-fill head_sha per Convention #12 |
| 5 | `c771d70` | docs(lfs-architecture-plan-drafting): fix probe intra-repo citations to full paths |
| 6 | `7215a09` | docs(lfs-architecture-plan-drafting): fix landing audit evidence_hashes (mapping) + re-anchor head_sha |

### Stage 0 (5 commits) — verdict: CONFIRMED-Stage-0

| # | SHA | Title |
|---|---|---|
| 1 | `0ae3c57` | docs: vendor bit-physics-master-catalog.md to docs/planning/ |
| 2 | `d2df754` | docs: re-anchor sub-phase-lfs-architecture citations to vendored catalog (Convention M) |
| 3 | `ee9aabb` | docs(lfs-architecture-stage-0): charter amendment — D-class ratification + mutation re-tier HELD |
| 4 | `df4b6cc` | docs(lfs-architecture-stage-0): Stage 0 checkpoint — CONFIRMED-Stage-0 |
| 5 | `9610fc3` | chore(…stage-0-sha-backfill): SHA back-fill for Stage 0 chain (Convention #12) |

### Stage 1a (5 commits) — verdict: CONFIRMED-Stage-1a-RED

| # | SHA | Title |
|---|---|---|
| 1 | `f00bb42` | test(…stage-1a): scaffold lfs_migration RED tests for invariants I1–I7 + cost-axis + R2-config |
| 2 | `5eef156` | docs(…stage-1a): lfs_migration test surface README + RED→GREEN contract |
| 3 | `8971432` | docs(…stage-1a): Stage 1a checkpoint (RED tests scaffolded) + § 11 dashboard anchor |
| 4 | `b4e454a` | chore(…stage-1a-sha-backfill): SHA back-fill for Stage 1a chain (Convention #12) |
| 5 | `eb4b5f3` | fix(…stage-1a): scope i6 Convention-#12 detection to commit subject (self-caught) |

### Stage 1b (10 commits) — verdict: CONFIRMED-Stage-1b-GREEN

| # | SHA | Title |
|---|---|---|
| 1 | `3ef6690` | ci(lfs): lfs-s3 per-job R2 transfer-agent scaffold + charter M1 amendment (D1) |
| 2 | `848f24b` | ci(lfs): add R2 round-trip M2 proof workflow (workflow_dispatch) |
| 3 | `bf968fe` | ci(lfs): add path-filtered push trigger to M2 proof (force registration) |
| 4 | `9816a57` | ci(lfs): fix M2 proof local-branch ref (git init -b main) |
| 5 | `3e46be0` | docs(…stage-1b): R2 round-trip M2 proof — CONFIRMED |
| 6 | `5b92b86` | ci(lfs): selective LFS fetch on python-strict + cpp-strict (charter § 4.2 / D6) |
| 7 | `d361fff` | test(lfs_migration): RED→GREEN — remove xfail markers; reconcile R2-config to per-job design |
| 8 | `9096eaf` | docs(…stage-1b): Stage 1b checkpoint — CONFIRMED-Stage-1b-GREEN |
| 9 | `07610f7` | chore(…stage-1b-sha-backfill): SHA back-fill for Stage 1b chain (Convention #12) |
| 10 | `0c8aeb1` | ci(lfs): fix cpp-strict capture dependency (probe finding correction; post-checkpoint fix-forward) |

### Stage 1c (8 commits) — verdict: CONFIRMED-with-M5-re-characterization

| # | SHA | Title |
|---|---|---|
| 1 | `e5a01e2` | feat(lfs): bulk-upload script + idempotent M3 scaffold |
| 2 | `d557235` | docs(lfs-architecture-m3): M3 bulk upload to R2 — CONFIRMED |
| 3 | `0ecb76a` | ci(lfs): M4 R2 sweep proof workflow |
| 4 | `9737301` | docs(lfs-architecture-m4): M4 R2 sweep proof — CONFIRMED |
| 5 | `b81c407` | test(lfs_migration): register r2-sweep-proof.yml in cost-axis registry |
| 6 | `4a35007` | docs(lfs-architecture-m5): re-characterize M5 — committed-.lfsconfig cutover is unreachable |
| 7 | `15b8bc3` | docs(…stage-1c): M3/M4/M5 checkpoint — CONFIRMED-with-M5-re-characterization |
| 8 | `6139b59` | chore(…stage-1c-sha-backfill): SHA back-fill for M3/M4/M5 chain (Convention #12) |

### Stage 2 (this chain) — verdict: CONFIRMED-sub-phase-landing

| # | SHA | Title |
|---|---|---|
| 1 | `8f4dea3` | docs(lfs-architecture-stage-2): sub-phase landing audit — CONFIRMED (this file; dispatch title "audit: …") |
| 2 | `5bc2baf` | docs(changelog): sub-phase-lfs-architecture landed (R2 migration; per-job opt-in model) |
| 3 | (this commit) | chore(lfs-architecture-stage-2-sha-backfill): SHA back-fill for Stage 2 chain (Convention #12) — recursion-stopper, reported in coordinator summary |

The Stage-2 SHAs are back-filled in commit 3 per Convention #12 (this landing audit's own
`head_sha` front-matter is set to `6139b59` — the Stage-1c close, where all 12 evidence files
resolve — so no `head_sha` placeholder is needed; only the body's self-referential commit-SHA
tokens here and in § 11 are back-filled in commit 3. This file is a `sub-phase-landing-*.md`,
not a `*.ledger.md`, so the `audit-append-only.yml` gate permits the corrective edit; spec
`docs/architecture.md:1448`).

---

## § 3 — Cumulative invariant verdicts (I1–I7) — verified at HEAD `6139b59`

| Invariant | Verification command (run at HEAD) | Status at sub-phase close |
|---|---|---|
| **I1** — LFS content-OID semantics | `git diff v0.2.0-phase-2 HEAD -- captures/** tests/fixtures/legacy-captures/** .gitattributes` = empty; testkit `test_i1_content_oid` (verify_evidence + per-pointer OID round-trip) | **PASS** — every pointer stub byte-identical across the whole sub-phase; migration moved content bytes only |
| **I2** — Bit-identity replay | `replay_prior_phase --prior-phase phase-1 --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`; sha256 of replay stdout | **MATCH** — `ok=True`, 8/8 gates PASS, digest `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (canonical, conventions § D.3) |
| **I3** — Integrity baseline | `python -m integrity --all --mode strict` | **0 HARD_FAIL / 14 SOFT_WARN**; full-report digest `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` reproduced byte-for-byte (baseline HELD — the LFS audits added no new SOFT_WARN lines) |
| **I4** — Append-only audits | `git diff --name-status v0.2.0-phase-2 HEAD -- docs/_audits/` + `.github/workflows/audit-append-only.yml`; testkit `test_i4_append_only_lock` | **PASS** — 10 A / 0 M / 0 D (pure-additive); no prior `*.ledger.md` edited; workflow present + configured |
| **I5** — Worktree replay at prior tags | M4 R2 sweep (run 26528423418): every LFS pointer at `v0.0.0-phase-0` / `v0.1.0-phase-1` / `v0.2.0-phase-2` resolves from R2; testkit `test_i5_worktree_replay` | **PASS** — 62/62 pointer instances resolve from R2 (phase-0/1 = 0 pointers, pre-LFS; phase-2 = 31; HEAD = 31) |
| **I6** — Convention #12 (SHA back-fill) | `git log --oneline v0.2.0-phase-2..HEAD` subject-line scan; testkit `test_i6_convention_12` | **PASS** — 6 distinct separate back-fill commits (plan-drafting / Stage 0 / Stage 1a / Stage 1b / Stage 1c + the mutation-sibling); no `--amend` of a published commit |
| **I7** — No agent-pushed tags | `git tag --contains v0.2.0-phase-2`; `git for-each-ref` tagger check | **PASS** — only `v0.2.0-phase-2` points into the range (the pre-existing anchor, not into the sub-phase); all phase tags authored by the operator (Steven Cohen); the agent pushed no tag |

**Every invariant PASSES.** No Hard-Rule-2 STOP fired at § P2.

---

## § 4 — Cumulative D-class dispositions — consistent with charter § 8 at HEAD

| D | Question | Final disposition | Citation |
|---|---|---|---|
| **D1** | Backend choice | **CONFIRMED:** R2 via `lfs-s3` v0.2.2 — operationally proven by M2 (round-trip) + M3 (26/26 bulk) + M4 (62/62 sweep) | charter § 0 Stage-0 amendment, § 8 D1; M2/M3/M4 audits |
| **D2** | Tier count | **CONFIRMED:** 5-tier vocabulary, T1/T2 active, T3–T5 staged | charter § 0 Stage-0 amendment, § 4.3, § 8 D2 |
| **D3** | Migration strategy | **CONFIRMED:** phased — selective fetch + per-job R2 transfer agent; canonical cutover operator-routed | charter § 8 D3; Stage 1b/1c |
| **D4** | Redundancy | **RE-CHARACTERIZED:** GitHub-LFS fallback is **steady-state** (not transitional); per-job R2 opt-in is the end state; M6 deferred indefinitely | charter Stage-1c/M5 amendment (`:117`), § 8 D4; Stage 1c § 3 |
| **D5** | Outage behavior | **CONFIRMED:** T1/T2 SOFT_WARN, T3+ HARD_FAIL | charter § 0 Stage-0 amendment, § 8 D5 |
| **D6** | Path-filter granularity | **CONFIRMED:** per-workflow selective-fetch active; shared dependency-graph filter deferred | charter § 0 Stage-0 amendment, § 8 D6; Stage 1b § 4 |
| **D7** | Archive complement | **DEFERRED:** routed to Phase 5 preprint-extraction (HF Datasets sha256-native; Zenodo DOI) | charter § 8 D7, § 1.3, § 12.3 |
| **D8** | Pre-commit ceiling | **CONFIRMED:** 2 GiB, no change (git-hygiene knob; raise per-need at Phase 4) | charter § 8 D8 |
| **D9** | Phase-4 readiness | **CONFIRMED:** content-addressing is schema-agnostic; corpus round-trip + bulk sha256 sweep confirm it absorbs schema 1.1.0 | charter § 8 D9; Stage 1c M4 evidence |
| (Stage-0 rider) | mutation-testing.yml re-tier | **LANDED** via the separate sibling chain (`cd21148`…`5a5e18b`); the coupled live branch-protection update remains a pending operator action — a **no-op in practice** (no live branch-protection rules are configured on the repo, per Stage-0 § 7 routing) | sha-back-fill ledger "Mutation re-tier sibling chain"; § 9 |

**The D4 re-characterization is the architecturally substantive one.** It is *not* a softening
of D4 — it is the correct reading of what D4 always meant once the M5 discovery landed. D4 was
originally framed with an implicit end at M5 (the committed-`.lfsconfig` cutover that would have
forced R2 universally). The M5 probe (§ 5, lesson 4) proved that cutover **mechanically
unreachable** by a git-lfs security feature. The consequence is not "we failed to remove the
fallback" but "the fallback was always the correct steady state": a fresh clone without R2
credentials resolves LFS via GitHub LFS exactly as before; CI opts into R2 precisely where
bandwidth matters. D4 is therefore a **steady-state architectural choice**, and M6
(GitHub-LFS-off → R2-only) is the only path that would force R2 universally — it stays deferred
indefinitely as a future operator decision, explicitly out of this sub-phase. No D-class
disposition contradicts the charter § 8 amendments at HEAD; no Hard-Rule-2 STOP fired at § P3.

---

## § 5 — Four substantive corrections — banked lessons

The sub-phase surfaced four design corrections that plan-drafting could not have caught without
running against real systems. The probe-before-commit discipline caught all four: without it,
three would have shipped as silent bugs and the fourth would have shipped as a lying spec. Each
is banked below with its **structural pattern** named — the patterns future sub-phase planning
should incorporate.

1. **Stage 1b open — per-job vs committed config (`3ef6690`).**
   `lfs-s3`'s `lfs.standalonetransferagent` mechanism is structurally a **replace, not an add**:
   it routes *all* git-LFS transfers through the agent. A committed root `.lfsconfig` carrying
   that switch (as charter § 5.2 / § 6 M1 originally prescribed) would impose the agent on local
   dev + all 8 non-LFS workflows, breaking object resolution wherever `lfs-s3`/credentials are
   absent — i.e. it is structurally the M5 cutover, not the additive M1. Fix: per-job CI git
   config via `tools/lfs/setup-lfs-s3.sh`, realizing the charter's M1 intent through a different
   mechanism.
   **Structural pattern: mechanism substitution preserving intent.** When a mechanism's blast
   radius is wider than the plan assumed, substitute a narrower mechanism that preserves the
   requirement, and amend the spec to record the substitution.

2. **Stage 1b mid-flight — cpp-strict committed captures (`0c8aeb1`).**
   The probe's "cpp-strict needs zero captures" claim was falsified by live CI: the
   RD-2D-Stack-C ctests (`rd2d_stack_c_tests`, `rd2d_stack_c_gate14`) read the committed
   `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5`, so `lfs: false`
   with no pull broke them (`HighFive` "Not an HDF5 file" → SIGABRT on the pointer stub). Fix:
   `lfs: false` + targeted `git lfs pull --include="captures/reaction-diffusion-2d-ref/**"`
   (still ≫ smaller than a full fetch); charter § 4.2 corrected.
   **Structural pattern: live-CI falsification of a probe claim.** A static probe of "which
   workflow needs which bytes" can miss a transitive test-data dependency; the live CI run is the
   ground truth. Fix-forward + amend the probe-derived claim, do not hide the miss.

3. **M3 probe — 27 vs 26 object scope (`e5a01e2` / charter Stage-1c/M3 amendment).**
   `git lfs push --all --dry-run` enumerated **27** objects; the union of HEAD + the three phase
   tags is **26**. The 27th is the empty-file degenerate OID
   `e3b0c442…852b855` from commit `11d2b93`'s brief `.gitattributes`-glob mismatch — referenced
   by no inspected ref and absent from the local cache. `--all` would attempt it (risking a
   missing-local-object push abort) and create a 27≠26 count drift against M4's sweep surface.
   Fix: `git lfs push --object-id` over the deterministic HEAD + phase-tags ref-union (26 OIDs).
   **Structural pattern: refine scope to match the verification surface.** When the migration
   surface and the verification surface must be symmetric (none uploaded-but-unswept, none
   swept-but-unuploaded), compute both from the same deterministic ref set.

4. **M5 probe — committed `.lfsconfig` falsification (`4a35007`).**
   git-lfs's security model (unsafe-keys protection) silently ignores
   `lfs.standalonetransferagent` + `lfs.customtransfer.*.path` when read from an in-repo
   `.lfsconfig` (these keys can execute arbitrary binaries on clone, so they are honored only
   from the user's trusted `.git/config`). Empirically falsified on git-lfs 3.4.1 (local) +
   3.7.1 (CI): a `.lfsconfig` carrying the switch yields transfers `basic,lfs-standalone-file,ssh`
   (lfs-s3 absent) + the warning `These unsafe '.lfsconfig' keys were ignored:`. M5
   re-characterized: per-job trusted-config opt-in is the end state; GitHub-LFS fallback is
   steady-state (D4).
   **Structural pattern: security-model falsification of intent itself.** Not a mechanism the
   plan got wrong, but an *intent* a correct security design prevents. When the platform's
   security model blocks the planned end state, the right move is to recognize the blocked path
   was never load-bearing and re-characterize the architecture around what the security model
   permits — the protection is the correct design, not a workaround target.

A reverted local commit (`1c93cd4`, an inert root `.lfsconfig` asserting "default fetch routes
to R2") was made before the unsafe-keys constraint was understood; it was reset (`git reset
--mixed`) **before any push** and never reached `origin`. The published chain contains no
`.lfsconfig`. Recorded for honesty (sha-back-fill ledger, Stage-1c section).

---

## § 6 — Cumulative cost-axis

**Pre-migration (sub-phase open; FACT — charter § 11 dashboard amendment, period 2026-05-01..26):**

- GitHub LFS storage: 4.852 GiB physical at HEAD / ~0.61 GB period-average (380.77 GB-hr
  integral) — under the 10 GiB free quota.
- GitHub LFS bandwidth: **10 GB / 10 GB free tier — 100% consumed, throttled** (the
  load-bearing constraint driving the sub-phase).
- $0 billed (capped at free tier; $0 budget blocks overage).

**Post-migration (sub-phase close; FACT — operator-provided R2 dashboard, post-settle):**

- **R2 storage: 1.58 GB peak / 395.12 MB average** (24-hr window post-M3) — **15.8 % of the
  10 GiB free tier**. (zstd compression of the 4.852 GiB / `5209764464`-byte raw transfer; the
  captures are zero-heavy HDF5 volumes — `~3.3×` compression — reconciles with the M3 manifest:
  same 26 objects, compressed < raw.)
- R2 Class A ops cumulative: **410** / 1 M monthly free (0.04 %).
- R2 Class B ops cumulative: **1.03k** / 10 M monthly free (0.01 %).
- R2 Data Retrieved: **0 B** — M4 verification ran from the CI runner, not via dashboard-tracked
  retrieval; "0 B" reflects no end-user-billable egress (egress is free on R2 regardless — the
  architectural feature this migration was structured around).
- GitHub LFS: remains addressable as the D4 steady-state fallback; no further CI bandwidth
  consumption after the ~2026-05-31 reset (the strict workflows fetch from R2).
- **$0 billed across both backends.**

**Reconciliation (FACT).** The R2 figures reconcile with the M3 manifest
(`m3-bulk-upload-…manifest.json`): 26 objects both; `total_bytes 5209764464` raw → 1.58 GB
stored (compressed). The earlier M3+30-min readouts (5.93 kB → 8.3 KB → 11.42 MB) were partial
commits before multipart uploads settled (§ 7). No § P5 STOP: the operator figures reconcile
with manifest ground truth.

**Forward projection (INFERENCE — charter § 11).** At Phase 4 (27 frontier variants,
+0.7…+10.5 GiB), R2 storage projects to remain under the free tier with substantial headroom;
Class A/B op headroom is generous (even an order-of-magnitude CI-cadence increase stays far from
limits). The Phase-4 10-GiB crossing is the concrete future trigger for any M6 decision — not
forced by this sub-phase.

---

## § 7 — M3 multipart-commit-lag — banked observation

(FACT — operator-observed; banked as process knowledge, **NOT** propagated as a charter
amendment.) During M3 the R2 dashboard bucket-total readout went
**5.93 kB → 8.3 KB → 11.42 MB → 395.12 MB → 1.58 GB** over the course of M3 + ~hours. Each
readout was internally consistent at the time it was read; the divergence was R2's
multipart-upload commit **settling**, not script error. The Stage-1c checkpoint § 5 and the M3
audit § 3 recorded the partial **11.42 MB** readout (correctly flagging the raw→stored ratio as
either genuine zstd or a dashboard-accounting lag); M4 then resolved it cryptographically (62/62
sha256 round-trips from an empty temp store, including the three 1.05 GiB MPM volumes and the
738 MB Taylor-Green), and the post-settle figure is 1.58 GB.

**Banked discipline for future migrations:** trust the cryptographic round-trip verification
(M3 confirmed all 26 objects present + intact immediately) and the per-object listing (the
Objects page showed correct per-object sizes throughout); be patient with the bucket-total /
Metrics-page readouts (they lag ~30 min to several hours during large multipart uploads). This
is a real R2 behavior, not a measurement bug — and it is exactly why M3/M4's verification rests
on per-object sha256 round-trips, not on the dashboard total.

---

## § 8 — Verification sweeps confirming PASS state at HEAD

All run at HEAD `6139b59`:

- **verify_evidence — full sub-phase chain (no regression).** Every prior audit STILL PASSES:
  plan-drafting-landing 4/0; stage-0-checkpoint 8/0; stage-1a-checkpoint 6/0; r2-roundtrip-proof
  4/0; stage-1b-checkpoint 12/0; m3-bulk-upload 4/0; m4-r2-sweep-proof 4/0; m3-m4-m5-checkpoint
  (Stage 1c) 10/0; sha-back-fill 3/0. **Total: 9 audits, all PASS, 0 fail.**
- **Integrity baseline (I3).** `integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**;
  full-report digest `c19492add530…d22cb52` reproduced byte-for-byte (baseline HELD).
- **Bit-identity replay (I2).** `replay_prior_phase --prior-phase phase-1` (8 gates) → `ok=True`,
  8/8 PASS; stdout digest `9399fc33…718909f34` (canonical MATCH).
- **Testkit lock surface.** `pytest tools/testkit/lfs_migration/` → **16 passed** (I1–I7 +
  cost-axis registry + per-job R2-config).
- **Prior-tag worktree replay via R2 (I5).** M4 sweep 62/62 from R2 (recorded; not re-run at
  Stage 2 — it is a credentialed CI workflow, and its evidence audit verify_evidence PASSES).
- **I1 pointer-byte identity.** `git diff v0.2.0-phase-2 HEAD` over all LFS paths + `.gitattributes`
  = empty.
- **I4 append-only.** 10 A / 0 M / 0 D over `docs/_audits/` in range; no `*.ledger.md` edited.

No sweep regressed. No Hard-Rule-2 STOP fired.

---

## § 9 — Relationship to peer chains (cited, NOT in the cumulative ledger)

Two peer chains interleave with the sub-phase's commit range but are **separate work with
separate provenance**; their SHAs are cited here for completeness but are **not** part of § 2's
cumulative ledger (per the closing-audit scoping).

- **Mutation-testing re-tier sibling chain (`cd21148` → `8a3d998` → `e97b23b` → `5a5e18b`).**
  Resolves the Stage-0 mutation-testing re-tier HOLD (catalog § 41.4 places mutation/fuzz at T4
  weekly). The chain de-listed `mutation-testing.yml` from required-must-run
  (`docs/ops/branch-protection.md`), amended `docs/architecture.md` § 2.13 to weekly-T4 CI
  policy, and re-tiered the workflow (weekly cron + dispatch + path-filtered push). Audit trail
  kept coupled to the LFS sub-phase's `sha-back-fill` ledger (option a) because the re-tier was
  surfaced by the LFS plan-drafting agent and held at Stage 0. **LANDED;** the coupled live
  branch-protection update is a pending operator action that is a no-op in practice (no live
  branch-protection rules exist on the repo). A separate `§ 2.13 golden-path drift` was left for
  operator-routed correction and was later fixed by the operator at `51e0ee1` (below).

- **Operator golden-path fix (`51e0ee1`).** `docs(spec): correct § 2.13 golden module path`
  (`tools/testkit/golden/`). Pushed as part of the operator-authorized backlog push during Stage
  1b; not authored by this sub-phase.

Neither chain altered any LFS pointer stub or any sub-phase invariant.

---

## § 10 — Forward routing

- **M6 (decommission GitHub LFS → R2-only): deferred indefinitely.** A future operator decision,
  triggered (if ever) by the Phase-4 storage-approaching-10-GiB crossing; explicitly out of this
  sub-phase. D4 GitHub-LFS fallback remains steady-state until then.
- **Phase-4 readiness CONFIRMED (D9).** Content-addressing is schema-agnostic; the corpus
  round-trip + bulk sha256 sweep prove the architecture absorbs schema 1.1.0
  (`gradient_fields`/`active_mask`) without re-architecting.
- **comprehensive-cleanup sub-phase: queued.** The Phase-2 landing § 13 consolidated 41 banked
  cleanup items; this sub-phase adds no blocker. Routable now that the LFS architecture has
  landed.
- **D7 (captures-archive complement): routed to Phase 5** preprint-extraction.
- **Phase 3 dispatch path:** the next spec-phase pre-flight replays against `v0.1.0-phase-1`
  (conventions § D.4 — sub-phases do not join the replay chain), so this sub-phase's tag does not
  enter the cross-phase replay resolver.

---

## § 11 — Operator action

Per spec § 7.12 + I7, the agent pushes **no** tag. After this Stage-2 chain (3 commits) is
pushed to `origin/main`, the operator pushes the optional non-phase point-release tag:

```
Proposed tag: v0.2.1-sub-phase-lfs-architecture   (no -phase-N suffix; conventions § D.2)
Tag commit SHA: 8f4dea3069fbd8f2a1adef0ab75147123dc3f144   (the SHA of THIS landing-audit commit, Stage-2 commit 1)
Tag pushed: NO (operator action required)
```

```
git tag -s v0.2.1-sub-phase-lfs-architecture 8f4dea3069fbd8f2a1adef0ab75147123dc3f144
git push origin v0.2.1-sub-phase-lfs-architecture
```

(Note — conventions § D.2: the per-sub-phase lean is **NO intermediate tag**; an optional
non-phase point-release is a banked operator decision. The operator has routed a tag for this
sub-phase. The tag carries no `-phase-N` segment, so I7 / spec § 7.12 are satisfied — it is a
point-release handle, not a phase boundary.)

## Conventions honored

Convention #8 (every claim grep-/command-/evidence-verified; operator R2 figures reconciled
against the M3 manifest, not taken on dashboard convenience; the multipart-lag is banked as
process knowledge, not papered over); Convention M (re-anchored against live HEAD `6139b59`
before writing); Convention A (this landing audit is a net-new file; the back-fill commit lands
after it); Convention #12 (SHA back-fill is the separate commit 3, never `--amend`); cat-1
intra-repo full-path citations; `evidence_paths` a list / `evidence_hashes` a YAML mapping (the
verify_evidence contract); four-state verdicts; FACT/INFERENCE tagging; no tag pushed by the
agent (I7).
