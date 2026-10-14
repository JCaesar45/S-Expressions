#!/usr/bin/env node
/**
 * Command-line front end for the S-expression parser.
 *
 * Exit codes:
 *   0  parsed successfully
 *   1  parse error
 *   2  usage / IO error
 */

import { readFileSync } from 'node:fs';
import { parseSexpr, SExprError, type SExprValue } from './parser.js';

interface CliOptions {
  expr: string | null;
  json: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { expr: null, json: false, quiet: false };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--quiet' || arg === '-q') {
      opts.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      process.stderr.write(`unknown option: ${arg}\n`);
      printUsage();
      process.exit(2);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    process.stderr.write('too many positional arguments\n');
    printUsage();
    process.exit(2);
  }

  opts.expr = positional[0] ?? null;
  return opts;
}

function printUsage(): void {
  process.stderr.write(
    'usage: sexpr-ts [--json] [--quiet] [EXPR]\n' +
    '\n' +
    'If EXPR is omitted, reads from stdin.\n'
  );
}

function readStdin(): string {
  try {
    return readFileSync(0, 'utf8');
  } catch (err) {
    process.stderr.write(
      `failed to read stdin: ${(err as Error).message}\n`
    );
    process.exit(2);
  }
}

function formatResult(value: SExprValue, asJson: boolean): string {
  if (asJson) {
    return JSON.stringify(value, null, 2);
  }
  return JSON.stringify(value);
}

function main(): number {
  const opts = parseArgs(process.argv.slice(2));
  const source = opts.expr ?? readStdin();

  let result: SExprValue | null;
  try {
    result = parseSexpr(source);
  } catch (err) {
    if (err instanceof SExprError) {
      process.stderr.write(`parse error: ${err.message}\n`);
      return 1;
    }
    throw err;
  }

  if (result === null) {
    if (!opts.quiet) process.stderr.write('(empty)\n');
    return 0;
  }

  const out = formatResult(result, opts.json);
  if (opts.quiet) {
    process.stdout.write(out);
  } else {
    process.stdout.write(out + '\n');
  }

  return 0;
}

process.exit(main());
