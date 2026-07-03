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
