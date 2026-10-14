# sexpr

**One grammar. Four languages. No dependencies at the core.**

A recursive descent parser for S-expressions, written from scratch in
JavaScript, Python, TypeScript, and Java. Each implementation stands
alone. A shared conformance suite holds them to the same behavior.

The grammar fits on an index card. The interesting part is what happens
when four languages with four different type systems, four different
string models, and four different numeric towers all implement the same
five production rules — and have to agree on the corners.

---

## The whole grammar

```
sexpr          -> atom | list
list           -> '(' sexpr* ')'
atom           -> quoted-string | unquoted-token
quoted-string  -> '"' <any chars except "> '"'
                | '"' <unterminated to end of input>
unquoted-token -> <one or more chars not in [ \t\r\n()" ]>
```

Five rules. One recursion. That's the entire language.

Everything interesting lives in the corners. There are four, and if you
understand them, you understand the project.

**Quoted strings keep their delimiters.** `"hello"` parses to the value
`"hello"` — quotes included. Most parsers strip delimiters; this one
preserves them. It's the Rosetta Code behavior, and it's also the only
choice that makes round-tripping lossless: `"hello"` and `hello` are
different atoms, and a reader that strips quotes has thrown away the
distinction.

**Unterminated strings are legal.** `(a "(more" b)` parses to
`["a", '"(more"', "b"]`. The first quote opens a string that runs to the
second quote. The second quote opens a *new* string that runs to the next
whitespace. There is no error state for unbalanced quotes. The grammar
never asked for them to pair.

**Numbers are recognized, not coerced.** `123` becomes `123`. `123abc`
stays `"123abc"`. `Infinity` stays `"Infinity"` — it isn't finite, and
the grammar doesn't claim to represent non-finite values. The check is a
strict regex plus an `isFinite` guard, not a `parseFloat` that would
happily turn `"12abc"` into `12`.

**Only four characters are special.** `(`, `)`, `"`, and whitespace.
That's it. `!@#` is a valid atom. `hello-world` is a valid atom.
`foo/bar/baz` is a valid atom. `λ` is a valid atom. The parser has no
opinion about what atoms mean, and that's the point — an S-expression
reader is a structural parser, not a semantic one.

---

## Sixty seconds to running code

Each implementation stands alone. Pick a language, run two commands, see
a tree.

### JavaScript — a small web workbench

An Express server that exposes the parser over HTTP, plus a browser UI
for pasting expressions and watching the tree render.

```bash
cd js && npm install && npm start
# open http://localhost:3000
```

Numbers, strings, and atoms render in different colors, so you can see
at a glance how the parser categorized each token. Paste the Rosetta Code
example from the next section and hit Parse.

### Python — a package with a CLI

```bash
cd python
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m sexpr '((data "quoted data" 123 4.5))'
```

### TypeScript — a typed library

```bash
cd typescript && npm install && npm run build
node dist/cli.js '(a b c)'
```

The public type is a discriminated union:

```ts
type SExprValue = string | number | SExprList;
type SExprList  = SExprValue[];
```

Narrow on `Array.isArray(value)` and the compiler enforces the rest.

### Java — a sealed interface

```bash
cd java && mvn package
java -jar target/sexpr-1.0.0.jar '(a b c)'
```

The output model is a sealed interface with three permitted records.
Pattern matching `switch` over the result is exhaustive — the compiler
rejects a site that forgets a case.

---

## The same expression, four ways

Here's the Rosetta Code test case:

```
((data "quoted data" 123 4.5)
 (data (!@# (4.5) "(more" "data)")))
```

Here's what JavaScript returns:

```js
[
  ['data', '"quoted data"', 123, 4.5],
  ['data', ['!@#', [4.5], '"(more"', '"data)"']]
]
```

Here's what Python returns:

```python
[
  ['data', '"quoted data"', 123, 4.5],
  ['data', ['!@#', [4.5], '"(more"', '"data)"']]
]
```

Same tree. TypeScript returns the same shape with the union type
attached. Java returns the same tree wrapped in records.

The tree is identical. The *type systems* are not. That's the project.

Python splits `123` and `4.5` into `int` and `float`. Java splits
integers further, into `Integer` and `Long`, and falls back on overflow.
JavaScript collapses everything into a single `number`. TypeScript
expresses the recursive union directly. Java expresses it as a sealed
interface with record members. Four languages, four ways of saying the
same thing, four sets of edge cases that the shared conformance suite
holds to a common answer.

---

## Shared conformance

`conformance/cases.json` is the source of truth for behavior. Every
language loads it, parses each input, and asserts that the result matches
the expected value after mapping into native types.

