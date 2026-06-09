"""Per-category render presets (phase plan § 6.4 — one per diagnostic Tier-2
category: particle / scalar-field / vector-field / closed-form).

Phase 5 ships ONE canonical sim (``eulerian-smoke``, a volumetric scalar density
field), so only the ``scalar-field`` preset is exercised and validated. The other
categories are EXTENSION POINTS for post-phase coverage using the same pipeline;
they are intentionally not stubbed with fake materials — a caller that requests an
unbuilt category gets an explicit error rather than a silent default.
"""

from __future__ import annotations

from . import scalar_field

# Sim-category (from the capture manifest / spec sheet) → preset module.
_PRESET_BY_CATEGORY = {
    "scalar-field": scalar_field,
    "volumetric-grid": scalar_field,  # eulerian-smoke's spec category
}

# Categories the pipeline knows about but has not yet built a preset for. Listed
# so the error message can distinguish "unknown category" from "deferred".
_DEFERRED_CATEGORIES = ("particle", "vector-field", "closed-form")


def get_preset(category: str):
    """Resolve a category to its preset module, or raise with a clear reason."""
    preset = _PRESET_BY_CATEGORY.get(category)
    if preset is not None:
        return preset
    if category in _DEFERRED_CATEGORIES:
        raise NotImplementedError(
            f"render preset for category '{category}' is deferred to post-phase "
            "coverage (Phase 5 ships only the scalar-field canonical eulerian-smoke)"
        )
    raise KeyError(f"unknown render category '{category}'")
