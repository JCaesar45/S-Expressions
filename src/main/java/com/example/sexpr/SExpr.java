package com.example.sexpr;

import java.util.List;

/**
 * Typed model of a parsed S-expression.
 *
 * A value is exactly one of three things: a string atom (which includes
 * quoted strings, delimiters preserved), a numeric atom, or a list of
 * values. The sealed interface lets the compiler enforce exhaustiveness
 * at every switch site.
 */
public sealed interface SExpr
        permits SExpr.Str, SExpr.Num, SExpr.List_ {

    /** A string atom. Quoted strings retain their delimiters. */
    record Str(String value) implements SExpr {}

    /** A numeric atom. Integers are stored as long, floats as double. */
    record Num(Number value) implements SExpr {}

    /** A list of nested S-expressions. */
    record List_(java.util.List<SExpr> items) implements SExpr {}
}
