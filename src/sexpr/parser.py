"""
Recursive descent parser for S-expressions.

Grammar:
    sexpr          -> atom | list
    list           -> '(' sexpr* ')'
    atom           -> quoted-string | unquoted-token
    quoted-string  -> '"' <any chars except "> '"'
                    | '"' <unterminated to end of input>
    unquoted-token -> <one or more chars not in [ \\t\\r\\n()" ]>

Numbers are recognized via a strict regex, then confirmed with math.isfinite
so tokens like "Infinity", "nan", or "0x10" fall through to string atoms
rather than silently becoming numbers.

Quoted strings retain their delimiters in the returned value, per the
Rosetta Code specification. So `"hello"` yields the string `"hello"` with
the quote characters included.
"""

from __future__ import annotations

import math
import re
from typing import Union

SExprValue = Union[str, int, float, list["SExprValue"]]

_WHITESPACE = re.compile(r"\s")
_TOKEN_BREAK = re.compile(r'[\s()"]')
_NUMBER_PATTERN = re.compile(
    r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$"
)

# A sentinel so we can distinguish "the parser legitimately produced None"
# from "we hit a bad state". Python's None is a valid value in a list,
# so we can't use it as the terminator signal the way JS does.
_EMPTY = object()


class SExprError(Exception):
    """Raised when an S-expression is structurally malformed."""

    def __init__(self, message: str, position: int) -> None:
        super().__init__(f"{message} at position {position}")
        self.position = position


def parse_sexpr(source: str) -> SExprValue | None:
    """
    Parse a single S-expression from *source* and return the native structure.

    Returns None for empty or whitespace-only input. Raises SExprError if the
    expression is structurally malformed (unbalanced parentheses).
    """
    if not isinstance(source, str):
        raise TypeError("parse_sexpr expects a string")

    pos = 0
    length = len(source)

    def skip_whitespace() -> None:
        nonlocal pos
        while pos < length and _WHITESPACE.match(source[pos]):
            pos += 1

    def parse_token() -> SExprValue | None:
        skip_whitespace()

        if pos >= length:
            return None

        ch = source[pos]

        if ch == "(":
            return parse_list()
        if ch == '"':
            return parse_quoted_string()
        return parse_unquoted_token()

    def parse_list() -> list[SExprValue]:
        nonlocal pos
        open_pos = pos
        pos += 1  # consume '('
        items: list[SExprValue] = []

        while True:
            skip_whitespace()

            if pos >= length:
                raise SExprError("unterminated list, expected )", open_pos)

            if source[pos] == ")":
                pos += 1
                return items

            element = parse_token()
            if element is not None:
                items.append(element)

    def parse_quoted_string() -> str:
        nonlocal pos
        start = pos
        pos += 1  # consume opening quote

        while pos < length and source[pos] != '"':
            pos += 1

        if pos < length:
            pos += 1  # consume closing quote

        return source[start:pos]

    def parse_unquoted_token() -> SExprValue:
        nonlocal pos
        start = pos

        while pos < length and not _TOKEN_BREAK.match(source[pos]):
            pos += 1

        token = source[start:pos]

        if token == "":
            # Should be unreachable given call sites; kept defensive so a
            # malformed input can never spin the loop.
            raise SExprError("unexpected character", pos)

        if _NUMBER_PATTERN.match(token):
            value = _coerce_number(token)
            if value is not None:
                return value

        return token

    skip_whitespace()

    if pos >= length:
        return None

    return parse_token()


def _coerce_number(token: str) -> int | float | None:
    """
    Convert a numeric-looking token to int or float.

    Returns None if the token is not a finite number. This is what keeps
    "Infinity" and "1e999" from sneaking through the regex but then blowing
    up downstream.
    """
    try:
        if any(c in token for c in ".eE"):
            value = float(token)
        else:
            value = int(token)
    except ValueError:
        return None

    if not math.isfinite(value):
        return None

    return value
