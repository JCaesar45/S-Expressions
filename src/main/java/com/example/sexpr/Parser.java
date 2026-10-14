package com.example.sexpr;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import com.example.sexpr.SExpr.List_;
import com.example.sexpr.SExpr.Num;
import com.example.sexpr.SExpr.Str;

/**
 * Recursive descent parser for S-expressions.
 *
 * <p>Grammar:
 * <pre>
 *   sexpr          -> atom | list
 *   list           -> '(' sexpr* ')'
 *   atom           -> quoted-string | unquoted-token
 *   quoted-string  -> '"' &lt;any chars except "&gt; '"'
 *                   | '"' &lt;unterminated to end of input&gt;
 *   unquoted-token -> &lt;one or more chars not in [ \t\r\n()" ]&gt;
 * </pre>
 *
 * <p>Numbers are recognized via a strict regex, then confirmed as finite
 * so tokens like {@code Infinity}, {@code NaN}, and {@code 0x10} fall
 * through to string atoms rather than silently becoming numbers.
 *
 * <p>Quoted strings retain their delimiters in the returned value, per
 * the Rosetta Code specification. So {@code "hello"} yields the string
 * {@code "hello"} with the quote characters included.
 */
public final class Parser {

    private static final Pattern NUMBER_PATTERN =
            Pattern.compile("^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$");

    private final String source;
    private final int length;
    private int pos;

    private Parser(String source) {
        this.source = source;
        this.length = source.length();
        this.pos = 0;
    }

    /**
     * Parse a single S-expression from {@code source}.
     *
     * @return the parsed value, or {@code null} for empty / whitespace-only input
     * @throws SExprError if the expression is structurally malformed
     */
    public static SExpr parse(String source) {
        if (source == null) {
            throw new TypeError("parse expects a non-null string");
        }
        return new Parser(source).parseTop();
    }

    private SExpr parseTop() {
        skipWhitespace();
        if (pos >= length) return null;
        return parseValue();
    }

    private SExpr parseValue() {
        skipWhitespace();
        if (pos >= length) return null;

        char ch = source.charAt(pos);

        if (ch == '(') return parseList();
        if (ch == '"') return parseQuotedString();
        return parseUnquotedToken();
    }

    private SExpr parseList() {
        int openPos = pos;
        pos++; // consume '('
        List<SExpr> items = new ArrayList<>();

        while (true) {
            skipWhitespace();

            if (pos >= length) {
                throw new SExprError("unterminated list, expected )", openPos);
            }

            if (source.charAt(pos) == ')') {
                pos++;
                return new List_(items);
            }

            SExpr element = parseValue();
            if (element != null) {
                items.add(element);
            }
        }
    }

    private SExpr parseQuotedString() {
        int start = pos;
        pos++; // consume opening quote

        while (pos < length && source.charAt(pos) != '"') {
            pos++;
        }

        if (pos < length) {
            pos++; // consume closing quote
        }

        return new Str(source.substring(start, pos));
    }

    private SExpr parseUnquotedToken() {
        int start = pos;

        while (pos < length) {
            char ch = source.charAt(pos);
            if (isTokenBreak(ch)) break;
            pos++;
        }

        String token = source.substring(start, pos);

        if (token.isEmpty()) {
            // Unreachable given call sites; kept defensive so malformed
            // input can never spin the loop.
            throw new SExprError("unexpected character", pos);
        }

        if (NUMBER_PATTERN.matcher(token).matches()) {
            Number value = coerceNumber(token);
            if (value != null) {
                return new Num(value);
            }
        }

        return new Str(token);
    }

    private void skipWhitespace() {
        while (pos < length) {
            char ch = source.charAt(pos);
            if (!isWhitespace(ch)) return;
            pos++;
        }
    }

    private static boolean isWhitespace(char ch) {
        return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r'
                || ch == '\f' || ch == '\u000B';
    }

    private static boolean isTokenBreak(char ch) {
        return isWhitespace(ch) || ch == '(' || ch == ')' || ch == '"';
    }

    /**
     * Convert a numeric-looking token to Integer, Long, or Double.
     *
     * <p>Returns {@code null} if the token is not a finite number. This is
     * what keeps {@code Infinity} and {@code 1e999} from sneaking through
     * the regex but then producing a non-finite value.
     */
    private static Number coerceNumber(String token) {
        try {
            if (token.indexOf('.') >= 0
                    || token.indexOf('e') >= 0
                    || token.indexOf('E') >= 0) {
                double d = Double.parseDouble(token);
                if (!Double.isFinite(d)) return null;
                return d;
            }

            // Pure integer. Try int first, fall back to long on overflow.
            try {
                return Integer.parseInt(token);
            } catch (NumberFormatException overflow) {
                long l = Long.parseLong(token);
                return l;
            }
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Minimal stand-in for a type error, since Java's built-in TypeError
     * doesn't exist. This mirrors the JS implementation's behavior.
     */
    public static final class TypeError extends RuntimeException {
        public TypeError(String message) {
            super(message);
        }
    }
}
