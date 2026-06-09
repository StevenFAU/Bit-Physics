# Productization — preprint-extraction

> Phase 5 sub-phase 5.5. Build-and-validate an academic-preprint LaTeX source for the
> canonical preprint sim. NO publish — the `deploy` job in `preprint-extraction.yml`
> is gated off; the preprint **source** (`main.tex` + `references.bib` + class) is
> committed to `docs/preprints/<sim>/`, and **no built PDF** is committed.

## 1. Purpose

Turn a committed `spec-ref.md` reference spec sheet into a reproducible academic
preprint LaTeX source, and verify it the way a preprint artifact *can* be verified:
by **deterministic extraction** and **clean compilation**, not by an analytic anchor.
The source sim's physics was already gated through Phase-3 acceptance (bootstrap § 3.8
is N/A here, Appendix F) — the preprint is a *re-presentation* of that verified work,
so its productization gate is "does extraction reproduce byte-for-byte, and does it
compile clean". Phase 5 ships the pipeline plus ONE canonical sim (`pinn-poisson`,
v9 R4); remaining sims are post-phase coverage using the same pipeline.

## 2. Pipeline shape

```
spec-ref.md  (one sim's reference spec sheet)
   │  extract.py            § 6.5 section/bib map -> main.tex + references.bib + class
   ▼
docs/preprints/<sim>/{main.tex, references.bib, bitphysics-preprint.cls, figures/}
   │  pipeline.py           run extract.py TWICE in SEPARATE processes
   ▼                        DETERMINISM gate: the two main.tex are byte-identical (cmp == 0)
   │  latexmk (pinned TeX)  CLEAN-COMPILE gate: exit 0, no unresolved \ref/\cite
   ▼
preprint PDF  (built on demand by the workflow / runbook — NEVER committed)
```

`extract.py` maps `spec-ref.md` sections to LaTeX (phase plan § 6.5):

| spec-ref section | LaTeX |
|---|---|
| § 1 Scope | `\section{Introduction}` |
| § 3 Algorithm | `\section{Method}` |
| § 4 Algebraic form | `\section{Mathematical Formulation}` |
| § 6 Verification posture | `\section{Evaluation}` (MMS / GCI / cross-stack tables if present) |
| § 12 References | `references.bib` entries (with the vendored `references/<upstream>/MANIFEST.toml`) |

§ 13 (Productization status) and the other sections are repo metadata, NOT part of
the preprint. Markdown is converted faithfully: inline `$...$` math is kept; a complete
Unicode→LaTeX table maps math glyphs so the output is **pure ASCII** (pdflatex-clean,
no reliance on `inputenc`); tables → `tabular`; fenced blocks → typewriter quotes;
`-`/`N.` lists → `itemize`/`enumerate`; PNG figures in scope → `figures/` + `\includegraphics`.

## 3. The verification gate (NOT "extraction ran" / "PDF built")

- **Deterministic-extraction gate (the real one; § 3.8 surrogate, STEP-5a).** Run
  `extract.py` on the same `spec-ref.md` **twice in separate processes** (distinct
  `PYTHONHASHSEED`); the two `main.tex` (and `references.bib`) outputs MUST be
  **byte-identical** (`cmp` == 0). `extract.py` **sorts every collection before
  emission** — the bibliography is emitted in sorted cite-key order, the section order
  is a fixed list — so the output is a pure function of the input. **The named trap**
  (per the plan): a non-byte-identical emit is almost always hashed-collection
  iteration order (BibTeX entries in dict/set order). **The fix is sort-before-emit,
  NOT loosening the gate to a diff-tolerant compare.** A nondeterministic extraction
  is fixed by sorting or surfaced to the operator — never tolerated.
- **Clean-compile gate.** `latexmk -interaction=nonstopmode` on the extracted
  `main.tex` in the pinned TeX toolchain must **exit 0 with NO unresolved `\ref` /
  `\cite` warnings**. A compile that emits unresolved-reference/citation warnings is
  NOT a pass. The bibliography uses `\nocite{*}` + `\bibliographystyle{plain}`, so
  every extracted reference resolves.
- **No-binary-artifact discipline.** The workflow builds the PDF on demand; the repo
  commits `main.tex` + `references.bib` + the class + `figures/`, **never the PDF**.

## 4. Qualifying sim criteria (§ 6.5)

All must hold (measured at probe time):

- `preprint: true` in the spec-ref § 13 productization block (not opted out).
- `spec-ref.md` exists with sections 1, 3, 4, 6, 12 populated.
- At least one vendored upstream in `references/` whose `MANIFEST.toml`
  `used_by_sims` includes this sim (the BibTeX source).
- An MMS / GCI / convergence-order verification story.
- A frontier-variant story (per spec § 5 frontier columns).

