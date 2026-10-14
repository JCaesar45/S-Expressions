import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSexpr, SExprError } from '../src/parser.js';

test('flat list of atoms', () => {
  assert.deepEqual(
    parseSexpr('(data1 data2 data3)'),
    ['data1', 'data2', 'data3']
  );
});

test('Rosetta Code example — nested structure with strings and numbers', () => {
  const input = '((data "quoted data" 123 4.5)\n' +
                '(data (!@# (4.5) "(more" "data)")))';

  const expected = [
    ['data', '"quoted data"', 123, 4.5],
    ['data', ['!@#', [4.5], '"(more"', '"data)"']]
  ];

  assert.deepEqual(parseSexpr(input), expected);
});

test('integers and floats', () => {
  assert.deepEqual(parseSexpr('(1 2 3)'), [1, 2, 3]);
  assert.deepEqual(parseSexpr('(1.5 -2.25 +0.5)'), [1.5, -2.25, 0.5]);
  assert.deepEqual(parseSexpr('(1e3 2.5E-2)'), [1000, 0.025]);
});

test('quoted strings keep their delimiters', () => {
  assert.deepEqual(
    parseSexpr('("hello" "world")'),
    ['"hello"', '"world"']
  );
});

test('parentheses inside quoted strings are literal', () => {
  assert.deepEqual(
    parseSexpr('("(nested)" "a(b)c")'),
    ['"(nested)"', '"a(b)c"']
  );
});

test('unterminated quoted string runs to end of input', () => {
  assert.deepEqual(
    parseSexpr('(a "(more" b)'),
    ['a', '"(more"', 'b']
  );
});

test('whitespace including newlines and tabs is skipped', () => {
  assert.deepEqual(
    parseSexpr('(\n  a\tb\r\n  c\n)'),
    ['a', 'b', 'c']
  );
});

test('numbers that look numeric but are not stay strings', () => {
  assert.deepEqual(
    parseSexpr('(data1 12abc 0x10 Infinity NaN)'),
    ['data1', '12abc', '0x10', 'Infinity', 'NaN']
  );
});

test('unbalanced list raises with a position', () => {
  assert.throws(
    () => parseSexpr('(a b c'),
    (err) => err instanceof SExprError && err.position === 0
  );
});

test('empty input returns null', () => {
  assert.equal(parseSexpr(''), null);
  assert.equal(parseSexpr('   \n\t '), null);
});

test('deeply nested structure', () => {
  assert.deepEqual(
    parseSexpr('(a (b (c (d (e f)))))'),
    ['a', ['b', ['c', ['d', ['e', 'f']]]]]
  );
});
