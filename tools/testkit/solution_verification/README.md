# Solution verification (deferred to Phase 1+)

Per `docs/architecture.md` § 2.3 + spec § 11.1 (Phase 0 ships only code
verification via MMS, golden values, and adjacent harnesses). Solution
verification — Grid Convergence Index via Richardson extrapolation — is
deferred until a sim claims solution-verified status, which Phase 0 does
not.

When a sim claims solution-verified status (research-grade default per
spec § 12.3), this directory ships:

- `gci/harness.py` — multi-resolution runner.
- `gci/richardson.py` — Richardson extrapolation, GCI computation per
  output.
- `gci/report.py` — generates the convergence report.

Until then, the directory exists as a scaffold so phase plans can
reference it without forward-declaring a missing path.
