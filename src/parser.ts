/**
 * Recursive descent parser for S-expressions.
 *
 * Grammar:
 *   sexpr          -> atom | list
 *   list           -> '(' sexpr* ')'
 *   atom           -> quoted-string | unquoted-token
 *   quoted-string  -> '"' <any chars except "> '"'
 *                   | '"' <unterminated to end of input>
 *   unquoted-token -> <one or more chars not in [ \t\r\n()" ]>
 *
 * Numbers are recognized via a strict regex, then confirmed with
 * Number.isFinite so tokens like "Infinity" or "0x10" fall through to
 * string atoms rather than silently becoming numbers.
 *
 * Quoted strings retain their delimiters in the returned value, per the
 * Rosetta Code specification. So `"hello"` yields the string `"hello"`
 * with the quote characters included.
 */

export type SExprValue = string | number | SExprList;
export type SExprList = SExprValue[];

const WHITESPACE = /\s/;
const TOKEN_BREAK = /[\s()"]/;
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export class SExprError extends Error {
  override readonly name = 'SExprError';
  readonly position: number;

  constructor(message: string, position: number) {
    super(`${message} at position ${position}`);
    this.position = position;
  }
}

export function parseSexpr(source: string): SExprValue | null {
  if (typeof source !== 'string') {
    throw new TypeError('parseSexpr expects a string');
  }

  let pos = 0;
  const length = source.length;

  function skipWhitespace(): void {
    while (pos < length) {
      const ch = source[pos];
      if (ch === undefined || !WHITESPACE.test(ch)) return;
      pos++;
    }
  }

  function parseToken(): SExprValue | null {
    skipWhitespace();

    if (pos >= length) return null;

    const ch = source[pos];
    if (ch === undefined) return null;

    if (ch === '(') return parseList();
    if (ch === '"') return parseQuotedString();
    return parseUnquotedToken();
  }

  function parseList(): SExprList {
    const openPos = pos;
    pos++; // consume '('
    const items: SExprList = [];

    while (true) {
      skipWhitespace();

      if (pos >= length) {
        throw new SExprError('unterminated list, expected )', openPos);
      }

      if (source[pos] === ')') {
        pos++;
        return items;
      }

      const element = parseToken();
      if (element !== null) {
        items.push(element);
      }
    }
  }

  function parseQuotedString(): string {
    const start = pos;
    pos++; // consume opening quote

    while (pos < length && source[pos] !== '"') {
      pos++;
    }

    if (pos < length) {
      pos++; // consume closing quote
    }

    return source.slice(start, pos);
  }

  function parseUnquotedToken(): SExprValue {
    const start = pos;

    while (pos < length) {
      const ch = source[pos];
      if (ch === undefined || TOKEN_BREAK.test(ch)) break;
      pos++;
    }

    const token = source.slice(start, pos);

    if (token === '') {
      // Unreachable given call sites; kept defensive so malformed input
      // can never spin the loop.
      throw new SExprError('unexpected character', pos);
    }

    if (NUMBER_PATTERN.test(token)) {
      const value = Number(token);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return token;
  }

  skipWhitespace();

  if (pos >= length) return null;

  return parseToken();
}
