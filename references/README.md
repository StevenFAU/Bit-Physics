# References

Vendored upstream sources. Read-only per `docs/architecture.md` Appendix D
§ D.8 item 12. Vendoring discipline at
[`../docs/testkit/references.md`](../docs/testkit/references.md).

## Layout

```
references/
├── README.md                  # this file
├── papers/                    # (empty; .gitkeep only). Phase 4 sims CITE frontier
│                              # papers at Stage-0 (web-fetch + DOI/arXiv-id) per
│                              # docs/architecture.md § 12.9 (amended A-8). Paper
│                              # PDFs are NOT vendored (public-MIT redistribution
│                              # risk). Reference-impl repos are vendored only
│                              # where their LICENSE permits (Appendix D.3).
└── <UpstreamName>/            # one directory per vendored upstream
    ├── LICENSE
    ├── MANIFEST.toml
    └── ...                    # sparse-checkout contents
```

Phase 0 Block 4 vendors the first upstream (SPlisHSPlasH). Subsequent
phases append.
