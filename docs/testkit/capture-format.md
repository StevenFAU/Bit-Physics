# Capture format

The canonical representation of simulation state at a single step. Capture
files are the medium of exchange between simulators, between determinism
runs, between cross-stack equivalence checks, between sim and renderer, and
between sim and external analysis tools (spec § 2.7).

## Two-part structure

1. **Manifest** — `<descriptor>.json`, UTF-8 JSON, validated against
   `tools/testkit/schemas/capture-v1.json` (Draft 2020-12).
2. **Payload** — `<descriptor>.h5`, HDF5 file with the layout below.

`<descriptor>` follows the canonical format
`<test-name>-<config>-seed<N>-step<N>` per `architecture.md` Appendix
D § D.2.2 (kebab-case, lowercase, no underscores).

## Manifest fields

```json
{
  "schema_version": "1.0.0",
  "sim":     { "name": "...", "category": "...", "variant": "ref|stack-c|stack-d|diff|sparse|neural|frontier" },
  "stack":   { "name": "...", "version": "...", "build_id": "<commit-sha>" },
  "config":  { "tier": "...", "dims": [...], "dtype": "f32|f64", "seed": 42, "params": {} },
  "run":     { "step_count": 1000, "capture_interval": 10, "wall_clock_seconds": 23.4, "start_utc": "..." },
  "payload": { "format": "hdf5", "path": "...", "checksum": "sha256:..." },
  "determinism": { "claimed": "bit-exact-same-hw|epsilon|non-deterministic", "atomic_ops": false, "subgroup_ops": false }
}
```

`schema_version` is initially `1.0.0`. Bumps are governed by `architecture.md`
§ 2.12 — only Phase 4 WU-A is permitted to bump it.

## HDF5 payload layout

```
/steps/{N}/state/{field_name}        # ndarray per simulated field per captured step
/steps/{N}/diagnostics/{check_name}  # scalar per Tier 1 diagnostic per step
/metadata/                            # replicated manifest fields as attributes
```

## Public Python API

`tools/testkit/capture/` (importable as `capture` when the testkit package
is installed in dev mode). Module surface (pinned in
`docs/phases/phase-0-plan.md` § 3.3.1):

- `CaptureManifest` — dataclass mirroring the manifest schema.
- `StepState` — `step: int`, `state: dict[str, np.ndarray]`, `diagnostics: dict[str, float]`.
- `Capture` — read-only handle; `steps()`, `step(n)`, `field(step, name)`.
- `CaptureDiff` — `bit_exact`, `max_abs_err`, `max_rel_err`, `mismatched_fields`.
- `load_capture(manifest_path)` — load and schema-validate.
- `write_capture(state_iter, manifest_meta, out_dir)` — write payload + manifest.
- `diff_captures(left, right, mode="bit-exact"|"epsilon", rtol=0, atol=0)` — pairwise diff.
- `load_reference_manifest(manifest_path)` — load and schema-validate a vendored-reference TOML manifest (spec § 2.8).

## Cross-stack invariance

The same JSON Schema validates Python-written and TypeScript-written
captures (Block 7's `@bit-physics/common-ts` `CaptureWriter`). The HDF5
payload layout is identical across stacks. The cross-stack invariance gate
(spec § 3.5) verifies that Python can load TS-written captures and vice
versa.
