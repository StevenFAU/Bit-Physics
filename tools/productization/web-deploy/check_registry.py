#!/usr/bin/env python3
"""Sim-registry drift check (2026-10 portfolio review, finding 9).

`sims.json` is the one list of published browser sims. Before it existed the
same list lived in six hand-kept places, and the last two sims to land each
missed three of them: the link checker silently skipped Canyon Lab, its landing
card shipped a still where every other card loops, and flow-lenia + Canyon Lab
never reached the splash reel. This script fails (exit 1) on any disagreement.

Stdlib only, so it runs in the web-deploy `discover` job's bare uv env:

    python tools/productization/web-deploy/check_registry.py

Checks, all against sims.json:
  * every registered sim has packages/<sim>/web/package.json, and every
    packages/*/web with a package.json is registered;
  * pipeline.py GATE_KIND covers exactly the registry;
  * check-links / make-posters / make-loops / make-splash read sims.json, and the
    per-sim poster + loop configs cover exactly the registry;
  * the splash reel films every sim not marked "splash": false, and none that is;
  * the landing page has exactly one card per sim, each a looping <video> whose
    committed <sim>.png poster and <sim>.webm loop exist.
"""

from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parent  # tools/productization/web-deploy
REPO = TOOL.parents[2]
PAGES = TOOL / "web" / "pages"
ASSETS = PAGES / "assets"


def load_registry() -> list[dict]:
    data = json.loads((TOOL / "sims.json").read_text(encoding="utf-8"))
    return list(data["sims"])


def _js_object_keys(src: str, const_name: str) -> set[str]:
    """Top-level keys of `const NAME = { ... };` in a generator script."""
    m = re.search(rf"^const {const_name} = \{{\n(.*?)^\}};", src, re.S | re.M)
    if not m:
        raise ValueError(f"could not find `const {const_name} = {{ ... }};`")
    return set(re.findall(r'^  "?([a-z0-9-]+)"?: \{', m.group(1), re.M))


def _gate_kind_keys() -> set[str]:
    """GATE_KIND keys read statically from pipeline.py (no import side effects)."""
    tree = ast.parse((TOOL / "pipeline.py").read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "GATE_KIND" for t in node.targets
        ):
            assert isinstance(node.value, ast.Dict)
            return {k.value for k in node.value.keys if isinstance(k, ast.Constant)}
    raise ValueError("GATE_KIND not found in pipeline.py")


def check() -> list[str]:
    problems: list[str] = []

    def agree(label: str, found: set[str], expected: set[str]) -> None:
        missing, extra = sorted(expected - found), sorted(found - expected)
        if missing:
            problems.append(f"{label}: missing {missing}")
        if extra:
            problems.append(f"{label}: not in sims.json {extra}")

    sims = load_registry()
    names = [s["name"] for s in sims]
    registry = set(names)
    if len(names) != len(registry):
        problems.append(
            f"sims.json: duplicate names {sorted(n for n in registry if names.count(n) > 1)}"
        )

    on_disk = {
        p.parent.parent.name for p in (REPO / "packages").glob("*/web/package.json")
    }
    agree("packages/*/web", on_disk, registry)
    agree("pipeline.py GATE_KIND", _gate_kind_keys(), registry)

    readers = {
        "check-links.mjs": PAGES / "check-links.mjs",
        "make-posters.mjs": ASSETS / "make-posters.mjs",
        "make-loops.mjs": ASSETS / "make-loops.mjs",
        "make-splash.mjs": ASSETS / "make-splash.mjs",
    }
    src = {k: p.read_text(encoding="utf-8") for k, p in readers.items()}
    for label, text in src.items():
        if "sims.json" not in text:
            problems.append(f"{label}: does not read sims.json")

    agree(
        "make-posters.mjs SIMS",
        _js_object_keys(src["make-posters.mjs"], "SIMS"),
        registry,
    )
    agree(
        "make-loops.mjs SIMS", _js_object_keys(src["make-loops.mjs"], "SIMS"), registry
    )

    clips = re.search(
        r"^const CLIPS = \[\n(.*?)^\];", src["make-splash.mjs"], re.S | re.M
    )
    filmed = set(re.findall(r'sim: "([a-z0-9-]+)"', clips.group(1))) if clips else set()
    wanted = {s["name"] for s in sims if s.get("splash", True)}
    agree("make-splash.mjs CLIPS (sims not marked splash:false)", filmed, wanted)

    index = (PAGES / "index.html").read_text(encoding="utf-8")
    cards = re.findall(r'<a class="card" href="\./sims/([a-z0-9-]+)/', index)
    if len(cards) != len(set(cards)):
        problems.append(
            f"index.html: duplicate cards {sorted(c for c in set(cards) if cards.count(c) > 1)}"
        )
    agree("index.html cards", set(cards), registry)
    for name in names:
        for ext in ("png", "webm"):
            if not (ASSETS / f"{name}.{ext}").exists():
                problems.append(f"assets/{name}.{ext}: missing")
        if f'data-src="./assets/{name}.webm"' not in index:
            problems.append(
                f"index.html: {name} card is not a looping <video> of assets/{name}.webm"
            )

    return problems


def main() -> int:
    problems = check()
    if problems:
        print(
            "sim registry drift (tools/productization/web-deploy/sims.json):",
            file=sys.stderr,
        )
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print(f"sim registry OK: {len(load_registry())} sims agree across every list")
    return 0


if __name__ == "__main__":
    sys.exit(main())
