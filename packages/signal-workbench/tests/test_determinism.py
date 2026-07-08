"""Run-twice bit-identity witness (§ 8)."""

from signal_workbench.sim import WorkbenchConfig, run_canonical


def test_run_twice_bit_identical_witnessed() -> None:
    r1 = run_canonical()  # internally evaluates twice + asserts
    r2 = run_canonical()
    assert r1.determinism_witness_sha256
    assert r1.determinism_witness_sha256 == r2.determinism_witness_sha256


def test_witness_changes_with_config() -> None:
    a = run_canonical(WorkbenchConfig(n=1024, fm_kc=128, fm_km=9))
    b = run_canonical(WorkbenchConfig(n=1024, fm_kc=128, fm_km=9, fm_index=1.5))
    assert a.determinism_witness_sha256 != b.determinism_witness_sha256
