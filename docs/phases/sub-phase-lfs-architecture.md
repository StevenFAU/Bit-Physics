---
date: 2026-05-26
author: lfs-architecture-plan-drafting-agent
sub_phase: sub-phase-lfs-architecture
phase: phase-2-tail
head_sha_at_draft: fd21445614d2f87549a4c660da91c988c4c6b1eb
version: charter-v1 (plan-drafting)
posture: >
  Focused-infrastructure sub-phase. Designs the tiered-CI + selective-LFS-fetch +
  external-LFS-backend architecture for capture/audit-evidence hosting at portfolio
  scale, from first principles, preserving every determinism / audit-chain invariant
  (I1-I7). DRAFT ONLY — Stages 0/1a/1b/1c/2 execute. NOT a history rewrite. No backend
  cutover, no GitHub-LFS-off flip, and no tag are performed without operator routing.
---

# Sub-phase: LFS architecture (tiered CI + external backend) — CHARTER

> **This is a plan, not an execution.** This document specifies what subsequent sessions
> build. Plan-drafting CONFIRMED means *the plan is ready for Stage 0 dispatch* — it does
> **not** mean the migration is complete. Every concrete claim is tagged FACT / INFERENCE.
> Repo-HEAD facts cite full repo-relative `path:line`. External facts cite URL + access
> date (full verbatim in the probe report). The master catalog was a local planning artifact at
> plan-drafting (probe Finding D0); **vendored into the repo at Stage 0** (commit `0ae3c57`,
> `docs/planning/bit-physics-master-catalog.md`). Its sections are tagged `[CATALOG]` and cite the
> vendored file; it remains a planning artifact, not a normative spec.

> **AMENDMENT — Stage 0 (2026-05-26).** Operator D-class routings ratified; one rider held.
> Prior text below is preserved; this block governs where it overlaps.
>
> - **D-class LOCKED (operator):** D1 = **R2 via `lfs-s3`**; D2 = **5-tier vocabulary, T1/T2
>   active, T3–T5 staged**; D5 = **T1/T2 SOFT_WARN, T3+ HARD_FAIL**; D6 = **per-workflow
>   selective-fetch now, shared dependency-graph filter deferred**. D3/D4/D7/D8/D9 plan-drafting
>   leans **accepted** (no inversion surfaced at Stage-0 re-anchor). § 8 lean text stands.
> - **UNKNOWN status:** UNKNOWN-1 (catalog provenance) **RESOLVED** (vendored, commit `0ae3c57`);
>   UNKNOWN-3 (D1 routing) **RESOLVED** (R2). UNKNOWN-2 (live LFS billing dashboard) **still open**
>   (carry to Stage 1a). UNKNOWN-4 (R2 bucket + scoped token) **operator-pending** — § 6 M0 stays
>   pending; Stage 1a/1b do not block on credentials.
> - **mutation-testing re-tier rider HELD (Hard-Rule-2 surface, NOT executed).** Re-tiering
>   `.github/workflows/mutation-testing.yml` to weekly per `docs/planning/bit-physics-master-catalog.md:3489`
>   § 41.4 is correct in principle, BUT the workflow is enumerated under "Required workflows that
>   must run on `main`" at `docs/ops/branch-protection.md:49-65`. Moving it to conditional/scheduled
>   triggers could break it as a required status check (a required check that does not run on a
>   given push blocks that push/merge). Per the Stage-0 dispatch P7 STOP rule, the workflow is
>   **not changed**; the re-tier is routed to the operator coupled with a `branch-protection.md`
>   de-listing (+ live branch-protection update). See Stage-0 checkpoint § 7.

