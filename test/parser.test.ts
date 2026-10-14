import { describe, expect, it } from 'vitest';
import {
  parseSexpr,
  SExprError,
  type SExprValue
} from '../src/parser.js';

describe('basic parsing', () => {
  it('parses a flat list of atoms', () => {
    expect(parseSexpr('(data1 data2 data3)')).toEqual([
      'data1',
      'data2',
      'data3'
    ]);
  });

  it('returns a bare atom', () => {
    expect(parseSexpr('hello')).toBe('hello');
  });

  it('returns null for empty input', () => {
    expect(parseSexpr('')).toBeNull();
    expect(parseSexpr('   \n\t ')).toBeNull();
  });

  it('parses an empty list', () => {
    expect(parseSexpr('()')).toEqual([]);
  });
});

describe('Rosetta Code example', () => {
  it('parses the full example', () => {
    const source =
      '((data "quoted data" 123 4.5)\n' +
      '(data (!@# (4.5) "(more" "data)")))';

    const expected: SExprValue = [
      ['data', '"quoted data"', 123, 4.5],
      ['data', ['!@#', [4.5], '"(more"', '"data)"']]
    ];

    expect(parseSexpr(source)).toEqual(expected);
  });

  it('parses the simple case', () => {
    expect(parseSexpr('(data1 data2 data3)')).toEqual([
      'data1',
      'data2',
      'data3'
    ]);
  });
});

describe('numbers', () => {
  it('parses integers', () => {
    expect(parseSexpr('(1 2 3)')).toEqual([1, 2, 3]);
    expect(parseSexpr('(-5 +7)')).toEqual([-5, 7]);
  });

  it('parses floats', () => {
    expect(parseSexpr('(1.5 -2.25 +0.5)')).toEqual([1.5, -2.25, 0.5]);
  });

  it('parses scientific notation', () => {
    expect(parseSexpr('(1e3 2.5E-2)')).toEqual([1000, 0.025]);
  });

  it('keeps non-numeric lookalikes as strings', () => {
    expect(parseSexpr('(data1 12abc 0x10 Infinity NaN)')).toEqual([
      'data1',
      '12abc',
      '0x10',
      'Infinity',
      'NaN'
    ]);
  });

  it('rejects non-finite floats back to strings', () => {
    expect(parseSexpr('(1e999)')).toEqual(['1e999']);
  });
});

describe('quoted strings', () => {
  it('preserves delimiters', () => {
    expect(parseSexpr('("hello" "world")')).toEqual(['"hello"', '"world"']);
  });

  it('treats parentheses inside strings as literal', () => {
    expect(parseSexpr('("(nested)" "a(b)c")')).toEqual([
      '"(nested)"',
      '"a(b)c"'
    ]);
  });

  it('runs unterminated strings to end of input', () => {
    expect(parseSexpr('(a "(more" b)')).toEqual(['a', '"(more"', 'b']);
  });

  it('allows spaces inside strings', () => {
    expect(parseSexpr('("quoted data")')).toEqual(['"quoted data"']);
  });
});

describe('whitespace handling', () => {
  it('ignores newlines, tabs, and carriage returns', () => {
    expect(parseSexpr('(\n  a\tb\r\n  c\n)')).toEqual(['a', 'b', 'c']);
  });

  it('trims surrounding whitespace around a bare atom', () => {
    expect(parseSexpr('   hello   ')).toBe('hello');
  });
});

describe('nesting', () => {
  it('parses deeply nested structure', () => {
    expect(parseSexpr('(a (b (c (d (e f)))))')).toEqual([
      'a',
      ['b', ['c', ['d', ['e', 'f']]]]
    ]);
  });

  it('mixes nesting and numbers', () => {
    expect(parseSexpr('(1 (2 (3.5) 4) 5)')).toEqual([1, [2, [3.5], 4], 5]);
  });
});

describe('errors', () => {
  it('reports unbalanced open paren with a position', () => {
    try {
      parseSexpr('(a b c');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SExprError);
      if (err instanceof SExprError) {
        expect(err.position).toBe(0);
        expect(err.message).toContain('unterminated list');
      }
    }
  });

  it('reports the outermost unclosed list', () => {
    try {
      parseSexpr('(a (b c)');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SExprError);
      if (err instanceof SExprError) {
        expect(err.position).toBe(0);
      }
    }
  });
});

describe('type-level guarantees', () => {
  it('returns a value assignable to the SExprValue union', () => {
    const result = parseSexpr('(a 1 2.5 (b))');
    expect(result).not.toBeNull();

    // This assignment only compiles because the union covers the shape.
    const typed: SExprValue = result as SExprValue;

    // Narrow at runtime to prove the union is honest.
    if (Array.isArray(typed)) {
      expect(typed[0]).toBe('a');
      expect(typed[1]).toBe(1);
      expect(typed[2]).toBe(2.5);
      expect(typed[3]).toEqual(['b']);
    } else {
      throw new Error('expected an array');
    }
  });
});
