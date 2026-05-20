# Reference vendoring discipline

Per spec § 2.8. Every upstream that any simulation cites lives at
`references/<UpstreamName>/`, vendored at a specific SHA, with a manifest
that the integrity toolkit's Cat 1 (citations) check can parse.

## Mechanism

**Sparse-checkout is the default mechanism** for vendoring large upstreams.
Full-repo vendoring would bloat the repo by hundreds of MB for upstreams
like SPlisHSPlasH; sparse-checkout vendors only the directory subtree the
portfolio cites. Pattern:

```bash
git clone --no-checkout --filter=blob:none <upstream-url> references/<name>
cd references/<name>
git sparse-checkout init --cone
git sparse-checkout set <cited-subdir-1> <cited-subdir-2> LICENSE README.md
git checkout <pinned-SHA>
```

If sparse-checkout is impractical (kernel sources entangled across the
upstream tree), fall back to full-repo vendoring and document the rationale
in the consuming block's report (Phase 0 Block 4 plan § 7.4 for the first
case).

## Manifest

Each vendored upstream ships a `MANIFEST.toml` validated against
`tools/testkit/schemas/reference-manifest-v1.json`:

```toml
[upstream]
name         = "SPlisHSPlasH"
version      = "<release-tag>"
sha          = "<full-SHA-as-vendored>"
url          = "<canonical-upstream-URL>"
license      = "MIT"
license_file = "LICENSE"

[scope]
purpose         = "Reference for SPH kernel implementations and DFSPH algorithm"
used_by_sims    = ["particle-fluid/sph-water"]
used_by_checks  = ["cat1.upstream-citation", "cat3.cubic-kernel"]

[vendoring]
fetched_utc   = "2026-05-18T..."
fetched_by    = "<author-or-agent-id>"
fetch_command = "git clone ... && git checkout <SHA>"
```

`capture.load_reference_manifest(path)` loads and
schema-validates this file.

## Read-only invariant

Vendored sources under `references/` are **read-only**. Per
`architecture.md` Appendix D § D.8 item 12, an agent that modifies vendored
source is HALTED. Bug fixes flow upstream; the vendoring is updated when
the upstream releases a fix.

## Bumping vendored SHAs

A vendored SHA bump is its own commit per Convention-A. The commit:

1. Updates `references/<name>/` (re-checkout new SHA, refresh sparse paths if
   needed).
2. Updates `references/<name>/MANIFEST.toml` (`sha`, `version`, `fetched_utc`,
   `fetched_by`, `fetch_command`).
3. Touches no consumer code in the same commit; consumer updates land in a
   follow-up commit per Convention-A.
