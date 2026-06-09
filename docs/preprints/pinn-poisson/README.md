# Preprint — pinn-poisson

Academic-preprint LaTeX **source** extracted from
`docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md` by the Phase-5 sub-phase 5.5
`preprint-extraction` pipeline (the operator-ratified v9 R4 canonical preprint sim).

| File | Role |
|---|---|
| `main.tex` | The preprint body (§ 6.5 section map: Introduction / Method / Mathematical Formulation / Evaluation). |
| `references.bib` | Bibliography (vendored `references/PhysicsNeMo-PINN/MANIFEST.toml` + spec-ref § 12). |
| `bitphysics-preprint.cls` | Permissive `article`-derived class (LPPL, arXiv-safe). |
| `figures/` | Figure placeholder (this spec sheet carries no PNG figures). |
| `reproducibility-report.json` | The gate result: byte-identical extraction + latexmk clean compile. |

**No PDF is committed** — the workflow builds it on demand (no-binary-artifact
discipline). To build it locally in the pinned TeX toolchain:

```
latexmk -pdf -interaction=nonstopmode main.tex
```

The artifact is verified by the **deterministic-extraction + clean-compile** gate
(the § 3.8 surrogate; the source sim's physics was already gated through Phase-3
acceptance). Regenerate with:

```
python tools/productization/preprint-extraction/extract.py \
    docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md \
    --out docs/preprints/pinn-poisson/main.tex
```

Output is byte-identical across runs (sort-before-emit; hash-seed-independent).
