# `docs/planning/` — long-horizon planning artifacts

This directory holds **planning artifacts** that are *not* phase plans: documents that survey the
design space, frontier industry/research context, and forward integration options without
committing execution. They do not amend `docs/architecture.md` and do not gate any phase. Phase
plans live in `docs/phases/`; conventions in `docs/conventions/`; audits in `docs/_audits/`.

## Inaugural entry

- **`bit-physics-master-catalog.md`** — *Bit-Physics Master Catalog v2.0* (5,252 lines). A
  standalone survey of GPU-simulation phenomena, frontier tooling, composition affinities, the
  three-tier accessibility model, and Phase 6+ integration. Its own posture line states it is
  *"a planning artifact, not a phase plan … It does not amend `docs/architecture.md`"*
  (`docs/planning/bit-physics-master-catalog.md:8`). Vendored verbatim (byte-identical to the
  operator-provided source) at `sub-phase-lfs-architecture` Stage 0 to resolve charter UNKNOWN-1,
  so its Part V tier architecture (`docs/planning/bit-physics-master-catalog.md:3427` § 41) and
  CI-strategy sections (`docs/planning/bit-physics-master-catalog.md:3639` § 45) can be cited as
  in-repo references rather than as off-repo `[CATALOG — not in repo]` tags.

## Citing the catalog

It is a planning artifact, **not** a normative spec. Cite it for design context and tier
vocabulary; cite `docs/architecture.md` for normative requirements. The catalog explicitly does
not amend the spec.
