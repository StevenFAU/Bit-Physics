"""Symbolic generators for golden-value tables.

Each module regenerates a JSON table at `../tables/<algorithm>.json` from
its analytic definition. Generators are idempotent: re-running on a clean
repo must produce no diff. Tests in `../tests/test_generator_*.py` enforce
byte-for-byte equality.
"""
