---
date: 2026-06-09T02-18-00Z
author: phase-5 sub-phase 5.5 preprint-extraction session (Claude Code)
subject: "Phase-5 sub-phase 5.5 (preprint-extraction) — build-and-validate an academic-preprint LaTeX source for the canonical preprint sim (pinn-poisson; v9 R4) through the deterministic-extraction + clean-compile gate (the § 3.8 surrogate). The FINAL Phase-5 pipeline. NO publish (deploy gated OFF); NO PDF committed. Fresh session; oriented only from committed state."
kind: sub-phase-landing
verdict: SHIFTED
phase: 5
sub_phase: "5.5"
head_sha: 9292a4bae55eb786121554a444f0957d98fefaa2
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
evidence_paths:
  - tools/productization/preprint-extraction/extract.py
  - tools/productization/preprint-extraction/pipeline.py
  - tools/productization/preprint-extraction/template/bitphysics-preprint.cls
  - .github/workflows/preprint-extraction.yml
  - docs/productization/preprint-extraction.md
  - tools/testkit/probes/reports/phase-5-preprint-extraction.md
  - docs/preprints/pinn-poisson/main.tex
  - docs/preprints/pinn-poisson/references.bib
  - docs/preprints/pinn-poisson/reproducibility-report.json
  - docs/perf-ledger.md
  - tools/testkit/failing-tests-evidence/phase-5-preprint-extraction-2026-06-09T02-05-10Z.txt
evidence_hashes:
  docs/preprints/pinn-poisson/main.tex: sha256:528ed860d5c48ed0b60c833ca726403d25a3a72569cba9021dbcbe86b9450685
  docs/preprints/pinn-poisson/references.bib: sha256:9da6aa99c3e4284669adce803687511dbef7c177a794e4fb49475dc92b8c048b
  docs/preprints/pinn-poisson/bitphysics-preprint.cls: sha256:66477fc8abcad72cea546714a70751b578bf48ab357b036ea28fca9b649004df
  docs/preprints/pinn-poisson/reproducibility-report.json: sha256:75a63fda133097e67048a5075b19fd493f45cecaa519a82ed975897edf5fd52b
  tools/testkit/failing-tests-evidence/phase-5-preprint-extraction-2026-06-09T02-05-10Z.txt: sha256:5ed840d528e7ee93e1bc98f34e8ef92ad62996d4b67bbb9df29589a25effbb0d
  texlive_toolchain_pin (TinyTeX-v2026.06.tar.gz): sha256:73c8cc30550aa04fa0bfcc171ade1e8506721885f911ecf5eb9261d50413d63a
---

# Phase 5 — sub-phase 5.5 (preprint-extraction) build-and-validate landing

> Build-and-validate ONLY — NO publish; the `deploy` job in `preprint-extraction.yml`
> stays gated OFF (§ 4.5). The preprint gate is DETERMINISTIC EXTRACTION (two
> extractions in separate processes → byte-identical `main.tex`) + CLEAN COMPILE
> (latexmk exit 0, no unresolved `\ref`/`\cite`); "extraction ran" / "PDF built" is
> NOT a pass. Bootstrap § 3.8 is N/A for preprints (Appendix F): the source sim's
> physics was already gated through Phase-3 acceptance. NO PDF committed. FACT =
> ran/read/measured at the cited HEAD this session; INFERENCE = reasoned. Four-state
> verdicts. Commits direct to `main` (trunk-based). NO tag (I7). This is the FINAL
> Phase-5 pipeline, but this audit closes **sub-phase 5.5 ONLY** — it does NOT compose
> the Phase-5 landing audit or propose `v0.5.0-phase-5` (the separate operator-ratified
> close pass). A fresh resume re-orients only from committed state.

## §0 — Headline

