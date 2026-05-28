# 3dgs-smoke

The common-3dgs smoke simulator. Loads a small Gaussian-splat scene, renders one
frame with `common_3dgs.render`, writes the frame as a PNG, and writes a Layer-0
HDF5 capture (`neural-rendered` category).

```bash
just run-3dgs-smoke      # render + write artifacts under examples/smoke_3dgs/out/
just test-3dgs           # run the common-3dgs test suite
```

The written capture seeds the schema-corpus fixture
`tests/fixtures/legacy-captures/phase-3-common-3dgs.h5` consumed by Phase-4 WU-A.
