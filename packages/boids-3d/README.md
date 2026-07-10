# Boids 3D / Murmuration Lab

The web build is a GPU-scale, starling-inspired murmuration with exact dense-grid
candidate ranges, seven-neighbor topological steering, bounded turning, visible
banking, propagating threat response, procedural bird meshes, and interactive
attract/repel/falcon/gust tools. It supports 4,096–65,536 live birds and keeps
the frozen Reynolds-1987 implementation as an isolated canonical capture path.

The model, research basis, GPU architecture, and product decisions are in the
[Murmuration Lab research and shipping spec](web/feature-expansion-spec.md).
The frozen canonical contract remains in
[`docs/sim-specs/agent-based/boids-3d/`](../../docs/sim-specs/agent-based/boids-3d/).

## Run

```bash
cd packages/boids-3d/web
npm run dev
```

## Validate

```bash
uv run pytest packages/boids-3d/tests -q
cd packages/boids-3d/web && npm run typecheck && npm run build
```
