# References

Vendored upstream sources. Read-only per `docs/architecture.md` Appendix D
§ D.8 item 12. Vendoring discipline at
[`../docs/testkit/references.md`](../docs/testkit/references.md).

## Layout

```
references/
├── README.md                  # this file
├── papers/                    # frontier paper PDFs + cite.bib + repo-sha.txt
│                              # (Phase 4 pre-dispatch vendors these per
│                              # docs/architecture.md § 12.9).
└── <UpstreamName>/            # one directory per vendored upstream
    ├── LICENSE
    ├── MANIFEST.toml
    └── ...                    # sparse-checkout contents
```

Phase 0 Block 4 vendors the first upstream (SPlisHSPlasH). Subsequent
phases append.
