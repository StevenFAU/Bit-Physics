# Adversarial fixture — broken citations

These citations point to nonexistent files or out-of-range lines:

- A nonexistent file: `does/not/exist.py:1`
- A real file but out-of-range line: `README.md:9999999`
- A range whose end exceeds the file length: `LICENSE:1-99999`

The Cat-1 check should HARD_FAIL on all three.
