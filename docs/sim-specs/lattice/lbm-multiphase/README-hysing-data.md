# Hysing et al. 2009 rising-bubble reference data

Raw benchmark quantity time series from the TU Dortmund FeatFlow benchmark page
(http://wwwold.mathematik.tu-dortmund.de/~featflow/en/benchmarks/cfdbenchmarking/bubble.html),
retrieved 2026-07-10. Columns: time | bubble mass-area | circularity |
center-of-mass y | rise velocity (per the benchmark file-format table).

- c1g1l7.txt — test case 1, group 1 (TU Dortmund TP2D), finest level (the primary golden)
- c1g2l3.txt — test case 1, group 2 (EPFL FreeLIFE), finest published
- c1g3l4.txt — test case 1, group 3 (Uni Magdeburg MooNMD), finest published
- c2g1l8.txt — test case 2, group 1 (TP2D), finest (pre-breakup segment quantitative only)
- c2g2l3.txt / c2g3l4.txt — test case 2, groups 2/3 (cross-code spread reference)

Reference paper: Hysing, Turek, Kuzmin, Parolini, Burman, Ganesan, Tobiska,
"Quantitative benchmark computations of two-dimensional bubble dynamics",
Int. J. Numer. Meth. Fluids 60:1259-1288 (2009), DOI 10.1002/fld.1934.
See spec-ref.md section 4 golden G. Committed PLAIN (not LFS) per landing-asset convention.
