# Sparse-topology diagnostics (Phase 4.0 WU-B)

Tier-2 sparse-aware diagnostics for the Phase 4.2 sparse-variant sims. They live
inside the existing `scalar_field` and `vector_field` substacks — **not** a new
substack (spec § 3.3 fixes tier-2 at exactly four: particle, scalar_field,
vector_field, closed_form). The shared primitives are in
`diagnostics.tier2._sparse_common`.

## Representation

All sparse diagnostics operate on a dense boolean **active-cell mask** — the
in-memory form of the capture-manifest `active_mask` field (schema 1.1.0, spec
§ 4.3). `common_warp.sparse.ActiveMask` is the producer-side handle.

## Primitives (`diagnostics.tier2._sparse_common`)

- `active_cell_count(mask) -> int` — number of active cells.
- `sparsity_ratio(mask) -> float` — active fraction in `[0, 1]`.
- `topology_change_detected(before, after) -> bool` — True iff the active set
  changed (including a shape change).
- `mask_diff(before, after) -> MaskDiffReport` — cell-wise `added` / `removed` /
  `common` counts + `topology_changed`. Raises on shape mismatch.

## Per-substack field→mask extractors

- `scalar_field.sparse_topology.scalar_field_active_mask(field, *, background, atol)`
  — active where `|field - background| > atol`.
- `vector_field.sparse_topology.vector_field_active_mask(field, *, background, atol)`
  — active where ANY trailing-axis component differs from `background` by `atol`.

Both modules re-export the shared primitives so a caller works entirely within
its substack namespace.

## Relationship to the C++/Warp sparse surface

The active topology originates at write time: the host C++
`bit_physics::nanovdb::SparseVolumeWriter` builds the sparse grid and
`extract_active_mask` yields the sorted active coords + a `topology_hash`. The
Python `common_warp.sparse.ActiveMask.topology_hash()` reproduces that hash
bit-for-bit for the same active set (sorted int32 ijk triples, little-endian,
sha256) — a cross-language consistency anchor. A loaded `wp.Volume`'s
`get_voxel_count` reports *leaf-allocated* voxels (a full 8³ block per touched
leaf), NOT the active count; sparsity must come from the `active_mask` recorded
in the manifest, never inferred from the loaded volume.