| | |
|---|---|
| **Infra commit** | `552b92a` (commit 1 — extractor + pipeline + LaTeX template + workflow + spec + probe + failing-tests-evidence). — FACT |
| **Build/validate commit** | `73124d9` (commit 2 — gate run + committed preprint source + perf-ledger row). This audit lands on top (commit 3); `head_sha` back-filled per Convention #12. — FACT |
| **Canonical sim (live discover)** | **1 qualifying** (`pinn-poisson`); the only `preprint:true` sim that clears all load-bearing § 6.5 criteria (preprint flag + §§ 1/3/4/6/12 populated + vendored upstream + MMS/GCI). Matches v9 R4. MEASURED via `pipeline.py discover` (13-sim `preprint:true` pool). — FACT |
| **Preprint gate result** | **PASS.** Deterministic extraction: two runs in SEPARATE processes → `main.tex` + `references.bib` BYTE-IDENTICAL (`run1 == run2`; main.tex sha256 `528ed860…`, references.bib sha256 `9da6aa99…`); verified hash-seed-independent (PYTHONHASHSEED 1 vs 999). Clean compile: latexmk exit 0, **0 unresolved `\ref`/`\cite`**, PDF built on demand (NOT committed). — FACT |
| **Integrity (live)** | **0 HARD_FAIL / 14 SOFT_WARN, rc 0** — invariant HELD. The 14 SOFT_WARN are pre-existing phase-0/1/2 audit-link warnings, none from this sub-phase. — FACT |
| **Deploy** | stayed **gated OFF** — no arXiv submission; preprint **source** committed to `docs/preprints/pinn-poisson/` (no PDF). — FACT |
| **Verdict** | **SHIFTED** — the gate passes honestly (byte-identical extraction never widened to a diff-tolerant compare; clean compile with zero unresolved cites) with landed-reality SHIFTs (de-Docker'd TeX toolchain; `used_by_sims` schema; § 12 minimal-fallback bib; frontier-story reframed) + one FLAGGED CI-observability limit (the preprint-extraction *cloud* job needs operator dispatch; validated locally). |

## §1 — STEP 0 reconciliation (fresh session)

- **HEAD at session start:** `09fb72a` (5.4 SHA back-fill), clean tree (only the two
  pre-existing untracked `common/common-ts/package-lock.json`). On `origin/main`.
  Trusted live state (#8). FACT.
- **Disk:** 578 GB free (`/dev/nvme0n1p5`, 10 % used); ample for the 197 MB TinyTeX
  tarball + extraction work. FACT.
- **TeX toolchain:** NONE present at start (no `latexmk`/`pdflatex`/TeX distro; no
  Docker; no passwordless sudo). Obtained a pinned sha256-verified **portable TeX
  Live (TinyTeX v2026.06)** tarball (the de-Docker pattern), extracted to
  `~/.local/opt/tinytex` — `kpsewhich` confirms `article.cls` + amsmath/amssymb/
  graphicx/geometry/parskip/hyperref present; latexmk 4.88, pdfTeX 1.40.29 (TeX Live
  2026), bibtex 0.99e. FACT.
- **Re-orientation reading (committed):** phase-5 plan § 5.5 / § 6.5 / Appendix F, the
  STEP-5a cross-extraction gate, the v9 R4 reconciliation, the pinn-poisson spec-ref +
  its § 13 five-boolean, the 5.2/5.3/5.4 landing audits (de-Docker + three-commit
  pattern), the sub-phase conventions. FACT.

## §2 — Canonical-sim selection (§ 6.5, R4-ratified)

`discover_qualifying_sims()` measures the `preprint:true` § 13 pool live (**13 sims**:
3dgs-mpm, articulated-pedagogical, eulerian-smoke, ising-classical,
lattice-boltzmann-d3q19, lenia, mass-spring-cloth, mpm-multimaterial, neural-ca,
pinn-poisson, reaction-diffusion-2d/3d, sph-water), then requires the load-bearing
§ 6.5 criteria. **Only `pinn-poisson` clears them** (MEASURED): `preprint:true` not
opted out; spec-ref §§ 1/3/4/6/12 populated; vendored upstream
`references/PhysicsNeMo-PINN/MANIFEST.toml` (`used_by_sims` includes
`learned-dynamics/pinn-poisson`); MMS/convergence-order story ("observed discrete-L2
order ≈ 2, `O(h²)`"). Every other `preprint:true` sim misses a vendored upstream
and/or an MMS/GCI story → reported non-qualifying. This matches v9 R4 (5.5 canonical =
`pinn-poisson`). FACT.

## §3 — The preprint gate (the REAL gate, not "extraction ran" / "PDF built")

Run via `preprint-extraction/pipeline.py validate --sim pinn-poisson` (uv/system
Python 3.x + `$BIT_PHYSICS_LATEXMK` = pinned TinyTeX). ~0.76 s wall on
`i7-12700KF-linux-7.0`. FACT.

1. **DETERMINISTIC-EXTRACTION gate (the § 3.8 surrogate; STEP-5a).** `extract.py` is
   invoked TWICE as **separate subprocesses** (the load-bearing detail — distinct
   `PYTHONHASHSEED`, so any hashed-collection iteration order would diverge). The two
   `main.tex` are **BYTE-IDENTICAL** (`cmp` == 0; sha256 `528ed860…` for both runs), as
   are the two `references.bib` (sha256 `9da6aa99…`). **No sort-before-emit fix was
   needed at gate time** — `extract.py` was authored sorting every collection from the
   start (the bibliography is emitted in sorted cite-key order; the section order is a
   fixed list), pre-empting the named trap. Independently verified
   **hash-seed-independent**: extraction under `PYTHONHASHSEED=1` vs `=999` is
   byte-identical for both files. The gate is the strict `cmp`, NOT a diff-tolerant
   compare. FACT.
2. **CLEAN-COMPILE gate.** `latexmk -pdf -interaction=nonstopmode -halt-on-error` on
   the extracted `main.tex` in the pinned TinyTeX: **exit 0**, PDF built (3 pages),
   **0 unresolved `\ref`/`\cite` warnings** (the bibliography uses `\nocite{*}` +
   `\bibliographystyle{plain}`, so all 4 extracted references — `evans`,
   `physicsnemosymv240`, `raissi2019`, `strauss` — resolve). The output is **pure
   ASCII** (a complete Unicode→LaTeX table maps all 24 non-ASCII glyphs in the spec
   sheet), so the compile does not depend on `inputenc` fallbacks. FACT.
3. **NO PDF committed.** The committed source is `main.tex` + `references.bib` +
   `bitphysics-preprint.cls` + `figures/.gitkeep` + `reproducibility-report.json` +
   `README.md`; the PDF is built on demand by the workflow / runbook. MEASURED: no
   `.pdf`/`.aux`/`.bbl` under `docs/preprints/`. FACT.

**Which gate applied (honest):** the **byte-identical `cmp`** determinism gate (the
strongest), NOT a tolerance. The extraction is deterministic by construction; no
nondeterminism had to be diagnosed or tolerated. During the BUILD, two real
compile-blockers were found and FIXED in the extractor (not papered over): (a)
BibTeX's `plain` style lowercased `\S{}`→`\s` (undefined) in § 12 entries → fixed by a
bib-safe cleaner + brace-protected values; (b) `used_by_sims` is under `[scope]` not
`[upstream]` → fixed, surfacing the vendored entry. FACT.

## §4 — perf-ledger row (FACT)

`| pinn-poisson | preprint-extraction-texlive-2026.06 | spec-ref.md -> main.tex + references.bib (deterministic extraction + latexmk clean compile) | 0.76 | i7-12700KF-linux-7.0 | (this commit) | 2026-06-08 | baseline (5.5 preprint-extraction; …) |`
Env label `preprint-extraction-texlive-2026.06` is the de-Docker'd form of the plan's
`preprint-extraction-texlive-<digest>` (the TinyTeX tarball sha256 `73c8cc30…` is the
true digest pin, recorded in the row + the workflow `env:`).

## §5 — §0.3 SHIFTs (landed reality wins)

1. **TeX toolchain — no Docker.** Plan names a "TeX Live container image pinned to
   digest"; this env has no Docker/podman + no passwordless sudo. SHIFT: pinned
   **portable TeX Live (TinyTeX v2026.06) tarball, sha256-verified** (`73c8cc30…`) in
   `preprint-extraction.yml` + located locally via `$BIT_PHYSICS_LATEXMK`. Same pin
   guarantee, no container runtime. Mirrors 5.2's `binary-cmake` and 5.4's
   `render-cycles-blender` de-Docker SHIFTs. FACT.
2. **BibTeX source schema.** § 6.5 says "BibTeX entries from
   `references/<upstream>/manifest.toml`"; the on-disk schema MEASURED has
   `used_by_sims` under the **`[scope]`** table (not `[upstream]`), and the file is
   `MANIFEST.toml` (uppercase, per the sim's own § 0.3 SHIFT). Read accordingly. FACT.
3. **§ 12 references → minimal-fallback entries.** The vendored upstream is fully
   structured from its `MANIFEST.toml`; the prose § 12 bullets are emitted as minimal
   `@misc` entries (title/author/year where parseable, brace-protected against
   BibTeX's title-lowering) per the § 6.5 anticipated-problem "graceful fallback to
   minimal entry". Richer structured parsing is post-phase. FACT.
4. **Frontier-variant story — reframed.** § 6.5 lists "a frontier-variant story" as a
   selection criterion; `pinn-poisson` is **single-stack** (spec § 9: "parent-vs-frontier
   REFRAMED to the invariant posture"), so there is no literal § 5 frontier column.
   Treated as **informational, not load-bearing** in `discover` (R4 ratified the pick).
   The four load-bearing criteria all hold. FACT.
5. **Shared-file edits = perf-ledger only.** The § 6.6 `index.md`/`CHANGELOG`/
   architecture-§ 11.6 aggregation conventions were **un-exercised by sub-phases
   5.2-5.4** (MEASURED: 5.4 commit-2 `cb4506e` touched only `perf-ledger.md` + its
   artifact dir; `CHANGELOG.md` has no Phase-5 entry; § 11.6 has no delivered
   annotations; `docs/productization/index.md` never existed). 5.5 follows the landed
   pattern (perf-ledger row + its own `docs/preprints/` + `docs/productization/*.md`)
   for consistency rather than introducing a partial aggregation. FACT.

## §6 — §S.5 CI sweep (per push)

- **Local pre-push (FACT):** smoke suite **10/10** (incl. the byte-identity-across-
  processes gate + the gated latexmk clean-compile gate under
  `BIT_PHYSICS_PREPRINT_BOOTSTRAP=1`); ruff check + format clean; integrity
  `--all --mode strict` **0 HF / 14 SW, rc 0**; the real gate run end-to-end (§ 3) PASS.
- **Post-push CI (queried via the public REST API):** commit 1 `552b92a` — **27/27
  always-on push checks success** (1 settling at query time, no reds). Commit 2
  `73124d9` — push suite green/in-progress at audit-compose time, **no reds observed**;
  CI conclusion back-filled at commit 3 below.
- **`preprint-extraction.yml` does NOT run on a bare main push** (it triggers on
  `push: tags ['preprint-v*']`, path-scoped PRs, or `workflow_dispatch`) — same posture
  as `render-passes.yml`/`pypi-release.yml`/`binary-release.yml`. See § 8 FLAGGED C-5.

## §7 — §R digest + render/variant hard gates (FACT)

- **§R integrity digest invariant at close HEAD:** 0 HARD_FAIL / 14 SOFT_WARN, rc 0
  (the COUNTS are the invariant; the full-report digest drifts by design).
- **render_similarity (0.9242) + variant (0.8702) HARD mutation floors: UNAFFECTED.**
  This sub-phase touched no `tools/testkit/render_similarity/` or
  `tools/testkit/equivalence/variant/` SOURCE (`git diff --name-only 09fb72a..HEAD` =
  the new `preprint-extraction/` tool, `preprint-extraction.yml`, `docs/preprints/`,
  `docs/productization/preprint-extraction.md`, the probe, `perf-ledger.md`, this
  audit). NO sim-code changes (extraction/CI only). FACT.

## §8 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / plan) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | "TeX Live container image pinned to digest" | no Docker/podman/sudo in env | **SHIFTED** — pinned sha256-verified portable TinyTeX tarball (§ 5.1) |
| C-2 | § 12 → BibTeX "from manifest.toml" (`[upstream]`) | `used_by_sims` is under `[scope]`; file is `MANIFEST.toml` | **SHIFTED** — read the real schema (§ 5.2) |
| C-3 | § 12 prose → structured bib entries | free-form prose; reliable structured parse out of scope | **SHIFTED** — minimal `@misc` fallback (sanctioned anticipated-problem) (§ 5.3) |
| C-4 | "frontier-variant story" required | pinn-poisson is single-stack (§ 9 reframed) | **SHIFTED** — informational, not load-bearing; R4 ratified the pick (§ 5.4) |
| C-5 | "preprint-extraction job confirmed green (not just fast jobs)" | preprint-extraction.yml needs tag/PR/dispatch; no write token to fire it | **FLAGGED** — the IDENTICAL pipeline (`pipeline.py validate`) ran green LOCALLY (§ 3) in the pinned toolchain; the byte-identity gate is process-isolated + hash-seed-independent, so the cloud job will pass. Operator dispatch needed to observe the cloud run (§ 9) |
| C-6 | the named nondeterminism trap may bite | sort-before-emit pre-empts it; verified hash-seed-independent | cleaner than feared — strict `cmp` gate applied, no tolerance |
| C-7 | compile may need tolerated warnings | `\nocite{*}` + plain + pure-ASCII → exit 0, 0 unresolved | clean; never widened |
| C-8 | minor build blockers (`\S` lowering; manifest schema) | found + fixed in the extractor, not papered over | resolved (§ 3) |

## §9 — SURFACED for operator (decide / ratify)

1. **preprint-extraction cloud job (C-5, FLAGGED).** `preprint-extraction.yml` does not
   run on a bare main push and this environment has no write token to fire
   `workflow_dispatch`. To observe the cloud job green, dispatch it
   (`confirm_deploy=false`) or open a path-scoped PR. The pipeline was validated
   LOCALLY (byte-identical extraction + latexmk clean compile) in the pinned toolchain;
   the determinism gate is process-isolated + hash-seed-independent, so it is
   hardware-independent.
2. **Ratify the § 5 SHIFTs** (de-Docker'd TinyTeX pin; `[scope].used_by_sims` schema;
   § 12 minimal-fallback bib; frontier-story reframed for single-stack; shared-file =
   perf-ledger-only landed pattern) into the plan if they should persist for post-phase
   coverage.
3. **Phase-5 formal close is a SEPARATE pass.** This sub-phase is the FINAL Phase-5
   pipeline but does NOT compose the Phase-5 landing audit or propose `v0.5.0-phase-5`
   (per the dispatch scope + spec § 7.12 operator-only tag pushing). The operator runs
   the close pass (aggregate the five sub-phase audits; `verify_evidence.py`;
   append-only check vs `v0.4.0-phase-4`; propose + push the tag).
4. **Post-phase preprint coverage** — extend `discover_qualifying_sims()` by giving each
   additional `preprint:true` sim a vendored upstream (`MANIFEST.toml` `used_by_sims`)
   + an MMS/GCI story; the extractor is otherwise sim-agnostic (a robust cross-stack
   equivalence-table path is retained, DEFERRED for unusual shapes).

## §10 — Closing

Sub-phase 5.5 (preprint-extraction) build-and-validate is COMPLETE; verdict
**SHIFTED**. The R4 canonical (`pinn-poisson`) was driven through the
deterministic-extraction + clean-compile gate: extraction is **byte-identical** across
two separate processes (`cmp` == 0; main.tex sha256 `528ed860…`, references.bib sha256
`9da6aa99…`; hash-seed-independent — the named trap pre-empted by sort-before-emit, not
tolerated), and the preprint **compiles clean** (latexmk exit 0, zero unresolved
`\ref`/`\cite`). **NO PDF was committed** (the source is the artifact; the PDF builds
on demand). Integrity held 0 HF / 14 SW; the render_similarity + variant HARD floors
are UNAFFECTED (no sim-code touched). The **deploy job stayed gated OFF** (no publish).
Five landed-reality SHIFTs (§ 5) and one FLAGGED CI-observability limit (§ 9.1) are
surfaced for operator ratification. This sub-phase pushed NO tag (I7); the Phase-5
formal close (`v0.5.0-phase-5`) is the operator's separate pass.
