# Schema-version backward-compat regression corpus

Per `docs/architecture.md` § 2.7 + § 2.12. Append-only corpus of canonical
captures that Phase 4 WU-A's schema-version bump (and any later bump) must
round-trip through the post-bump reader.

## Conventions

- Filename pattern: `phase-<N>-<sim>[-<variant>].h5` + sidecar `.json`.
- Append-only: deletions or renames break the regression guarantee.
- Phase 0 Block 8 seeds the first entry (RD-2D canonical capture).
- Phase 4 WU-A is the first schema bump (1.0.0 → 1.1.0). Its acceptance
  test loads every entry here through the 1.1.0 reader and asserts
  round-trip success.

## Entries

_(Empty at Block 1; Block 8 lands `phase-0-rd-2d-ref.h5` + `.json`.)_
