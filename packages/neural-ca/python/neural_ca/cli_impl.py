"""CLI command implementations (file-writing glue around the core functions).

Separated from ``__main__`` so the argparse wiring stays import-light. Stage 1a:
:func:`cli_train` / :func:`cli_infer` raise ``NotImplementedError``; implemented
at Stage 1b-D (train -> ``.safetensors``; infer -> capture ``.h5`` + manifest).
"""

from __future__ import annotations

import argparse


def cli_train(args: argparse.Namespace) -> None:
    """Train to the target emoji and write the ``.safetensors`` checkpoint.

    Stage 1b-D implements this.
    """
    raise NotImplementedError("neural_ca.cli_impl.cli_train — Stage 1b-D")


def cli_infer(args: argparse.Namespace) -> None:
    """Roll the checkpoint forward and write the D-inference capture.

    Stage 1b-D implements this.
    """
    raise NotImplementedError("neural_ca.cli_impl.cli_infer — Stage 1b-D")
