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

test('summarizes actions and flags hazardous action names and effects', () => {
  const result = analyzeText(JSON.stringify({
    connector: 'example',
    actions: [
      { name: 'contacts.delete', effect: 'delete' },
      { name: 'notes.create', effect: 'write' },
      { name: 'reports.export', sideEffect: true }
    ]
  }));

  assert.equal(result.fields.Actions, 'contacts.delete, notes.create, reports.export');
  assert.deepEqual(result.warnings, ['write', 'delete', 'sideEffect']);
  assert.equal(result.risk, 'high');
});

test('does not flag hazardous prose or substrings inside actions', () => {
  const result = analyzeText(JSON.stringify({
    connector: 'example',
    actions: [{
      name: 'contacts.read',
      effect: 'read',
      description: 'Delete requests are rejected and writes are audited',
      documentation: 'See the sideEffects guide',
      metadata: { note: 'overwrite protection' }
    }]
  }));

  assert.equal(result.fields.Actions, 'contacts.read');
  assert.deepEqual(result.warnings, []);
  assert.equal(result.risk, 'low');
});

test('falls back to token-aware analysis for non-JSON text', () => {
  assert.deepEqual(analyzeText('This can overwrite cached data').warnings, []);
  assert.deepEqual(analyzeText('Capabilities: write').warnings, ['write']);
});

test('renders multiline JSON connector values on one Markdown finding line', () => {
  const result = analyzeText(JSON.stringify({ connector: 'demo\r\nInjected line' }));

  assert.equal(result.fields.Connector, 'demo\r\nInjected line');
  assert.match(toMarkdown(result), /^- Connector: demo Injected line$/m);
  assert.doesNotMatch(toMarkdown(result), /^Injected line$/m);
});

test('renders multiline capability and action names on one finding line', () => {
  const result = analyzeText(JSON.stringify({
    capabilities: ['contacts\nread', { name: 'reports\r\nexport' }],
    actions: [{ name: 'notes\n- forged finding' }]
  }));

  const markdown = toMarkdown(result);
  assert.match(markdown, /^- Capabilities: contacts read, reports export$/m);
  assert.match(markdown, /^- Actions: notes - forged finding$/m);
  assert.doesNotMatch(markdown, /^- forged finding$/m);
});