> **AMENDMENT — Stage 1a (2026-05-27).** RED test surface scaffolded; UNKNOWN-2 resolved.
> Prior text below is preserved; this block and the § 11 amendment note govern where they overlap.
>
> - **UNKNOWN-2 (live LFS billing) RESOLVED** (operator dashboard, period 2026-05-01..26): bandwidth
>   **10 GB / 10 GB** free tier (100% consumed; **throttled**); storage **380.77 GB-hr** usage
>   integral (period-average ~0.61 GB; well under the 10 GB quota); **$0 billed** (capped at free
>   tier). Source: `github.com/settings/billing` metered-usage view. Folded into § 11.
> - **§ 11 reframe (dashboard-anchored):** the live data confirms **bandwidth is the load-bearing
>   constraint** (100% of free tier, throttled), not storage (comfortable). R2 dissolves the
>   bandwidth axis (zero egress); storage is a secondary slow-burn axis where R2 buys headroom to
>   the Phase-4 10 GiB crossing.
> - **UNKNOWN-4 (R2 secrets):** operator confirms the four repo secrets exist (`R2_ACCESS_KEY_ID`,
>   `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME` = `bit-physics-lfs`). Stage 1a does
>   **not** read their values; Stage 1b consumes them. § 6 M0 secret-injection is satisfied.
> - **Stage 1a deliverable:** invariant test surface `tools/testkit/lfs_migration/` (I1–I7 +
>   cost-axis + R2-config), committed RED-first. The mutation-testing re-tier rider remains **HELD**
>   (routed separately per Stage-0 § 7; out of this dispatch's scope).

> **AMENDMENT — Stage 1b (2026-05-27): per-job R2 transfer-agent config (mechanism substitution).**
> Operator-ratified. Prior text below is preserved; this block governs § 5.2 / § 6 M1 / § 6 M5
> where they overlap.
>
> - **Mechanism, not intent, changed.** `lfs-s3` activates **only** via
>   `lfs.standalonetransferagent lfs-s3`, which routes *all* git-LFS transfers through it and
>   bypasses GitHub LFS. A **committed root `.lfsconfig`** carrying that switch (as § 5.2 / § 6 M1
>   originally prescribed) would impose the agent on **local dev + all 8 non-LFS workflows**,
>   breaking object resolution wherever `lfs-s3`/credentials are absent — i.e. it is structurally
>   the **M5 cutover, not the additive M1**.
> - **Ratified approach (per-job CI git config):** the workflows that need R2 install `lfs-s3` and
>   run `git config --local lfs.standalonetransferagent lfs-s3` (+ `lfs.customtransfer.lfs-s3.path`)
>   **as a CI step, for that checkout only**, via the shared helper `tools/lfs/setup-lfs-s3.sh`
>   (credentials + endpoint from env, never committed). **No committed root `.lfsconfig` at M1.**
>   This realizes the charter's M1 intent — *additive; both paths resolvable through transition;
>   D4 GitHub-LFS fallback (a workflow without R2 config resolves via GitHub LFS exactly as today)*
>   — through a different mechanism than § 5.2 / § 6 M1 assumed.
> - **§ 6 M1 amended:** "install `lfs-s3`; per-job CI git config (no committed root `.lfsconfig`)";
>   the committed-root-`.lfsconfig` standalone-agent switch is **deferred to the M5 cutover**
>   (operator-gated, after R2 is proven stable across all consumers). § 6 M5 absorbs it.
> - **D4 unchanged** (R2 primary + GitHub LFS fallback through transition); the per-job mechanism
>   *is* how D4 is implemented. M2 (round-trip proof) and the Hard-Rule-2 STOPs (M2-fail, I1
>   pointer-byte preservation) stand.

> **AMENDMENT — Stage 1c / M3 (2026-05-27): M3 mechanism refined to `git lfs push --object-id`
> over the exact ref-union.** Operator-ratified (Convention M — the live ref-walk wins over the
> planning spec's literal command). Prior text below is preserved; this block governs § 6 M3 where
> they overlap.
>
> - **§ 6 M3 migrates from the literal `git lfs push --all` to
>   `git lfs push --object-id <union-OID-list> --stdin`**, where the OID list is the union of LFS
>   objects referenced by **`HEAD` + each prior phase tag** (`v0.0.0-phase-0`, `v0.1.0-phase-1`,
>   `v0.2.0-phase-2`) at M3 time. *Intent unchanged* ("upload every object in use"); the mechanism
>   is made precise.
> - **Why (FACT — probe at HEAD `0c8aeb1`):** `git lfs push --all --dry-run origin` enumerates **27**
>   objects; the union of `HEAD` + the three phase tags is **26** (`v0.0.0-phase-0` /
>   `v0.1.0-phase-1` carry **zero** LFS objects — pre-LFS history). The 27th is the empty-file OID
>   `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, a referenced-by-nothing
>   degenerate from commit `11d2b93`'s brief `.gitattributes`-glob mismatch; it is **not in the
>   local LFS cache** and is referenced by **no inspected ref**. `--all` would attempt it (risking a
>   missing-local-object push abort) and create a 27≠26 count drift against the inventory.
> - **M3's upload surface == M4's sweep surface (26 OIDs).** M4 (`r2-sweep-proof.yml`) walks the same
>   `HEAD` + phase-tags union via `git lfs ls-files`; scoping M3 identically keeps the migration's
>   verification surface symmetric (no object uploaded-but-unswept, none swept-but-unuploaded).
> - **Reproducibility:** the exact 26-OID list is computed deterministically by
>   `tools/lfs/r2-bulk-upload.sh` from the union refs and captured in the M3 audit
>   (`docs/_audits/phase-2/sub-phase-lfs-architecture/m3-bulk-upload-<UTC>.md`) verbatim.
> - **Verification (§ 7 A5 / bulk sweep):** after upload, every object is re-fetched **from R2** into
>   a temporary `lfs.storage` dir and `sha256`-checked against its OID — all 26, not a sample (the
>   git-lfs 3.7.1 ↔ lfs-s3 0.2.2 transfer path is exercised at bulk scale; full verification makes
>   any silent corruption a loud failure). The canonical `.git/lfs/objects` is never touched.

> **AMENDMENT — Stage 1c / M5 (2026-05-27): the committed-`.lfsconfig` cutover is
> mechanically unreachable; per-job trusted-config is the steady-state end state.**
> Operator-ratified (Hard-Rule-2 re-characterization). Prior text below is preserved;
> this block governs § 6 M5 / § 6 M6 / D4 and the Stage-1b amendment's M5 absorption
> where they overlap.
>
> - **(1) Constraint discovered (FACT — empirical).** git-lfs **ignores**
>   `lfs.standalonetransferagent` and `lfs.customtransfer.*.path` when they are read
>   from an in-repo `.lfsconfig` (these keys can execute arbitrary binaries on clone,
>   so they are honored **only** from the user's trusted `.git/config`). Verified at
>   HEAD on git-lfs `3.4.1` (local) and `3.7.1` (CI runner): a `.lfsconfig` carrying
>   the switch yields `git lfs env` transfers `basic,lfs-standalone-file,ssh` (lfs-s3
>   **absent**) + the warning `These unsafe '.lfsconfig' keys were ignored:`; the same
>   keys in `.git/config` yield `basic,lfs-s3,lfs-standalone-file,ssh` (honored). This
>   is a **git-lfs security feature, not a workaround target.**
> - **(2) Intent reframed.** The sub-phase's load-bearing requirement (charter Stage-1a
>   reframe) was eliminating CI's GitHub-LFS **bandwidth** exhaustion (dashboard:
>   10/10 GB free tier, throttled, at sub-phase open). That is **met** by the per-job
>   trusted-config model shipped at Stage 1b and proven at bulk scale by M3/M4: the
>   LFS-fetching workflows (`python-strict`, `cpp-strict`) source `setup-lfs-s3.sh`
>   (writes trusted `.git/config`) and fetch from R2, not GitHub LFS. The implicit
>   aspiration of a **universal R2 default via committed config** was never load-bearing
>   for any current requirement, required subverting the git-lfs security feature, and
>   is **correctly unreachable**.
> - **(3) D4 re-status: steady-state, not transitional.** D4 ("GitHub LFS fallback")
>   was framed with an implicit end at M5. Instead **D4 is the steady state** for any
>   consumer who has not opted into R2 (fresh clones without `lfs-s3`/creds resolve LFS
>   via GitHub LFS exactly as before). Objects remain in GitHub LFS as fallback.
>   **§ 6 M6** (decommission GitHub LFS → "R2 only") becomes the only path that would
>   force R2 universally, and it **stays deferred indefinitely** — a future operator
>   decision, explicitly **out of this sub-phase**.
> - **§ 6 M5 amended:** M5 does **not** commit a root `.lfsconfig` (it would be inert).
>   M5 = the documentation + acceptance that R2 activation is **opt-in via trusted
>   `.git/config`** (per-job in CI; a documented one-command bootstrap for local dev,
>   `tools/lfs/README.md`). The Stage-1b amendment's "the committed root `.lfsconfig`
>   switch lands at M5" is **withdrawn** as mechanically impossible.
> - **Finding that shaped the final architecture (FACT — design).** The per-job opt-in
>   model with GitHub-LFS fallback is **more robust** than universal-default routing
>   would have been: fresh clones work without R2 credentials; CI opts in precisely
>   where bandwidth matters; D4's "fallback" is revealed as load-bearing safety, not a
>   transitional inconvenience. The git-lfs protection that prevents a committed
>   `.lfsconfig` from activating an arbitrary binary is the correct design; the original
>   M5 plan was implicitly trying to subvert it.

## § 0 — Front matter

- **Sub-phase:** `sub-phase-lfs-architecture` (Phase-2 infrastructure tail; Phase 2 closed
  formally at `v0.2.0-phase-2`, HEAD `fd21445`).
- **Audit folder:** `docs/_audits/phase-2/sub-phase-lfs-architecture/`.
- **Plan doc:** `docs/phases/sub-phase-lfs-architecture.md` (this file).
- **Probe report:** `tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md`
  (committed separately; sha256 `1bfbae5102585a7b9b9bef00a2612566b8a22440afc2b46010dc271121a5e194`,
  commit `d17a479`).
- **Cadence:** plan-drafting (4 commits) → Stage 0 → Stage 1a/1b/1c → Stage 2. ~15–25
  commits over 5–7 sessions across multiple weeks.
- **Precedent shape:** focused-infra per `docs/phases/sub-phase-audit-chain-correctness.md`
  and `docs/phases/sub-phase-capture-determinism-contract.md` (probe→charter→landing→back-fill;
  Stage 0 pre-flight; Stage 1a scaffold-RED / 1b implementation / 1c verdict; Stage 2 landing).

## § 1 — Scope and posture

### 1.1 The reframe the probe forced (read this first)

(FACT — probe § P2, web-fetched 2026-05-26) The dispatch brief's premise — "GitHub LFS free
quota = 1 GB storage + 1 GB bandwidth/month; pay via stackable data packs" — is **stale**:

- GitHub Free/Pro free quota is now **10 GiB storage + 10 GiB bandwidth / month**
  (https://docs.github.com/en/billing/concepts/product-billing/git-lfs).
- **Data packs are removed**, replaced by metered billing ($0.07/GiB-mo storage,
  $0.0875/GiB bandwidth; a $0 budget cleanly *blocks* overage rather than charging)
  (https://docs.github.com/en/billing/how-tos/products/upgrade-git-lfs-storage).

(FACT — probe § P1) Current physical LFS storage is **4.852 GiB** (26 unique OIDs;
5.098 GiB logical across 31 pointers). That is **under** the 10 GiB free storage quota.

**Therefore (INFERENCE) the architectural problem is not storage-today; it is (a) CI
bandwidth now, and (b) storage growth crossing 10 GiB during Phase 4.** Probe § P3 shows the
bandwidth is concentrated in exactly **2 of 10 workflows** (`python-strict`, `cpp-strict`),
both of which mostly do not need the bytes they pull. This makes **selective LFS fetch the
single highest-leverage immediate lever**, and the **external backend a forward-looking
capacity move** for the Phase-4 storage crossing — not an emergency unblock.

This is consistent with the operator's standing posture: *do it right from first principles*
(design the transition + prove the backend integration end-to-end) **and** prefer not paying
(R2's 10 GB free + zero egress + selective fetch keeps the project at $0 well past current
scale). Selective fetch is a **component** of the tiered architecture (catalog § 45.1), not a
competing alternative to backend integration — both are delivered.

### 1.2 In scope

1. **Tiered-CI mapping + selective LFS fetch** (§ 4): operationalize catalog § 41 / § 45
   against the actual 10 workflows; `lfs: false` where captures aren't needed; targeted
   `git lfs pull --include=` where a narrow fixture set is.
2. **External LFS backend integration architecture** (§ 5): recommended backend + bucket
   layout + custom-transfer-agent config + credential model + failure modes, designed and
   **proven end-to-end on a non-canonical test object**.
3. **Migration runbook** (§ 6): concrete named-command steps, per-step invariant checks,
   rollback path. The *execution* of canonical-capture cutover is **D3-gated + operator-routed**.
4. **Invariant-preservation harness** (§ 7): stage-boundary tests for I1–I7.
5. **D-class routing** (§ 8): D1–D9 surfaced with leans for operator decision.

### 1.3 Out of scope (explicit)

- **History rewrite.** This is **NOT** a history rewrite (contrast the prior
  `sub-phase-git-lfs-migration`, an 11-commit history rewrite `34c7d34`→`cf13d1c`, CHANGELOG
  `### sub-phase-git-lfs-migration`). Pointer stubs already in published commits stay
  **byte-identical**; only the resolver/backend config (`.lfsconfig` + Actions auth + remote
  LFS config) changes. (FACT — spec `docs/architecture.md:1558` server-side hook #2 "No
  history rewrite".)
- **Flipping GitHub LFS off / bulk canonical cutover without operator go** (D3).
- **Phase-4 schema work** (`gradient_fields` / `active_mask`) — that is Phase 4's; here we
  only *verify* the architecture absorbs it (D9, § 11).
- **Captures-archive productization** (Zenodo/HF DOI snapshots) — deferred to Phase 5
  preprint-extraction (D7).
- **Pushing any tag** (operator-only, § 7 I7).

### 1.4 Verdict states

Per spec `docs/architecture.md:1442`: CONFIRMED / SHIFTED / REFUTED / DEFERRED (+ compounds
DISCONFIRMED-AT-HEAD, REFRAMED, BLOCKED, HALTED). Each gate/invariant carries one.

## § 2 — Probe results (synthesis)

Full report + all citations: `tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md`.
Headlines:

- **P1 inventory (FACT):** 31 pointers / 26 unique OIDs; **4.852 GiB physical / 5.098 GiB
  logical**; 5 legacy-captures entries dedup against stack captures by OID. Largest 1073.6 MiB
  (MPM drop-impact-128cube ×3 distinct-OID); smallest 22.4 KiB; median 26.1 MiB. Three
  families dominate (MPM ~3.15 GiB, eulerian Taylor-Green 704 MiB, LBM Poiseuille).
- **P2 quota (WEB-FETCH):** 10 GiB+10 GiB free; data packs gone → metered; $0 budget blocks
  overage. Storage under quota today; bandwidth is the live pressure. Live dashboard not
  pasted (Stage 0 to attach).
- **P3 CI (FACT):** 10 workflows, all push+PR, none scheduled. Only `python-strict` +
  `cpp-strict` set `with: lfs: true`. `cpp-strict` needs **zero** committed captures;
  `python-strict` needs **only** `tests/fixtures/legacy-captures/**`. `mutation-testing.yml`
  is mis-tiered (runs per-push; belongs weekly).
- **P4 I1 (FACT):** `verify_evidence` is **offline** — resolves the content OID from the
  pointer stub (`tools/integrity/integrity/common/repo.py:85-106`,
  `tools/integrity/integrity/scripts/verify_evidence.py:113-128`), never smudging. 3 Phase-2
  audits PASS (9/0, 48/0, 13/0). → I1 is decoupled from backend availability.
- **P5 corpus (FACT):** 6 corpus `.h5` entries; round-trip test reads payload bytes
  (`tools/testkit/capture/tests/test_legacy_captures_corpus.py`); host-agnostic.
- **P6 growth (INFERENCE):** Phase 4 (+0.7…+10.5 GiB) likely crosses 10 GiB; decade horizon
  ~40–80 implemented units → bandwidth binds long before storage.
- **P7 invariants (FACT):** integrity baseline `c19492ad…d22cb52` and replay
  phase-1→`v0.1.0-phase-1` `ok=True` both PASS at HEAD.

## § 3 — External backend survey (synthesis)

Full verbatim citations: probe § S1–§ S7. Decision-relevant distilled facts (all WEB-FETCH
2026-05-26):

| Option | Storage free / paid | Egress | sha256-native | GH-Actions OIDC | Operational burden | Verdict |
|---|---|---|---|---|---|---|
| **Cloudflare R2** | 10 GB free / $0.015 GB-mo | **Free (zero egress)** | yes (via lfs-s3 OID passthrough) | **no** (static R2 token) | low (`lfs-s3` agent, no server) | **LEAN (D1)** |
| Backblaze B2 | 10 GB free / $0.005 GB-mo | free ≤3× storage, or free via Cloudflare CDN | yes | no | medium (CDN for free egress) | alt |
| DVC + cloud | backend cost only | backend | **NO — MD5 default, sha256 unsupported (issue #3069)** | n/a | high (new tool, full migration) | **CONTRAINDICATED (breaks I1)** |
| GitHub metered | 10 GiB free / $0.07 GiB-mo | $0.0875/GiB | yes (status quo) | n/a | none (status quo) | reference (operator prefers not paying) |
| AWS S3 | $200-credit/6mo / $0.023 GB-mo | $0.09/GiB (100 GB/mo free) | yes | **yes** | medium | reference-only (operator-excluded) |

- **Transfer surface:** git-lfs custom-transfer agent (stdin/stdout JSON; object bytes bypass
  the git host, metadata pointers stay with GitHub). Best-maintained provider-portable
  implementation: **`lfs-s3`** (nicolas-graves, MIT, v0.2.2 2026-04-21; works against R2/B2).
  Server alternatives (`rudolfs`, `giftless`) add operational burden. `git-remote-s3` is
  AWS-locked (excluded). `lfs-folderstore` archived 2023.
- **Archives (complement, D7-deferred):** HF Datasets (sha256-native, no DOI), Zenodo (DOI,
  MD5), Internet Archive (free, MD5/SHA1, no DOI).

## § 4 — Tiered CI architecture (operationalizing catalog § 41 + § 45)

(`docs/planning/bit-physics-master-catalog.md:3427` § 41) Catalog § 41 defines five CI tiers by **cadence** (T1 hot per-push
smoke ~1 min; T2 per-PR full-sim gate ~30 min; T3 nightly cross-stack/cross-tier equivalence
~3 h; T4 weekly mutation/fuzz/stability ~12 h; T5 phase-landing full audit). § 45.1 defines
**selective execution via dependency graph** (a PR runs only tests downstream of its changed
files; a docs-only PR runs T1). This sub-phase **maps the current state onto that shape; it
does not redesign the shape** (per dispatch).

### 4.1 Current state vs target tiers (A1)

(FACT — probe § P3) All 10 workflows run at per-push + per-PR cadence; none scheduled.

| Workflow | LFS-fetch today | Needs captures? | Target tier | Action this sub-phase |
|---|---|---|---|---|
| `.github/workflows/structure.yml` | no | no | T1 | none |
| `.github/workflows/integrity.yml` | no | no (offline OID) | T1/T2 | none |
| `.github/workflows/tolerance-budget-check.yml` | no | no | T1/T2 | none |
| `.github/workflows/audit-append-only.yml` | no | no | T1 + landing | none |
| `.github/workflows/ts-strict.yml` | no | no | T1/T2 | none |
| `.github/workflows/determinism.yml` | no | no (regenerates) | T1/T2 | none |
| `.github/workflows/equivalence.yml` | no | no | T2/T3 | none |
| `.github/workflows/python-strict.yml` | **yes** | only `legacy-captures/**` | T1/T2 | **`lfs: false` + targeted corpus pull** |
| `.github/workflows/cpp-strict.yml` | **yes** | **none** | T1/T2 | **`lfs: false`** |
| `.github/workflows/mutation-testing.yml` | no | no | **T4 (weekly)** | **re-tier candidate (D-class-adjacent; § 8 note)** |

### 4.2 Selective LFS fetch (the immediate lever; catalog § 45.1 applied to LFS)

(FACT — `.github/workflows/python-strict.yml:14-16` and `.github/workflows/cpp-strict.yml:27-29`
both set `with: lfs: true` under `actions/checkout@v6`.)

- **`cpp-strict`:** drop `lfs: true` → `lfs: false`. (FACT — its smoke binaries *write*
  runtime `.h5` to `captures/common-cpp-smoke/`; the C-6 interop ctest reads a C++-emitted
  `.h5`; no committed LFS object is read.) *[CORRECTED Stage 1b (FALSIFIED): the probe missed
  the RD-2D-Stack-C ctests (`rd2d_stack_c_tests`, `rd2d_stack_c_gate14`) — the gate-14
  cross-stack test reads the committed `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5`.
  cpp-strict therefore needs a **narrow reference-capture** set, not zero. Fix: `lfs: false` +
  targeted `git lfs pull --include="captures/reaction-diffusion-2d-ref/**"` (still ≫ smaller than
  a full fetch). Surfaced to operator in the Stage-1b report.]*
- **`python-strict`:** drop `lfs: true`; add an explicit step
  `git lfs pull --include="tests/fixtures/legacy-captures/**"` before the `pytest capture/tests/`
  step. (FACT — `tools/testkit/capture/tests/test_legacy_captures_corpus.py` is the only
  captures-reading test under that pytest run.)
- **Expected effect (INFERENCE):** dominant per-run LFS bandwidth term drops from
  ~2 × 4.85 GiB to ~447 MiB (corpus only), ~20×, **independent of backend choice**. This is
  correct on its own merits and ships in Stage 1b regardless of D1.

### 4.3 D-9 resolution (local, for this sub-phase)

(`docs/planning/bit-physics-master-catalog.md:3427` § 41 + `docs/planning/bit-physics-master-catalog.md:3325` § 38) Catalog flags D-9 (5-tier vs 4-tier) as open and notes
both defensible. **Local resolution (D2 lean):** adopt the catalog's **5-tier vocabulary**
(T1–T5) as naming, but recognize only **T1/T2 are wired today** (per-push + per-PR); T3/T4
(scheduled) and T5 (phase-landing) are **staged** until nightly/weekly runner infrastructure
exists. Tier count is **not load-bearing for the LFS work**; the LFS-relevant outputs (selective
fetch, outage policy) are tier-tagged but do not depend on 4-vs-5. Surfaced as D2 for operator
ratification at low stakes.

## § 5 — External LFS backend integration architecture (A2)

**Recommended (D1 lean): Cloudflare R2 via the `lfs-s3` custom-transfer agent.** Rationale:
zero egress (decisive given bandwidth-is-the-pressure), 10 GB free storage covers current
4.852 GiB, S3-compatible (low lock-in, `rclone`/`aws s3` exit), `lfs-s3` is a no-server agent
(low operational burden). B2 is the cheaper-storage fallback (needs Cloudflare CDN for free
egress). DVC contraindicated (MD5 breaks I1). (All FACT per probe § S1/§ S2/§ S4; INFERENCE on
the weighting.)

### 5.1 Object naming / bucket layout

(INFERENCE — design proposal for Stage 1b) git-LFS content is OID-addressed, so object keys are
the content sha256 (LFS standard `objects/<oid[0:2]>/<oid[2:4]>/<oid>`). One bucket
`bit-physics-lfs` suffices; the OID namespace is flat and collision-free. No per-sim prefixing
needed (the OID *is* the identity); human-readable paths live in git via the pointer stub.

### 5.2 Custom-transfer-agent config

(INFERENCE — Stage 1b) Per-repo `.lfsconfig` + git config:
`lfs.customtransfer.lfs-s3.path` → the `lfs-s3` binary; `lfs.standalonetransferagent lfs-s3`;
S3 endpoint = the R2 `https://<account>.r2.cloudflarestorage.com` with `region=auto`. The
batch-metadata endpoint stays GitHub during additive transition (D3), or is dropped at full
cutover.

### 5.3 Credential model

(FACT — probe § S1) R2 has **no GitHub-Actions OIDC**. Model: a **scoped R2 API token**
(bucket-restricted, object-rw) in GitHub Actions **Secrets**; for local dev push/pull, a
per-developer R2 token in the developer's git credential store / env. Failure mode on token
expiry or R2 outage: LFS fetch fails → per § 8 D5, T1/T2 SOFT_WARN (don't block iteration),
scheduled tiers HARD_FAIL (the matrix must have its data). The pointer stubs (and therefore
I1/verify_evidence/the whole audit chain) remain resolvable **offline regardless** (§ 7 I1).

### 5.4 Exit / lock-in

(FACT — probe § S1) S3 API → `rclone sync r2:bit-physics-lfs s3:elsewhere`; zero egress makes
the read side free; OID-addressing means re-pointing storage never rewrites git history.

## § 6 — Migration runbook (A3) — concrete steps; NOT a history rewrite

> **Discipline (FACT):** every pointer stub stays byte-identical (spec
> `docs/architecture.md:1558` no-history-rewrite). The migration moves *content bytes*, never
> *git objects*. Execution of the canonical-capture cutover (step M5+) is **D3-gated +
> operator-routed**; Stage 1b proves the integration on a **non-canonical test object** first.

- **M0 — account/bucket setup (operator + agent):** create R2 bucket `bit-physics-lfs`; mint a
  scoped API token; inject into Actions Secrets. *Operator action for the secret; agent drafts
  the runbook.*
- **M1 — agent install + config:** install `lfs-s3`; write `.lfsconfig` + git config (§ 5.2).
  Commit `.lfsconfig` (additive; pointer stubs untouched). *[AMENDED Stage 1b — see top block:
  per-job CI git config via `tools/lfs/setup-lfs-s3.sh`; **no committed root `.lfsconfig`** at M1;
  the committed standalone-agent switch is deferred to the M5 cutover.]*
- **M2 — prove on a test object:** create a throwaway LFS-tracked test file under a temp path;
  `git lfs push` it to R2; delete the local cache; `git lfs pull` it back; sha256-verify the
  smudged content == pointer OID. **PASS gates Stage 1b.**
- **M3 — bulk upload existing content (additive, no cutover):** `git lfs push --all r2-remote`
  uploads every existing object to R2 **while GitHub LFS retains them** (redundancy, I5 safe).
- **M4 — verify every pointer resolves from R2:** for every LFS path, fetch from R2 and
  sha256-compare against the pointer OID (the bulk-verification sweep, § 7 A5). PASS for every
  file required.
- **M5 — cutover (D3-gated, operator go ONLY):** flip `.lfsconfig` `lfs.url` to R2 (or the
  custom-agent to standalone); GitHub LFS retained as fallback during transition (D4). Re-run
  M4 + I1/I2/I3. *[AMENDED Stage 1b — this is where the **committed root `.lfsconfig`** standalone-agent
  switch lands (deferred here from M1); until then R2 access is per-job CI config only.]*
- **M6 — (deferred, future trigger) turn GitHub LFS off** once R2 is proven primary and the
  storage-approaching-10-GiB trigger fires; operator decision.

**Rollback:** any step Mn failing → revert the `.lfsconfig`/config commit (M1/M5 are single
commits; revert restores GitHub-LFS-only resolution); content on GitHub LFS is never deleted
until M6, so rollback is always to a fully-resolvable state. STOP + surface (§ 9).

## § 7 — Named invariants I1–I7 (A4)

Each invariant: verification command, stage boundary, failure response. **Failure response is
uniform: HARD_FAIL the stage; surface to operator; do NOT auto-recover** (Hard Rule 2).

### I1 — LFS content-OID semantics (the load-bearing one)
- **Statement (FACT):** the sha256 in every pointer stub is the content OID;
  `lfs_pointer_oid()` returns it **offline** (`tools/integrity/integrity/common/repo.py:85-106`);
  `verify_evidence` compares it against `evidence_hashes`
  (`tools/integrity/integrity/scripts/verify_evidence.py:113-128`). Spec § 7.5
  `docs/architecture.md:1455`; Appendix G.7 `docs/architecture.md:3135`; conventions § B.6
  `docs/conventions/sub-phase-conventions.md:183`.
- **Why migration cannot break it (INFERENCE):** verify_evidence never fetches content; the OID
  is in the stub (a normal git blob). A pointer-byte-preserving migration is transparent to I1.
- **Verification:** `python -m integrity.scripts.verify_evidence --audit <path>` on the **3
  pinned audits** (probe § P4.3) — all PASS, **plus** a byte-identity check that every pointer
  stub at HEAD is unchanged from the pre-stage SHA. New harness:
  `tools/testkit/` stage-boundary script (Stage 1a adds it RED; § 10).
- **Boundary:** pre- and post- **every** stage (1a/1b/1c/2).

### I2 — Bit-identity replay invariant
- **Statement (FACT):** phase-1→`v0.1.0-phase-1` canonical replay digest
  `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (conventions § D.3
  `docs/conventions/sub-phase-conventions.md:253-257`). Sub-phases do not join the replay chain
  (§ D.4); this is the canonical anchor, re-verified at HEAD (probe § P7, `ok=True`).
- **Verification:** `uv run --no-sync python -m integrity.scripts.replay_prior_phase
  --prior-phase phase-1 --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md --gates
  integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
  (from `tools/integrity/`); expect `ok=True`, 8/8 PASS.
- **Boundary:** Stage 0 (Task 0.0, per conventions § D.3 `:264`) and Stage 2.

### I3 — Integrity baseline
- **Statement (FACT):** `python -m integrity --all --mode strict` → **0 HARD_FAIL** / 14
  SOFT_WARN; sha256 of the full stderr report == `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  ([[integrity-baseline-digest-method]]).
- **Verification:** the command above; **0 HARD_FAIL is the gate** (SOFT_WARN count may grow as
  new audits land — that is allowed; HARD_FAIL must stay 0). The exact digest re-matches only if
  no new audits/files changed the report; new audit files WILL change it, so the gate is
  **0 HARD_FAIL**, not byte-equality of the digest, after Stage-1c onward.
- **Boundary:** every stage.

### I4 — Append-only audits
- **Statement (FACT):** spec § 7.5 `docs/architecture.md:1444-1448`; enforced by
  `.github/workflows/audit-append-only.yml` (on `*.ledger.md` files at the prior phase tag;
  net-new files allowed; SHA back-fill of a non-`.ledger.md` landing audit is permitted).
- **Verification:** the workflow GREEN on push; locally, no prior audit edited.
- **Boundary:** every commit (CI).

### I5 — Worktree replay at prior tags (the real migration risk)
- **Statement:** `git checkout v0.2.0-phase-2 / v0.1.0-phase-1 / v0.0.0-phase-0` must still
  **resolve captures** (smudge LFS content). (INFERENCE) This is the **one invariant the
  backend migration can actually threaten**: if the old backend's content goes away before the
  new backend has it, historical-tag checkouts can't smudge.
- **Mitigation (FACT — design):** additive cutover (M3 uploads all objects to R2 *before* any
  GitHub-LFS-off; D4 retains GitHub LFS as fallback through transition). M6 (GitHub-LFS-off) is
  deferred until R2 is proven to hold **every historical OID**.
- **Verification:** at Stage 1c, checkout each prior tag in a worktree and `git lfs pull`;
  sha256-verify a sample resolves. Boundary: Stage 1c + before any M6.

### I6 — Convention #12 (SHA back-fill)
- **Statement (FACT):** conventions § B.2 `docs/conventions/sub-phase-conventions.md:74-90` —
  SHA back-fill is always a **separate** commit; never `git --amend` of a published commit
  (spec `docs/architecture.md:1558` server-side hook #2).
- **Verification:** every stage close has a distinct back-fill commit. Boundary: every stage.

### I7 — No agent-pushed tags
- **Statement (FACT):** spec § 7.12 `docs/architecture.md:1542-1551` — phase tags are
  operator-only; an agent-pushed tag is a HARD_FAIL. This sub-phase pushes **no** tag (it is a
  Phase-2-tail item; optional non-phase point-release is a banked operator decision per
  conventions § D.2 `docs/conventions/sub-phase-conventions.md:249`).
- **Verification:** no `git tag … && git push` in any stage. Boundary: every stage.

### A5 — Determinism through migration (bulk content verification)
(FACT — design) Captures are content-addressed by sha256; the migration moves bytes, not
content. **Bulk-verification command (Stage 1b M4 / Stage 1c):** walk every LFS-tracked path
(`git lfs ls-files -n`), fetch content from the target backend, `sha256sum`, compare against the
pointer OID (`git show HEAD:<path>` → `oid sha256:` line). **PASS for every file gates the
stage.** A divergence on any file = STOP + rollback (§ 9).

## § 8 — D-class decisions (D1–D9)

Each: question · options · lean + rationale · decision-required-by.

- **D1 — Backend choice.** R2 / B2 / DVC / GitHub-metered. **Lean: R2 via `lfs-s3`** (zero
  egress; 10 GB free; S3-compat low lock-in; no-server low burden; DVC contraindicated by I1
  MD5). **By: Stage 0** (must route before Stage 1b integration).
- **D2 — Tier count (catalog D-9).** 5 vs 4. **Lean: 5-tier vocabulary, T1/T2 active, T3–T5
  staged** (§ 4.3); low stakes for LFS. **By: Stage 1a.**
- **D3 — Migration strategy.** additive cutover / comprehensive / phased. **Lean: phased** —
  Stage 1b ships selective-fetch + proves R2 end-to-end (M0–M4) + documents the cutover runbook;
  **canonical cutover (M5) is operator-routed**, gated on the storage-approaching-10-GiB trigger.
  Keeps $0, preserves I5, no big-bang. **By: Stage 1b.**
- **D4 — Redundancy.** primary-only / primary+mirror. **Lean: R2 primary + GitHub LFS retained
  as fallback through transition** (+ deferred D7 archive). **By: Stage 1b.**
- **D5 — Outage behavior.** LFS-fetch failure HARD_FAIL vs SOFT_WARN, per tier. **Lean: T1/T2
  SOFT_WARN, T3+ HARD_FAIL** (selective fetch makes T1/T2 exposure tiny anyway). **By: Stage 1a.**
- **D6 — Path-filter granularity.** per-workflow `on: paths` vs shared filter file. **Lean:
  per-workflow selective `lfs:`/`--include=` now (simple); shared
  `tools/testkit/dependency-graph.json` (catalog § 45.1) deferred until workflow count grows.**
  **By: Stage 1a.**
- **D7 — Captures-archive complement.** Zenodo/HF snapshot. **Lean: defer to Phase 5
  preprint-extraction** (HF Datasets = sha256-native target; Zenodo for DOI). **By: deferred
  (not this sub-phase).**
- **D8 — Pre-commit ceiling.** 2 GiB raise vs stay. **Lean: stay** — it is a git-hygiene knob,
  not a hosting constraint (`.pre-commit-config.yaml:37`); largest canonical is 1.05 GiB; raise
  per-need at Phase 4 if a single capture exceeds 2 GiB. **By: not this sub-phase (no change).**
- **D9 — Phase-4 readiness.** Phase-4-specific vs just-works. **Lean: just works** —
  content-addressing is schema-agnostic; corpus round-trip is a payload-byte reader contract
  (probe § P5); migration preserves pointer bytes. **Verify at Stage 1c** (corpus round-trip +
  bulk sha256 sweep pre/post). **By: confirm Stage 1c.**

**Note (mutation-testing re-tier):** `.github/workflows/mutation-testing.yml` runs per-push but
its own header says SOFT_WARN-on-push / HARD_FAIL-at-landing and catalog § 41.4 places mutation
at T4 (weekly). Re-tiering to a schedule is a clean win but is **CI-policy, not LFS** — flagged
here, routed to operator as a Stage-1a optional rider (not a blocker).

## § 9 — Risk register / STOP triggers

| Risk | Likelihood | Mitigation | Trigger → response |
|---|---|---|---|
| Plan-vs-HEAD drift at a stage | low | Stage 0 re-anchors all P1–P7 | charter ceases authoritative → **STOP**, surface (Hard Rule 2) |
| I1 fails at a boundary (pointer bytes changed) | very low (no edits planned) | byte-identity check each stage | **STOP**, do not auto-recover |
| I2/I3 regress | very low (offline, content-addressed) | re-run each stage | **STOP**, operator routes |
| Missed pointer after a migration step (e.g., verify_evidence fails on a Phase-0 audit) | low | M4 bulk sweep is exhaustive | **STOP**, execute rollback (§ 6), surface |
| Backend probe ambiguous / facts shift | low | probe pinned facts + URLs; Stage 0 re-fetches | **STOP**, do not fabricate; operator clarifies |
| I5 break (old backend gone mid-transition) | medium if M6 done early | additive: GitHub LFS retained until R2 proven complete | M6 gated on full-OID verification + operator go |
| Force-push / history-rewrite / `--amend` of published commit / phase-tag push | n/a (forbidden) | none performed | any attempt → **STOP**, surface |
| Integrity HARD_FAIL appears (>0) | very low | I3 each stage | **STOP** |
| R2 token leak/expiry | low | scoped bucket-restricted token; rotate | SOFT_WARN T1/T2, HARD_FAIL T3+ (D5) |

## § 10 — Stage decomposition

> Standard focused-infra cadence (precedent `docs/phases/sub-phase-audit-chain-correctness.md`).
> Every stage: entry preconditions · probe shape · deliverables · acceptance (invariants/gates)
> · failure response · exit state.

### Stage 0 — anchor re-check / pre-flight (~3 commits)
- **Entry:** plan-drafting CONFIRMED + operator routed D1 (backend) and acknowledged D2/D5/D6.
- **Probe shape:** re-verify P1–P7 against live HEAD (HEAD == `fd21445` or successor; if `main`
  moved, re-anchor); paste the **live GitHub LFS billing dashboard** (probe § P2 NOTE);
  re-fetch D1 backend pricing/limits (confirm no shift); run I2 (replay) Task 0.0 + I3
  (integrity baseline) + tolerance-budget carryover.
- **Deliverables:** `docs/_audits/phase-2/sub-phase-lfs-architecture/stage-0-checkpoint-<UTC>.md`
  + evidence (replay output, integrity sweep, dashboard paste) + Convention #12 back-fill.
- **Acceptance:** I2/I3 PASS; P1–P7 reconciled (drift surfaced if any); D1 routed.
- **Failure:** any P-drift or invariant fail → BLOCKED/HALTED, surface, STOP.
- **Exit:** anchors confirmed; backend chosen; ready for scaffold.

### Stage 1a — scaffold + RED tests (~2–3 commits)
- **Entry:** Stage 0 exit clean.
- **Probe shape:** re-anchor the verify_evidence surface + the 3 pinned audits + workflow files.
- **Deliverables (RED-first, TDD spec § 1.3):**
  (1) invariant-verification harness in `tools/testkit/` — I1 (verify_evidence on the 3 pinned
  audits + pointer-byte-identity check), A5 (bulk OID sweep), I5 (prior-tag resolve) — committed
  **failing/red first** with the failing-output sha256 recorded (conventions § E / spec § 1.3);
  (2) the selective-fetch workflow edits drafted as failing/guarded (or staged behind a flag);
  (3) D2/D5/D6 tier/outage policy encoded as config.
- **Acceptance:** RED committed with output hash; I2/I3/I1 (on unchanged tree) still PASS.
- **Failure:** STOP, surface.
- **Exit:** test surfaces exist (red); selective-fetch edits ready to go green in 1b.

### Stage 1b — implementation / migration (multi-commit, per § 6 step boundaries)
- **Entry:** Stage 1a RED recorded.
- **Deliverables (commit chain mirrors § 6):**
  (c1) selective-fetch: `lfs: false` on `cpp-strict`; `lfs: false` + targeted corpus pull on
  `python-strict` → the I1/A5 harness goes GREEN; (c2) `.lfsconfig` + agent config (M1);
  (c3) test-object proof (M2) evidence; (c4) bulk upload (M3) + bulk sweep (M4) evidence.
  **No M5 cutover without operator go (D3).**
- **Acceptance:** selective-fetch harness GREEN; M2/M4 PASS for every file; I1/I2/I3/I4 GREEN;
  I5 unaffected (GitHub LFS retained).
- **Failure:** STOP + rollback (§ 6), surface.
- **Exit:** bandwidth lever live; R2 integration proven; cutover staged + documented.

### Stage 1c — verdict landing (~2–3 commits)
- **Entry:** Stage 1b GREEN.
- **Deliverables:** per-invariant verification PASS report (I1–I7 + A5); corpus round-trip
  pre/post (D9 confirm); prior-tag resolve (I5); stage-1c checkpoint + back-fill.
- **Acceptance:** all invariants CONFIRMED; D9 = just-works confirmed.
- **Failure:** STOP, surface.
- **Exit:** architecture verified; ready to land.

### Stage 2 — landing audit + doc edits + sweeps (~2–3 commits)
- **Entry:** Stage 1c CONFIRMED.
- **Deliverables:** closing audit
  `docs/_audits/phase-2/sub-phase-lfs-architecture/landing-<UTC>.md` (template: phase-2 § 2.12);
  CHANGELOG additive entry `### sub-phase-lfs-architecture`; conventions additive amendment if
  any (e.g., a new § L.10 banked-observations entry, and/or a selective-fetch convention); spec
  amendments (if any) **routed via a separate operator-approved commit, never unilateral**; full
  integrity sweep; cross-package regression sweep (§ B.7); evidence-path verification; back-fill.
- **Acceptance:** verify_evidence GREEN on the landing audit; integrity 0 HARD_FAIL; I1–I7 held.
- **Failure:** STOP, surface.
- **Exit:** sub-phase landed CONFIRMED; **no tag** (operator decision on optional point-release).

## § 11 — Scale projection (capacity headroom)

> **AMENDMENT — Stage 1a (2026-05-27): dashboard-anchored.** The figures below were
> inventory-derived at plan-drafting (the live dashboard was probe § P2 NOTE / UNKNOWN-2). The
> operator's live GitHub LFS billing dashboard (period 2026-05-01..26) now anchors them:
> - **Bandwidth: 10 GB / 10 GB free tier — 100% consumed, throttled.** (FACT — dashboard) This is
>   the **load-bearing constraint** driving the sub-phase. Selective fetch (§ 4.2) drops the
>   dominant per-run term ~20×; R2's zero egress dissolves the axis entirely.
> - **Storage: 380.77 GB-hr usage integral over the period (period-average ~0.61 GB), well under the
>   10 GB free quota.** (FACT — dashboard) A secondary slow-burn axis; R2 ($0.015/GB-mo beyond 10 GB)
>   buys headroom to the Phase-4 crossing below.
> - **Billed: $0** (FACT — dashboard) — capped at the free tier; the $0 budget blocks overage rather
>   than charging. Source: `github.com/settings/billing` metered-usage view.
>
> (INFERENCE) The dashboard storage figure is a **time-integral over the billing period** (GB-hours,
> a period during which the Phase-2 capture corpus was still being committed) — a different basis
> from the **4.852 GiB HEAD snapshot** (probe § P1). Both confirm storage sits comfortably under the
> 10 GiB free quota; the decision-relevant signal is unchanged — **bandwidth (100%/throttled) is the
> live pressure, storage is not.** The original inventory-derived narrative below stands as the
> repo-side measurement.

(Synthesis of probe § P6; INFERENCE-tagged ranges.)

- **Now (FACT):** 4.852 GiB physical < 10 GiB free storage. Bandwidth is the live constraint;
  selective fetch (§ 4.2) drops it ~20×.
- **Phase 4 (FACT 27 variants `docs/phases/phase-4-plan.md:127`; INFERENCE sizes):** +0.7…
  +10.5 GiB → 5.5–15.4 GiB physical. **Likely crosses 10 GiB free storage inside Phase 4** —
  the concrete trigger for M5/M6 cutover to R2 (free egress absorbs the bandwidth; $0.015/GB-mo
  absorbs storage beyond 10 GB at trivial cost). Schema 1.1.0 (`gradient_fields`/`active_mask`)
  is **content-addressing-agnostic** → architecture absorbs it without re-architecting (D9).
- **Phase 6 first-16 (INFERENCE, `[CATALOG § 35]`):** +3–12 GiB.
- **Decade horizon (INFERENCE, `[CATALOG L3381]` 15–30% of ~265):** ~40–80 units × 1–3
  instances → storage 36–100+ GiB; **bandwidth binds far earlier** → tiered cadence + selective
  fetch + zero-egress backend are **mandatory at horizon**, which is exactly what this
  architecture establishes now at $0.

## § 12 — Open questions / banked observations / forward-routing

### 12.1 UNKNOWNs for Stage 0 to resolve
- **UNKNOWN-1 (catalog provenance):** the master catalog is local-only (probe Finding D0). Stage
  0 confirms the operator-intended catalog path and whether it should be **vendored into the
  repo** before its tier model is normative — vendored at Stage 0 →
  `docs/planning/bit-physics-master-catalog.md` (commit `0ae3c57`); citations re-anchored.
- **UNKNOWN-2 (live billing):** paste the live GitHub LFS dashboard (storage/bandwidth used this
  cycle) — probe § P2 NOTE — to anchor § 11 to a real starting point.
- **UNKNOWN-3 (D1 routing):** operator must choose the backend (D1 lean R2) before Stage 1b.
- **UNKNOWN-4 (R2 account):** R2 bucket + scoped token are an operator action (M0); secret
  injection cannot be agent-performed.

### 12.2 Banked observations (carry-forward; conventions § L `docs/conventions/sub-phase-conventions.md:602`)
- **B-LFS1:** `verify_evidence`'s offline OID resolution makes the **audit chain robust to any
  pointer-byte-preserving backend change** — a reusable property worth a § L.10 entry at landing.
- **B-LFS2:** the brief's stale 1+1 quota / data-pack premise (probe § P2) — bank the corrected
  10+10 metered model as a reference fact for future infra sub-phases.
- **B-LFS3:** `mutation-testing.yml` per-push mis-tier (§ 8 note) — bank for a CI-policy
  sub-phase if not taken as a Stage-1a rider.

### 12.3 Forward routing
- D1/D3 routed by operator → coordinator dispatches Stage 0.
- D7 (archive complement) routed to Phase 5 preprint-extraction.
- Any spec amendment (e.g., a selective-fetch or backend convention into spec § 7) is
  operator-approved + separate-commit only (never unilateral).
