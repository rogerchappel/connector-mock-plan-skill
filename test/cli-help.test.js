import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

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