`discover_qualifying_sims()` measures the `preprint:true` pool live, applies the
load-bearing criteria, and returns the single R4 canonical (`pinn-poisson`). Other
`preprint:true` sims currently miss a load-bearing criterion (most have no vendored
upstream and/or no MMS/GCI story) and are reported non-qualifying (post-phase coverage).

## 5. Sharding scheme

Not required; the matrix is a single canonical sim and extraction + compile is < 2 s.

## 6. Failure modes

- **CI red on `build-and-validate` — determinism gate.** The extraction is
  nondeterministic: `main.tex` differs across the two runs. **This is a real bug** —
  diagnose the hashed-collection iteration source and **sort it before emit**. Do NOT
  loosen the gate. (The smoke suite's `test_extraction_byte_identical_across_processes`
  catches this without any TeX toolchain.)
- **CI red on `build-and-validate` — clean-compile gate.** `latexmk` exited non-zero
  or emitted unresolved `\ref`/`\cite`. Inspect the converted LaTeX (a Unicode glyph
  not in the map, a malformed table, a missing bib entry) and fix the converter; do
  NOT widen the gate.
- **CI red on `deploy`.** Should not happen accidentally — gated on
  `workflow_dispatch` + `confirm_deploy == 'true'`.
- **Re-running on the same SHA.** Safe and idempotent: extraction is a pure function
  of the spec sheet; the committed source is byte-stable.
- **Per-sim DEFERRED.** A sim with an unusual cross-stack equivalence-table shape
  (§ 6.5 anticipated problems) is DEFERRED with the reason recorded; the sim owner
  extends the converter or simplifies the spec table.

## 7. Go-live runbook (post-phase; operator)

1. Extend coverage by ensuring a new `preprint: true` sim satisfies the § 4 criteria
   (vendored upstream + MMS/GCI story + populated sections), then run the pipeline.
2. To build the PDF, run `latexmk -pdf docs/preprints/<sim>/main.tex` in the pinned
   TeX toolchain (CI builds it as an upload artifact; the PDF is never committed).
3. To submit to arXiv, run the `preprint-extraction.yml` `workflow_dispatch` with
   `confirm_deploy=true` (the otherwise-gated-off `deploy` job) and follow arXiv's
   submission flow with the `main.tex` + `references.bib` + class + `figures/` bundle.

## 8. Open issues / DEFERRED items (§ 0.3 SHIFTs)

- **TeX toolchain — no Docker.** The plan names a "TeX Live container image pinned to
  digest"; this environment has no Docker (same landed reality as 5.2's de-Docker'd
  CMake and 5.4's de-Docker'd Blender SHIFTs). The toolchain is a **pinned portable
  TeX Live (TinyTeX) tarball, verified by sha256 digest** (`preprint-extraction.yml`
  `env:`), giving the same pin guarantee with no container runtime. Perf-ledger env
  label: `preprint-extraction-texlive-<digest>`.
- **LaTeX class.** Per the plan's "permissively-licensed standard class", the class
  `bitphysics-preprint.cls` is a thin wrapper over the standard `article` class (LPPL,
  arXiv-safe) loading only widely-available packages — `\bibliographystyle{plain}` is
  the TeX Live built-in (no custom `.bst` authored; a custom style is post-phase).
- **§ 12 references → minimal-fallback entries.** The vendored-upstream entry is fully
  structured from its `MANIFEST.toml`; the prose § 12 reference bullets are emitted as
  minimal `@misc` entries (title + author + year where parseable, brace-protected so
  BibTeX's title-lowering can't corrupt them) per the § 6.5 anticipated-problems
  "graceful fallback to minimal entry". Richer structured parsing is post-phase.
- **Figures.** The `pinn-poisson` spec sheet has no PNG figures, so `figures/` is an
  empty placeholder; the converter copies + `\includegraphics`'s any figures a future
  sim's spec sheet carries.

## 9. Extending coverage (post-phase contributor note)

(a) **Prerequisites.** The new sim must have `preprint: true` in spec-ref § 13, a
`spec-ref.md` with §§ 1/3/4/6/12 populated, at least one vendored upstream in
`references/` whose `MANIFEST.toml` `used_by_sims` lists the sim, and an MMS/GCI/
convergence story in § 6. (b) **Wiring.** No config change — `discover_qualifying_sims()`
measures the `preprint:true` pool live; once the sim satisfies § 4 it is picked up.
(c) **Validation.** Run `pipeline.py validate --artifacts /tmp/out --sim <sim>` in the
pinned TeX toolchain and confirm `overall_status == pass` (byte-identical extraction +
clean compile) before opening a PR; if extraction is non-deterministic, fix
sort-before-emit in `extract.py` — never loosen the gate.
