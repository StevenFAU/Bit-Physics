"""CLI: regenerate golden tables and committed gate assets.

uv run --no-sync python -m lbm_multiphase all        # everything
uv run --no-sync python -m lbm_multiphase tables     # JSON goldens only
uv run --no-sync python -m lbm_multiphase canonical  # rerun + sha check
"""

from __future__ import annotations

import sys


def main(argv: list[str]) -> int:
    cmd = argv[0] if argv else "all"
    if cmd == "all":
        from .goldens import gen_all

        gen_all()
    elif cmd == "tables":
        from .goldens import (
            gen_coexistence_table,
            gen_contact_angle_table,
            gen_equilibrium_table,
            gen_lamb,
            gen_laplace_table,
        )

        gen_equilibrium_table()
        ctx = gen_coexistence_table()
        lap = gen_laplace_table(ctx)
        gen_contact_angle_table(ctx)
        gen_lamb(ctx, sigma_b=lap["fit_b"]["sigma"])
    elif cmd == "assets":
        from .goldens import gen_assets_standalone

        gen_assets_standalone()
    elif cmd == "lamb":
        from .goldens import gen_lamb_standalone

        gen_lamb_standalone()
    elif cmd == "contact":
        from .goldens import _ctx_cheap, gen_contact_angle_table

        gen_contact_angle_table(_ctx_cheap())
    elif cmd == "canonical":
        import hashlib

        from .sim import (
            GATE_DROP_B,
            GATE_FLAT_A,
            REFERENCE_SHA256,
            checkpoint_blob,
            run_canonical,
        )

        res = run_canonical()
        for key, scene in (("flat", GATE_FLAT_A), ("droplet", GATE_DROP_B)):
            sha = hashlib.sha256(checkpoint_blob(res[key], scene)).hexdigest()
            ok = "OK" if REFERENCE_SHA256.get(key) == sha else "MISMATCH"
            print(f"{key}: {sha} [{ok}]")
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
