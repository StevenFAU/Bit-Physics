"""``python -m lenia`` CLI shell (per `docs/phases/phase-3-plan.md` § 3.2.6).

Stage 1a — shell. Stage 1b lands the argparse interface (``--seed``,
``--steps``, ``--grid``, ``--preset``, ``--out``,
``--tolerance-key continuous-ca.lenia``, ``--determinism-arch cpu``)
and dispatches to :class:`lenia.sim.LeniaSim`.
"""

from __future__ import annotations


def main() -> int:  # pragma: no cover — Stage-1a shell
    raise NotImplementedError(
        "lenia CLI Stage 1a scaffold: implementation lands at Stage 1b "
        "(argparse per docs/phases/phase-3-plan.md § 3.2.6)."
    )


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
