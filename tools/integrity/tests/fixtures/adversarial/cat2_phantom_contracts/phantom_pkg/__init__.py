"""Adversarial fixture — __all__ declares names that don't exist."""

from .real_mod import real_function

__all__ = ["another_phantom", "phantom_function", "real_function"]
