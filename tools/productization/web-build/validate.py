"""Web-build track validator — orchestrates the per-sim gates (Phase-5).

For a Stack-B web sim, runs the three gates the web-build track defines and
prints a combined verdict:

  1. Vite build succeeds          (§6.1 load-bearing gate)         — npm + vite
  2. wgpu-native correctness gate (round-trip OR new-canonical)    — gpu_gate.py
  3. Headless DOM-load smoke      (§6.1 fallback in this env)      — headless/smoke.mjs

Gate 2 runs the EXACT committed `.wgsl` the Vite bundle ships, on the real GPU
(headless browser WebGPU is unavailable here; see gpu_gate.py / README). Gate 3
is the documented §6.1 fallback — it proves the bundle loads, not the GPU path.

Environment for gate 3 (local-only; 5.1 owns the cloud Playwright):
  PLAYWRIGHT_MODULE  absolute path to an installed playwright package
  CHROME_BIN         absolute path to a Chromium/Chrome binary

Usage:  python validate.py <sim> [--skip-smoke]
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]

WEB_DIRS = {
    "reaction-diffusion-2d": "packages/reaction-diffusion-2d/web",
    "mandelbulb-explorer": "packages/mandelbulb-explorer/web",
}


def _run(
    cmd: list[str], cwd: Path | None = None, env: dict | None = None
) -> tuple[int, str]:
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    return proc.returncode, (proc.stdout + proc.stderr)


def vite_build(web_dir: Path) -> bool:
    if not (web_dir / "node_modules").exists():
        rc, out = _run(["npm", "install"], cwd=web_dir)
        if rc != 0:
            print(out[-1500:])
            return False
    rc, out = _run(["npx", "vite", "build"], cwd=web_dir)
    ok = rc == 0 and "built in" in out
    print(f"  [1] vite build: {'OK' if ok else 'FAIL'}")
    if not ok:
        print(out[-1500:])
    return ok


def gpu_gate(sim: str) -> bool:
    rc, out = _run(
        ["uv", "run", "python", "tools/productization/web-build/gpu_gate.py", sim],
        cwd=REPO,
    )
    verdict = [ln for ln in out.splitlines() if ln.startswith("VERDICT")]
    ok = rc == 0
    print(
        f"  [2] gpu-native gate: {verdict[-1] if verdict else ('OK' if ok else 'FAIL')}"
    )
    for ln in out.splitlines():
        if ln.strip().startswith(("device:", "run-twice", "  ")):
            print(f"      {ln.strip()}")
    return ok


def dom_smoke(web_dir: Path) -> bool:
    if not os.environ.get("PLAYWRIGHT_MODULE") or not os.environ.get("CHROME_BIN"):
        print("  [3] dom smoke: SKIPPED (set PLAYWRIGHT_MODULE + CHROME_BIN)")
        return True
    rc, out = _run(
        [
            "node",
            "tools/productization/web-build/headless/smoke.mjs",
            str(web_dir / "dist"),
        ],
        cwd=REPO,
        env={**os.environ},
    )
    line = [ln for ln in out.splitlines() if ln.startswith("SMOKE")]
    ok = rc == 0
    print(f"  [3] dom smoke: {line[-1] if line else ('OK' if ok else 'FAIL')}")
    return ok


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in WEB_DIRS:
        print(
            f"usage: validate.py [{' | '.join(WEB_DIRS)}] [--skip-smoke]",
            file=sys.stderr,
        )
        return 2
    sim = argv[1]
    skip_smoke = "--skip-smoke" in argv[2:]
    web_dir = REPO / WEB_DIRS[sim]
    print(f"=== web-build validate: {sim} ===")
    g1 = vite_build(web_dir)
    g2 = gpu_gate(sim)
    g3 = True if skip_smoke else dom_smoke(web_dir)
    overall = g1 and g2 and g3
    print(f"OVERALL: {'PASS' if overall else 'FAIL'}")
    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
