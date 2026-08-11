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
