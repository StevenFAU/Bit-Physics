# Phase 5 preprint-extraction — Pre-implementation probe

## Front matter

| | |
|---|---|
| Sub-phase | 5.5 — preprint-extraction (academic-preprint LaTeX source) |
| Probe date (UTC) | 2026-06-09T02:00Z |
| Author | Phase 5 preprint-extraction agent (Claude Code) |
| Method | MEASURED live at HEAD `09fb72a` (#8); FACT = ran/read/measured, INFERENCE = reasoned |
| Scope | build-and-validate ONLY — deploy gated off (§ 4.5); preprint source committed, NO PDF, no publish, no tag (I7) |

## § 1 — Canonical-sim selection (§ 4.9 / § 6.5 criteria, R4-ratified)

**MEASURED `preprint:true` pool** (`preprint: true` in spec-ref § 13, **13 sims**,
via `pipeline.py discover`): 3dgs-mpm, articulated-pedagogical, eulerian-smoke,
ising-classical, lattice-boltzmann-d3q19, lenia, mass-spring-cloth, mpm-multimaterial,
neural-ca, **pinn-poisson**, reaction-diffusion-2d, reaction-diffusion-3d, sph-water.

**Canonical = `pinn-poisson`** (operator-ratified v9 R4). MEASURED § 6.5 criteria
satisfaction (`pipeline._criteria`):

| § 6.5 criterion | pinn-poisson | Evidence (measured) |
|---|---|---|
| `preprint: true` § 13 (not opted out) | ✅ | `docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md` § 13 |
| spec-ref §§ 1/3/4/6/12 populated | ✅ | `parse_sections` — all five non-empty |
| ≥1 vendored upstream in `references/` | ✅ | `references/PhysicsNeMo-PINN/MANIFEST.toml` `used_by_sims = ["learned-dynamics/pinn-poisson"]` |
| MMS / GCI / convergence-order story | ✅ | § 6 "MMS-grade order check … observed discrete-L2 order ≈ 2 (`O(h²)`)" |
| frontier-variant story (§ 5 columns) | ⚠ REFRAMED | single-stack; spec § 9 "parent-vs-frontier REFRAMED to the invariant posture" — not a literal "frontier" column. Treated as informational (R4 ratified the pick); see § 6 C-3 |

**Non-qualifying `preprint:true` sims** (reported to stderr; load-bearing miss): most
lack a vendored upstream whose `MANIFEST.toml` `used_by_sims` lists them (reaction-
diffusion-2d/3d, mpm-multimaterial, lattice-boltzmann-d3q19, sph-water, eulerian-smoke),
and/or an MMS/GCI story (neural-ca, ising-classical, 3dgs-mpm, articulated-pedagogical,
mass-spring-cloth). Post-phase coverage extends the pipeline as those sims gain the
prerequisites. This matches v9 R4: **5.5 canonical = `pinn-poisson`**.

## § 2 — Testkit / framework API surface

- **`spec-ref.md` section parser** (`extract.parse_sections`): splits on `## N. Title`
  headers; § 6.5 map is the fixed list `[1→Introduction, 3→Method, 4→Mathematical
  Formulation, 6→Evaluation]`.
- **Vendored-upstream BibTeX source** (`references/<upstream>/MANIFEST.toml`):
  on-disk schema MEASURED — `[upstream]` table carries `name, version, sha, url,
  license`; **`used_by_sims` lives under `[scope]`** (NOT `[upstream]`); `[vendoring]`
  carries `fetched_utc` (the year source). The extractor reads these by key.
- **Equivalence-data reader (Contract A→T).** pinn-poisson is **single-stack** (§ 9
  "N/A — single-stack; no gate-14, no cross-stack budget"), so there is no cross-stack
  equivalence table to read; the § 6 Evaluation tables are the analytic-anchor +
  convergence-order tables, rendered as `tabular`.

## § 3 — Existing CI workflow inventory

17 workflows under `.github/workflows/`; the new `preprint-extraction.yml` filename is
**non-clashing** (confirmed `ls`). It triggers on `push: tags ['preprint-v*']`,
path-scoped `pull_request`, and `workflow_dispatch` (mirrors render-passes /
pypi-release / binary-release). Bare-main-push does NOT trigger it (same posture as the
other productization workflows — see § 6 C-4).

## § 4 — External-tool current state

- **LaTeX class:** standard `article` (LPPL, arXiv-safe permissive base; phase plan
  § 6.5). `bitphysics-preprint.cls` is a thin `\LoadClass[11pt]{article}` wrapper with
  widely-available packages only (amsmath, amssymb, graphicx, geometry, parskip,
  hyperref). MEASURED present in the pinned TeX Live via `kpsewhich`.
- **BibTeX style:** `plain` (TeX Live built-in `.bst`); no custom style authored
  (post-phase). MEASURED: `plain.bst` lowercases/purifies titles, so bib values are
  brace-protected and carry no fragile macros (the `\S`→`\s` corruption was found and
  fixed during the build).
- **TeX toolchain (de-Docker'd § 0.3 SHIFT):** pinned portable **TinyTeX v2026.06**
  (TeX Live 2026; latexmk 4.88, pdfTeX 1.40.29, bibtex 0.99e), tarball **sha256
  `73c8cc30550aa04fa0bfcc171ade1e8506721885f911ecf5eb9261d50413d63a`** (the digest
  pin), located locally via `$BIT_PHYSICS_LATEXMK`; the workflow downloads + verifies
  the same tarball. No Docker (matches 5.2/5.4 de-Docker pattern).

## § 5 — Wall-clock estimate for the smoke matrix

One canonical sim. MEASURED end-to-end `pipeline.py validate` (extract ×2 in separate
processes + latexmk full build incl. bibtex) ≈ **0.76 s** on `i7-12700KF-linux-7.0`.
No sharding required (§ 4.12 budget is 60 min).

## § 6 — Verdicts (four-state)

| Assumption (phase plan § 6.5) | Verdict | Notes |
|---|---|---|
| pinn-poisson is the qualifying canonical (R4) | **CONFIRMED** | 4/5 load-bearing criteria measured PASS; selected by `discover` |
| spec-ref §§ 1/3/4/6/12 → LaTeX sections + bib | **CONFIRMED** | § 6.5 map implemented + smoke-asserted |
| § 12 + MANIFEST.toml → `references.bib` | **SHIFTED** | `used_by_sims` is under `[scope]` not `[upstream]` (C-1); § 12 prose → minimal `@misc` fallback (C-2) |
| TeX Live toolchain = pinned Docker image | **SHIFTED** | de-Docker'd pinned portable TinyTeX tarball, sha256-verified (C-4 env) |
| frontier-variant story required | **SHIFTED** | reframed for the single-stack canonical; made informational, not load-bearing (C-3) |
| deterministic extraction is achievable | **CONFIRMED** | sort-before-emit → byte-identical across PYTHONHASHSEED 1 vs 999 (the named trap pre-empted) |
| clean compile achievable (no unresolved cite) | **CONFIRMED** | `\nocite{*}` + `plain` + pure-ASCII output → latexmk exit 0, 0 unresolved |
| cross-stack equivalence table extraction | **DEFERRED** | N/A for the single-stack canonical (§ 9); robust-extractor path retained for post-phase multi-stack sims |

**Contradictions collector (C-#):** C-1 `used_by_sims` table location; C-2 § 12
minimal-fallback entries; C-3 frontier-story reframed (single-stack); C-4 de-Docker'd
TeX toolchain. All four are landed-reality SHIFTs, documented; none blocks the gate.
