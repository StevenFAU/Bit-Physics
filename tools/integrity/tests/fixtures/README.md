# Fixture corpus

Each `adversarial/<cat>/` subdirectory contains a known-bad fixture
plus a `manifest.json` declaring the expected finding(s). The meta-test
at `tests/test_adversarial_coverage.py` runs every fixture through the
corresponding Cat check and asserts the expected finding count and
severity.

`known_good/` holds artifacts that *should* pass all relevant Cats.
The meta-test runs them through every Cat to assert zero false-positives.
