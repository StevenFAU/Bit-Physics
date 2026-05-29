---
date: 2026-05-29T03-15-00Z
author: phase-3 mass-spring-cloth stage-1c (Claude Code)
subject: Phase 3 task-5 mass-spring-cloth STAGE 1c (closing sweep) — canonical 128x128 capture + schema-corpus fixture + perf-ledger gate-12 + LFS push (GitHub + R2) + S.5 CI sweep
verdict: CONFIRMED
head_sha: c4ba2a1
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
canonical_capture_h5_oid: 7954eb6c9407528b5d58470fc1d09f18a89a77540179db48eb0bff9a68cd290b
fixture_h5_oid: 0df87788c393d0fa2eb395f3be2c7e984bf0c2c130f3b5383a6beca836d2c70a
evidence_paths:
  - captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.json
  - tests/fixtures/legacy-captures/phase-3-mass-spring-cloth.json
  - docs/perf-ledger.md
evidence_hashes:
  captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.json: sha256:6ed0ecb40abcc19934ced9f35921ab1e64974366ed0c0f09ec35917884f00e25
  tests/fixtures/legacy-captures/phase-3-mass-spring-cloth.json: sha256:451a1d179373b940233fc548b985a14fadfebebe8b2b8453fb48acc1667580b6
  docs/perf-ledger.md: sha256:9332ae0a8013a16e268b8174ac41baaf16e542c939d146d376558548e081f103
---

# Phase 3 — mass-spring-cloth (task-5) — Stage 1c audit (closing sweep)

> Canonical capture + schema-corpus fixture + perf-ledger (gate-12) + LFS push
> (GitHub + R2, §Q.5) + §S.5 full-workflow CI sweep. Verdict **CONFIRMED** —
> Stage 2 (landing audit) unblocked.

## §R — integrity (two-field, measure-don't-copy)

`uv run python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**
(invariant HELD); digest `b7460150…e6abb15e` (live-measured; drifted from the
Stage-0 anchor `f5b7eea1…` as EXPECTED — this sub-phase added golden tables, a
schema-corpus fixture, a vendored reference, and the determinism/tolerance rows).
The count is the invariant; the digest is informational. [FACT]

## Canonical capture (gate-9) + schema-corpus fixture

- `captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.{h5,json}` —
  128×128 left-edge-pinned flag under gravity (0,-9.81,0) + steady wind (0,0,3.0),
  1000 steps / 11 captured frames, `positions` + `velocities` f64 fields. Generated
  in 54.32 s (single-invocation symmetric serial GS, lavapipe). `.h5` LFS-tracked,
  OID `7954eb6c…68cd290b`; `.json` sha256 `6ed0ecb4…84f00e25`. Loads cleanly via the
  testkit reader; manifest schema-valid; determinism `claimed=bit-exact-same-hw`
  (registry-consistent, gate-10). [FACT]
- `tests/fixtures/legacy-captures/phase-3-mass-spring-cloth.{h5,json}` — small (8×8,
  20 steps) schema-corpus fixture; `.h5` OID `0df87788…36d2c70a`; `.json` sha256
  `451a1d17…667580b6`. `test_legacy_captures_corpus` 2/2 PASS (round-trip + schema). [FACT]

## perf-ledger (gate-12)

Row appended (NOT silently omitted — S2-RD2C1 lesson): `mass-spring-cloth | cpp
(Vulkan) | flag-wind-128x128-seed42-step1000 | 54.32 | i7-12700KF-linux-6.17 |
… | 2026-05-29 | baseline`. First `soft-body` / first NEW Stack-C perf row. [FACT]

## §Q.5 — LFS push (GitHub + R2, same-shell)

- GitHub: `git -c lfs.standalonetransferagent= push origin main` → `e9e83a0..c4ba2a1`,
  both LFS objects uploaded to GitHub LFS (8.7 MB). [FACT]
- R2 mirror: `source tools/lfs/setup-lfs-s3-local.sh && git lfs push --object-id
  origin <oids>` (same shell) → both objects uploaded (7.6 MB). **No STOP-LFS-PUSH**
  — the r2-credentials-durability fix (creds in the same shell as the push) works. [FACT]

## §S.5 — full-workflow CI sweep at HEAD c4ba2a1

`gh run list --commit c4ba2a1`: structure / audit-append-only / ts-strict /
tolerance-budget-check / equivalence / mutation-testing GREEN; cpp-strict /
python-strict / determinism / integrity — see the SWEEP RESULT line below.

SWEEP RESULT: **ALL 10 workflows GREEN** at `c4ba2a1` — structure,
audit-append-only, ts-strict, tolerance-budget-check, equivalence,
mutation-testing, integrity, cpp-strict (1m38s — built the C++ tree on a fresh
ubuntu runner, LFS-pulled the cloth capture, and ran the cloth ctests gate-3/4/11
GREEN), determinism, python-strict. Zero red, zero in-progress. No STOP-CI-RED. [FACT]

## Verdict

**CONFIRMED.** integrity 0 HF / 14 SW; canonical capture + fixture committed +
LFS-pushed (GitHub + R2); perf-ledger gate-12 row; §S.5 all-green at HEAD. Stage 2
(landing audit) unblocked.
