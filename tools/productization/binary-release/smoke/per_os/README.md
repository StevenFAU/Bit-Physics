# per-OS headless launch harnesses (§ 6.2)

Smoke-launch a built capture binary on each target OS, confirming it runs headless
and emits a manifest. The full spec § 3.8 bootstrap gate (build → run → correctness
round-trip / witness + PBT) lives in `pipeline.py`; these are the lightweight
per-OS launch complements.

| OS | Launcher | Status |
|---|---|---|
| Linux | `launch_linux.sh` | **validated** — lavapipe software Vulkan + LP_NUM_THREADS=0 determinism pin |
| Windows | _(deferred)_ | DEFERRED-to-Phase-6 — needs a per-OS software-Vulkan device + DLL bundling |
| macOS | _(deferred)_ | DEFERRED-to-Phase-6 — MoltenVK/SwiftShader device + the R-CPPB2 cross-build determinism story; unsigned (§ 4.3) |

The bootstrap correctness gate is lavapipe-pinned (deterministic same-host-same-build,
R-CPPB2). Windows/macOS bring-up is scoped to Phase 6, mirroring `cpp-strict.yml`'s
ubuntu-only posture. We do not emit fake-passing win/mac cells.
