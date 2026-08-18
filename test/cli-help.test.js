import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('CLI help entrypoint prints usage', () => {
  const result = spawnSync(process.execPath, ['./bin/cli.js', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout + result.stderr, /Usage:/);
});

test('CLI rejects help combined with other arguments', () => {
  for (const args of [
    ['--help', '--bogus'],
    ['--bogus', '--help'],
    ['--help', 'fixtures/connector-manifest.json'],
    ['fixtures/connector-manifest.json', '--help']
  ]) {
    const result = run(...args);
    assert.equal(result.status, 2, args.join(' '));
    assert.match(result.stderr, /--help cannot be combined with other arguments/);
  }
});

function run(...args) {
  return spawnSync(process.execPath, ['./bin/cli.js', ...args], { encoding: 'utf8' });
}

test('CLI emits valid JSON and Markdown for supported formats', () => {
  const json = run('fixtures/connector-manifest.json', '--format', 'json');
  assert.equal(json.status, 0, json.stderr);
  assert.equal(JSON.parse(json.stdout).title, 'Connector Mock Plan');

  const markdown = run('fixtures/connector-manifest.json', '--format=markdown');
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.match(markdown.stdout, /^# Connector Mock Plan/m);
});

test('CLI rejects unknown options', () => {
  const result = run('fixtures/connector-manifest.json', '--bogus');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown option: --bogus/);
});

test('CLI rejects unsupported formats and missing format values', () => {
  const unsupported = run('fixtures/connector-manifest.json', '--format', 'yaml');
  assert.equal(unsupported.status, 2);
  assert.match(unsupported.stderr, /unsupported format: yaml/);

  const missing = run('fixtures/connector-manifest.json', '--format');
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /--format requires a value/);
});

test('CLI rejects repeated or conflicting output format selectors', () => {
  for (const args of [
    ['fixtures/connector-manifest.json', '--format', 'json', '--format', 'json'],
    ['fixtures/connector-manifest.json', '--format=json', '--format=markdown'],
    ['fixtures/connector-manifest.json', '--json', '--format', 'markdown'],
    ['fixtures/connector-manifest.json', '--format', 'markdown', '--json']
  ]) {
    const result = run(...args);
    assert.equal(result.status, 2, args.join(' '));
    assert.match(result.stderr, /output format may be specified only once/);
  }
});

test('CLI marks an empty JSON manifest as incomplete in JSON and Markdown output', () => {
  const directory = mkdtempSync(join(tmpdir(), 'connector-mock-plan-'));
  const fixture = join(directory, 'empty.json');
  writeFileSync(fixture, '{}\n');

  const json = run(fixture, '--json');
  assert.equal(json.status, 0, json.stderr);
  const result = JSON.parse(json.stdout);
  assert.equal(result.risk, 'high');
  assert.deepEqual(result.warnings, [
    'missing connector',
    'missing capabilities or actions',
    'missing limits'
  ]);

  const markdown = run(fixture);
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.match(markdown.stdout, /Risk: high/);
  assert.match(markdown.stdout, /Incomplete manifest: missing limits/);
});

test('CLI aligns invalid structured findings and warnings in JSON and Markdown', () => {
  const directory = mkdtempSync(join(tmpdir(), 'connector-mock-plan-'));
  const fixture = join(directory, 'invalid-structured-fields.json');
  writeFileSync(fixture, JSON.stringify({
    connector: 'example',
    capabilities: [42],
    actions: [],
    limits: false
  }));

  const json = run(fixture, '--json');
  assert.equal(json.status, 0, json.stderr);
  const result = JSON.parse(json.stdout);
  assert.deepEqual(result.fields, {
    Connector: 'example',
    Capabilities: 'Not found',
    Actions: 'Not found',
    Limits: 'Not found'
  });
  assert.deepEqual(result.warnings, ['missing capabilities or actions', 'missing limits']);

  const markdown = run(fixture);
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.match(markdown.stdout, /^- Capabilities: Not found$/m);
  assert.match(markdown.stdout, /^- Actions: Not found$/m);
  assert.match(markdown.stdout, /^- Limits: Not found$/m);
  assert.match(markdown.stdout, /Incomplete manifest: missing capabilities or actions/);
  assert.match(markdown.stdout, /Incomplete manifest: missing limits/);
});

test('CLI rejects malformed JSON-shaped input without emitting a plan', () => {
  const directory = mkdtempSync(join(tmpdir(), 'connector-mock-plan-'));
  const fixture = join(directory, 'truncated.json');
  writeFileSync(fixture, '{"connector":"github","limits":');

  const result = run(fixture, '--json');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^connector-mock-plan: invalid JSON manifest\n$/);
});

test('CLI retains plain-text fallback', () => {
  const directory = mkdtempSync(join(tmpdir(), 'connector-mock-plan-'));
  const fixture = join(directory, 'notes.txt');
  writeFileSync(fixture, 'Connector: github\nCapabilities: read\nLimits: local only\n');

  const result = run(fixture, '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).fields.Connector, 'github');
});

test('CLI rejects valid JSON whose top-level value is not an object', () => {
  const directory = mkdtempSync(join(tmpdir(), 'connector-mock-plan-'));

  for (const [name, input] of [
    ['array', '[]'],
    ['string', '"connector"'],
    ['number', '42'],
    ['boolean', 'true'],
    ['null', 'null']
  ]) {
    const fixture = join(directory, `${name}.json`);
    writeFileSync(fixture, input);

    const result = run(fixture, '--json');
    assert.equal(result.status, 1, `${name}: ${result.stderr}`);
    assert.equal(result.stdout, '', name);
    assert.match(
      result.stderr,
      /^connector-mock-plan: JSON manifest must have an object as its top-level value\n$/,
      name
    );
  }
});
