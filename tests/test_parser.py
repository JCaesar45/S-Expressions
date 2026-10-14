"""
Test suite mirroring the JavaScript implementation's cases, so the two
parsers can be diffed against each other for behavioral drift.
"""

from __future__ import annotations

import pytest

from sexpr import SExprError, parse_sexpr


class TestBasicParsing:
    def test_flat_list_of_atoms(self) -> None:
        assert parse_sexpr("(data1 data2 data3)") == ["data1", "data2", "data3"]

    def test_single_atom_returns_atom(self) -> None:
        assert parse_sexpr("hello") == "hello"

    def test_empty_input_returns_none(self) -> None:
        assert parse_sexpr("") is None
        assert parse_sexpr("   \n\t ") is None

    def test_empty_list(self) -> None:
        assert parse_sexpr("()") == []


class TestRosettaCodeExample:
    def test_full_example(self) -> None:
        source = (
            '((data "quoted data" 123 4.5)\n'
            '(data (!@# (4.5) "(more" "data)")))'
        )

        expected = [
            ["data", '"quoted data"', 123, 4.5],
            ["data", ["!@#", [4.5], '"(more"', '"data)"']],
        ]

        assert parse_sexpr(source) == expected

    def test_simple_rosetta_case(self) -> None:
        assert parse_sexpr("(data1 data2 data3)") == [
            "data1",
            "data2",
            "data3",
        ]


class TestNumbers:
    def test_integers(self) -> None:
        assert parse_sexpr("(1 2 3)") == [1, 2, 3]
        assert parse_sexpr("(-5 +7)") == [-5, 7]

    def test_floats(self) -> None:
        assert parse_sexpr("(1.5 -2.25 +0.5)") == [1.5, -2.25, 0.5]

    def test_scientific_notation(self) -> None:
        assert parse_sexpr("(1e3 2.5E-2)") == [1000.0, 0.025]

    def test_int_and_float_are_distinct_types(self) -> None:
        result = parse_sexpr("(123 4.5)")
        assert isinstance(result[0], int)
        assert isinstance(result[1], float)
        assert not isinstance(result[0], bool)

    def test_non_numeric_lookalikes_stay_strings(self) -> None:
        assert parse_sexpr("(data1 12abc 0x10 Infinity NaN)") == [
            "data1",
            "12abc",
            "0x10",
            "Infinity",
            "NaN",
        ]

    def test_infinite_float_falls_through_to_string(self) -> None:
        assert parse_sexpr("(1e999)") == ["1e999"]


class TestQuotedStrings:
    def test_quotes_are_preserved(self) -> None:
        assert parse_sexpr('("hello" "world")') == ['"hello"', '"world"']

    def test_parentheses_inside_strings_are_literal(self) -> None:
        assert parse_sexpr('("(nested)" "a(b)c")') == ['"(nested)"', '"a(b)c"']

    def test_unterminated_string_runs_to_end(self) -> None:
        assert parse_sexpr('(a "(more" b)') == ["a", '"(more"', "b"]

    def test_string_with_spaces(self) -> None:
        assert parse_sexpr('("quoted data")') == ['"quoted data"']


class TestWhitespace:
    def test_newlines_tabs_and_carriage_returns(self) -> None:
        assert parse_sexpr("(\n  a\tb\r\n  c\n)") == ["a", "b", "c"]

    def test_whitespace_only_around_atom(self) -> None:
        assert parse_sexpr("   hello   ") == "hello"


class TestNesting:
    def test_deeply_nested(self) -> None:
        assert parse_sexpr("(a (b (c (d (e f)))))") == [
            "a",
            ["b", ["c", ["d", ["e", "f"]]]],
        ]

    def test_mixed_nesting_with_numbers(self) -> None:
        assert parse_sexpr("(1 (2 (3.5) 4) 5)") == [1, [2, [3.5], 4], 5]


class TestErrors:
    def test_unbalanced_open_paren(self) -> None:
        with pytest.raises(SExprError) as exc_info:
            parse_sexpr("(a b c")
        assert exc_info.value.position == 0
        assert "unterminated list" in str(exc_info.value)

    def test_nested_unbalanced(self) -> None:
        with pytest.raises(SExprError) as exc_info:
            parse_sexpr("(a (b c)")
        # The outer list opened at 0, inner at 3, and we ran out at the end.
        assert exc_info.value.position == 0

    def test_non_string_input_raises_type_error(self) -> None:
        with pytest.raises(TypeError):
            parse_sexpr(123)  # type: ignore[arg-type]


class TestTypeFidelity:
    def test_result_is_python_native(self) -> None:
        result = parse_sexpr("(a 1 2.5 (b))")
        assert result[0] == "a"
        assert result[1] == 1
        assert result[2] == 2.5
        assert result[3] == ["b"]

    def test_no_bool_coercion(self) -> None:
        # Python's int and bool are related; make sure 1 doesn't come back True.
        result = parse_sexpr("(1)")
        assert result[0] is not True
        assert type(result[0]) is int
