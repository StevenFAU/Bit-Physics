# Adversarial fixture — draft cites that don't resolve

The build agent attempted to cite:

- `tools/imaginary/module.py:1` — nonexistent path
- `LICENSE:99999` — line beyond EOF

Both should HARD_FAIL Cat 4 at pre-commit.
