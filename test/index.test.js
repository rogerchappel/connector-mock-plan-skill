import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, planConnectorMocks, toMarkdown } from '../src/index.js';

test('analyzes fixture into structured result', () => {
  const result = planConnectorMocks('fixtures/connector-manifest.json');
  assert.equal(result.title, 'Connector Mock Plan');
  assert.ok(Object.keys(result.fields).length >= 3);
  assert.match(toMarkdown(result), /## Findings/);
});

test('flags configured review terms', () => {
  const result = analyzeText('Task: demo\nThis contains write');
  assert.ok(result.warnings.includes('write'));
});

test('does not flag hazardous words embedded in JSON prose', () => {
  const result = analyzeText(JSON.stringify({
    connector: 'example',
    description: 'Overwrite cache entries when permission denied errors are handled',
    capabilities: ['read'],
    limits: { note: 'Delete requests are not supported' }
  }));

  assert.deepEqual(result.warnings, []);
  assert.equal(result.risk, 'low');
  assert.equal(result.fields.Connector, 'example');
  assert.equal(result.fields.Capabilities, 'read');
  assert.equal(result.fields.Limits, 'Present');
});

test('flags exact hazardous capability and effect values in JSON', () => {
  const result = analyzeText(JSON.stringify({
    connector: 'example',
    capabilities: ['read', 'write', 'delete'],
    effects: ['sideEffect'],
    limits: {}
  }));

  assert.deepEqual(result.warnings, ['write', 'delete', 'sideEffect']);
  assert.equal(result.risk, 'high');
});

test('falls back to token-aware analysis for non-JSON text', () => {
  assert.deepEqual(analyzeText('This can overwrite cached data').warnings, []);
  assert.deepEqual(analyzeText('Capabilities: write').warnings, ['write']);
});
