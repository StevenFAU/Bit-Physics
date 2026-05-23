"""Taichi regression-test harness — sub-phase-taichi-integration.

Verification surface for ``docs/common/taichi.md`` § 6. Non-shadowing
subpackage name (``taichi_harness`` not bare ``taichi``) per
sub-phase-numba-integration § 8 N2 lesson — bare ``taichi`` would
shadow the upstream ``taichi`` package at pytest collection time.
"""