```bash
./scripts/check-conformance.sh   # just the conformance suite
./scripts/run-all-tests.sh       # every suite, every language
```

If a case fails in one language and passes in three, that's a signal.
Either a real language-level difference that deserves a documented
exception, or a bug in one implementation. Either way, worth a commit
message that says which.

---

## Layout

```
sexpr/
├── conformance/          shared test vectors, all four languages read these
├── js/                   Express backend + browser workbench
├── python/               installable package with CLI
├── typescript/           typed library, compiles to dist/
├── java/                 Maven project, sealed interface output
├── scripts/              run-all-tests.sh, check-conformance.sh
└── docs/                 grammar.abnf, design-notes.md
```

Each subdirectory is independently runnable. `cd java && mvn test`
doesn't need to know the other three exist.

---

## Design notes

The choices that aren't obvious, in the order a reviewer would ask about
them.

### Why preserve quote delimiters?

Because the Rosetta Code specification says to, and because it's the
right call for a structural parser. Stripping quotes means
`("hello")` and `(hello)` parse to the same tree. That's a semantic
collapse the parser has no business making. Keeping the delimiters means
the tree preserves enough information to reconstruct the original input
character-for-character if you want to. Consumers who want the payload
strip the quotes themselves; consumers who want round-trip fidelity get
it for free.

### Why isn't an unterminated string an error?

Because the grammar is written as character-level rules, not as
well-formedness constraints. "A quoted string is a quote, then characters
until the next quote or the end of input." That's the whole rule. If
there's no closing quote, the string runs to the end. The next token
starts fresh. This falls out of the grammar naturally; treating it as an
error would require an *extra* rule that says quotes must pair, and
nothing in the specification asks for that.

### Why recursive descent instead of a PEG or a combinator library?

Because the grammar is five rules with one recursion, and recursive
descent is the most direct translation of "a list is an open paren, a
sequence of values, and a close paren." It's about 150 lines in any
language, and it's readable by anyone who can read a `while` loop.

A PEG grammar would be shorter in the source but would require
understanding PEG semantics to modify. A shunting-yard would be longer
and would need a postprocessing pass to build the tree. A combinator
library would pull in a dependency for something the direct approach
handles cleanly. This isn't a claim that recursive descent is universally
best. It's a claim that for *this* grammar, the direct approach has
nothing to gain from abstraction, and a hundred and fifty lines you can
read beat twenty lines you have to look up.

### Why aren't the numbers fully typed?

Because S-expressions are agnostic about numeric representation. The
grammar says "an unquoted token that matches the numeric pattern becomes
a number." It doesn't say whether that number is a 32-bit int, a 64-bit
int, a float, a rational, or a bignum. Each language maps to its own
native types, and the conformance suite asserts only that a token
matching the numeric pattern parses to *some* numeric value — not a
specific one. That's the correct level of abstraction for a parser whose
job is to produce a native data structure in the target language.

### Why four languages instead of one?

Because the point isn't the parser. The parser is trivial. The point is
the *translation surface* — the set of decisions that look the same in
English but diverge the moment you commit to a language.

JavaScript has one number type, so `123` and `4.5` are indistinguishable
in the output. Python has two, so they aren't. Java has three native
integer widths and a floating-point type, and the parser has to pick.
TypeScript has a structural union that can express "one of these three
shapes" directly. Java has a sealed interface and records, which is the
same idea expressed through the type system's nominal side.

Four implementations of the same grammar is a way of *seeing* those
differences instead of reading about them in a comparison table.

---

## What this project is not

It isn't a Scheme interpreter. It doesn't evaluate. It doesn't have a
symbol table. It doesn't distinguish `nil` from `#f` from `()`.

It doesn't do macros, quasiquote, or reader macros. It doesn't handle
dotted pairs or square brackets or comments. It doesn't do Unicode
normalization or encoding detection.

It reads a string and produces a tree. That's the whole job.

It also isn't a spec-driven parser generator. The grammar is documented
in ABNF in `docs/grammar.abnf`, but each implementation is hand-written.
If the grammar changes, four files change. That's the cost of four
implementations, and it's also the reason the shared conformance suite
exists — to make sure the four files don't drift apart.

---

## Status

| Language | Build | Tests | CLI | Library | Web UI |
|---|---|---|---|---|---|
| JavaScript | — | ✓ | — | ✓ | ✓ |
| Python | ✓ | ✓ | ✓ | ✓ | — |
| TypeScript | ✓ | ✓ | ✓ | ✓ | — |
| Java | ✓ | ✓ | ✓ | ✓ | — |

JavaScript has no build step — it's plain Node ESM — and no CLI, because
its front end is the browser workbench. The other three are installable
packages with command-line entry points.

---

## License

MIT.
