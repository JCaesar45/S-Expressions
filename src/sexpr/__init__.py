"""S-expression parser package."""

from .parser import parse_sexpr, SExprError

__all__ = ["parse_sexpr", "SExprError"]
__version__ = "1.0.0"
