package com.example.sexpr;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Command-line front end for the S-expression parser.
 *
 * <p>Exit codes:
 * <ul>
 *   <li>0 &mdash; parsed successfully</li>
 *   <li>1 &mdash; parse error</li>
 *   <li>2 &mdash; usage or IO error</li>
 * </ul>
 */
public final class Main {

    public static void main(String[] args) {
        int code = run(args);
        System.exit(code);
    }

    static int run(String[] args) {
        boolean json = false;
        boolean quiet = false;
        List<String> positional = new ArrayList<>();

        for (String arg : args) {
            switch (arg) {
                case "--json" -> json = true;
                case "--quiet", "-q" -> quiet = true;
                case "--help", "-h" -> {
                    printUsage();
                    return 0;
                }
                default -> {
                    if (arg.startsWith("--")) {
                        System.err.println("unknown option: " + arg);
                        printUsage();
                        return 2;
                    }
                    positional.add(arg);
                }
            }
        }

        if (positional.size() > 1) {
            System.err.println("too many positional arguments");
            printUsage();
            return 2;
        }

        String source;
        if (!positional.isEmpty()) {
            source = positional.get(0);
        } else {
            try {
                source = new String(
                        System.in.readAllBytes(),
                        StandardCharsets.UTF_8);
            } catch (IOException e) {
                System.err.println("failed to read stdin: " + e.getMessage());
                return 2;
            }
        }

        SExpr result;
        try {
            result = Parser.parse(source);
        } catch (SExprError e) {
            System.err.println("parse error: " + e.getMessage());
            return 1;
        }

        if (result == null) {
            if (!quiet) System.err.println("(empty)");
            return 0;
        }

        String out = json
                ? Json.render(result, 0)
                : SExprs.toLiteral(result);

        if (quiet) {
            System.out.print(out);
        } else {
            System.out.println(out);
        }

        return 0;
    }

    private static void printUsage() {
        System.err.println(
                "usage: sexpr [--json] [--quiet] [EXPR]\n"
              + "\n"
              + "If EXPR is omitted, reads from stdin.");
    }

    /** Small JSON renderer, so the CLI has no runtime dependencies. */
    static final class Json {
        static String render(SExpr value, int depth) {
            if (value instanceof SExpr.Str s) {
                return quote(s.value());
            }
            if (value instanceof SExpr.Num n) {
                return n.value().toString();
            }
            if (value instanceof SExpr.List_ l) {
                if (l.items().isEmpty()) return "[]";
                StringBuilder sb = new StringBuilder("[\n");
                String pad = "  ".repeat(depth + 1);
                for (int i = 0; i < l.items().size(); i++) {
                    sb.append(pad).append(render(l.items().get(i), depth + 1));
                    if (i < l.items().size() - 1) sb.append(',');
                    sb.append('\n');
                }
                sb.append("  ".repeat(depth)).append(']');
                return sb.toString();
            }
            throw new IllegalStateException("unreachable");
        }

        private static String quote(String s) {
            StringBuilder sb = new StringBuilder("\"");
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> {
                        if (c < 0x20) {
                            sb.append(String.format("\\u%04x", (int) c));
                        } else {
                            sb.append(c);
                        }
                    }
                }
            }
            sb.append('"');
            return sb.toString();
        }
    }

    /** Renders an S-expression as a Lisp-style literal, for human reading. */
    static final class SExprs {
        static String toLiteral(SExpr value) {
            if (value instanceof SExpr.Str s) return s.value();
            if (value instanceof SExpr.Num n) return n.value().toString();
            if (value instanceof SExpr.List_ l) {
                StringBuilder sb = new StringBuilder("(");
                for (int i = 0; i < l.items().size(); i++) {
                    if (i > 0) sb.append(' ');
                    sb.append(toLiteral(l.items().get(i)));
                }
                sb.append(')');
                return sb.toString();
            }
            throw new IllegalStateException("unreachable");
        }
    }
}
