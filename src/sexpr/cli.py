"""
Command-line front end for the S-expression parser.

Reads an expression from stdin (or from --expr), parses it, and prints the
native structure as a Python repr. Exit codes:

    0  parsed successfully
    1  parse error
    2  usage / IO error
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from .parser import SExprError, parse_sexpr


def _to_jsonable(value: Any) -> Any:
    """Convert parser output to something json.dumps accepts."""
    if isinstance(value, list):
        return [_to_jsonable(v) for v in value]
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="sexpr",
        description="Parse a single S-expression and print its structure."
    )
    parser.add_argument(
        "expr",
        nargs="?",
        help="Expression to parse. If omitted, read from stdin."
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON instead of Python repr."
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress the trailing newline and any status text."
    )

    args = parser.parse_args(argv)

    if args.expr is not None:
        source = args.expr
    else:
        source = sys.stdin.read()

    try:
        result = parse_sexpr(source)
    except SExprError as err:
        print(f"parse error: {err}", file=sys.stderr)
        return 1

    if result is None:
        if not args.quiet:
            print("(empty)", file=sys.stderr)
        return 0

    if args.json:
        payload = json.dumps(_to_jsonable(result), indent=2)
    else:
        payload = repr(result)

    if args.quiet:
        sys.stdout.write(payload)
    else:
        print(payload)

    return 0


if __name__ == "__main__":
    sys.exit(main())
