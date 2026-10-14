package com.example.sexpr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.example.sexpr.SExpr.List_;
import com.example.sexpr.SExpr.Num;
import com.example.sexpr.SExpr.Str;

class ParserTest {

    // ---- helpers --------------------------------------------------------

    private static Str str(String value) {
        return new Str(value);
    }

    private static Num num(Number value) {
        return new Num(value);
    }

    private static List_ list(SExpr... items) {
        return new List_(List.of(items));
    }

    // ---- basic parsing --------------------------------------------------

    @Nested
    @DisplayName("basic parsing")
    class BasicParsing {

        @Test
        void parsesFlatListOfAtoms() {
            assertEquals(
                list(str("data1"), str("data2"), str("data3")),
                Parser.parse("(data1 data2 data3)"));
        }

        @Test
        void returnsBareAtom() {
            assertEquals(str("hello"), Parser.parse("hello"));
        }

        @Test
        void returnsNullForEmptyInput() {
            assertNull(Parser.parse(""));
            assertNull(Parser.parse("   \n\t "));
        }

        @Test
        void parsesEmptyList() {
            assertEquals(list(), Parser.parse("()"));
        }
    }

    // ---- Rosetta Code example ------------------------------------------

    @Nested
    @DisplayName("Rosetta Code example")
    class RosettaCode {

        @Test
        void parsesFullExample() {
            String source =
                "((data \"quoted data\" 123 4.5)\n"
              + "(data (!@# (4.5) \"(more\" \"data)\")))";

            SExpr expected = list(
                list(
                    str("data"),
                    str("\"quoted data\""),
                    num(123),
                    num(4.5)),
                list(
                    str("data"),
                    list(
                        str("!@#"),
                        list(num(4.5)),
                        str("\"(more\""),
                        str("\"data)\""))));

            assertEquals(expected, Parser.parse(source));
        }

        @Test
        void parsesSimpleCase() {
            assertEquals(
                list(str("data1"), str("data2"), str("data3")),
                Parser.parse("(data1 data2 data3)"));
        }
    }

    // ---- numbers --------------------------------------------------------

    @Nested
    @DisplayName("numbers")
    class Numbers {

        @Test
        void parsesIntegers() {
            assertEquals(
                list(num(1), num(2), num(3)),
                Parser.parse("(1 2 3)"));
            assertEquals(
                list(num(-5), num(7)),
                Parser.parse("(-5 +7)"));
        }

        @Test
        void parsesFloats() {
            assertEquals(
                list(num(1.5), num(-2.25), num(0.5)),
                Parser.parse("(1.5 -2.25 +0.5)"));
        }

        @Test
        void parsesScientificNotation() {
            assertEquals(
                list(num(1000.0), num(0.025)),
                Parser.parse("(1e3 2.5E-2)"));
        }

        @Test
        void integerAndFloatAreDifferentNumberTypes() {
            List_ result = (List_) Parser.parse("(123 4.5)");
            assertInstanceOf(Integer.class, ((Num) result.items().get(0)).value());
            assertInstanceOf(Double.class, ((Num) result.items().get(1)).value());
        }

        @Test
        void nonNumericLookalikesStayStrings() {
            assertEquals(
                list(str("data1"), str("12abc"), str("0x10"),
                     str("Infinity"), str("NaN")),
                Parser.parse("(data1 12abc 0x10 Infinity NaN)"));
        }

        @Test
        void infiniteFloatFallsThroughToString() {
            assertEquals(list(str("1e999")), Parser.parse("(1e999)"));
        }
    }

    // ---- quoted strings -------------------------------------------------

    @Nested
    @DisplayName("quoted strings")
    class QuotedStrings {

        @Test
        void quotesArePreserved() {
            assertEquals(
                list(str("\"hello\""), str("\"world\"")),
                Parser.parse("(\"hello\" \"world\")"));
        }

        @Test
        void parenthesesInsideStringsAreLiteral() {
            assertEquals(
                list(str("\"(nested)\""), str("\"a(b)c\"")),
                Parser.parse("(\"(nested)\" \"a(b)c\")"));
        }

        @Test
        void unterminatedStringRunsToEnd() {
            assertEquals(
                list(str("a"), str("\"(more\""), str("b")),
                Parser.parse("(a \"(more\" b)"));
        }

        @Test
        void stringsWithSpaces() {
            assertEquals(
                list(str("\"quoted data\"")),
                Parser.parse("(\"quoted data\")"));
        }
    }

    // ---- whitespace -----------------------------------------------------

    @Nested
    @DisplayName("whitespace handling")
    class Whitespace {

        @Test
        void ignoresNewlinesTabsCarriageReturns() {
            assertEquals(
                list(str("a"), str("b"), str("c")),
                Parser.parse("(\n  a\tb\r\n  c\n)"));
        }

        @Test
        void trimsAroundBareAtom() {
            assertEquals(str("hello"), Parser.parse("   hello   "));
        }
    }

    // ---- nesting --------------------------------------------------------

    @Nested
    @DisplayName("nesting")
    class Nesting {

        @Test
        void deeplyNested() {
            assertEquals(
                list(
                    str("a"),
                    list(
                        str("b"),
                        list(
                            str("c"),
                            list(
                                str("d"),
                                list(str("e"), str("f")))))),
                Parser.parse("(a (b (c (d (e f)))))"));
        }

        @Test
        void mixesNestingAndNumbers() {
            assertEquals(
                list(
                    num(1),
                    list(num(2), list(num(3.5)), num(4)),
                    num(5)),
                Parser.parse("(1 (2 (3.5) 4) 5)"));
        }
    }

    // ---- errors ---------------------------------------------------------

    @Nested
    @DisplayName("errors")
    class Errors {

        @Test
        void unbalancedOpenParenReportsPosition() {
            SExprError err = assertThrows(
                SExprError.class,
                () -> Parser.parse("(a b c"));
            assertEquals(0, err.getPosition());
            assertTrue(err.getMessage().contains("unterminated list"));
        }

        @Test
        void nestedUnbalancedReportsOutermost() {
            SExprError err = assertThrows(
                SExprError.class,
                () -> Parser.parse("(a (b c)"));
            assertEquals(0, err.getPosition());
        }

        @Test
        void nullInputRaisesTypeError() {
            assertThrows(
                Parser.TypeError.class,
                () -> Parser.parse(null));
        }
    }
}
