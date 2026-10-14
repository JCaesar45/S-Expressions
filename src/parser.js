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

const WHITESPACE = /\s/;
const TOKEN_BREAK = /[\s()"]/;
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

class SExprError extends Error {
  constructor(message, position) {
    super(`${message} at position ${position}`);
    this.name = 'SExprError';
    this.position = position;
  }
}

export function parseSexpr(source) {
  if (typeof source !== 'string') {
    throw new TypeError('parseSexpr expects a string');
  }

  let pos = 0;

  function skipWhitespace() {
    while (pos < source.length && WHITESPACE.test(source[pos])) {
      pos++;
    }
  }

  function parseToken() {
    skipWhitespace();

    if (pos >= source.length) {
      return null;
    }

    const ch = source[pos];

    if (ch === '(') {
      return parseList();
    }

    if (ch === '"') {
      return parseQuotedString();
    }

    return parseUnquotedToken();
  }

  function parseList() {
    const openPos = pos;
    pos++; // consume '('
    const items = [];

    while (true) {
      skipWhitespace();

      if (pos >= source.length) {
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

  function parseQuotedString() {
    const start = pos;
    pos++; // consume opening quote

    while (pos < source.length && source[pos] !== '"') {
      pos++;
    }

    if (pos < source.length) {
      pos++; // consume closing quote
    }

    return source.slice(start, pos);
  }

  function parseUnquotedToken() {
    const start = pos;

    while (pos < source.length && !TOKEN_BREAK.test(source[pos])) {
      pos++;
    }

    const token = source.slice(start, pos);

    if (token === '') {
      // This shouldn't be reachable given the call sites, but keeping it
      // defensive means a malformed input can't spin the loop.
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

  if (pos >= source.length) {
    return null;
  }

  return parseToken();
}

export { SExprError };
