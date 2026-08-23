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
    limits: { rate: 10 }
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
    ],
    limits: ['rate limit']
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
    }],
    limits: ['rate limit']
  }));

  assert.equal(result.fields.Actions, 'contacts.read');
  assert.deepEqual(result.warnings, []);
  assert.equal(result.risk, 'low');
});

test('falls back to token-aware analysis for non-JSON text', () => {
  assert.deepEqual(analyzeText('This can overwrite cached data').warnings, []);
  assert.deepEqual(analyzeText('Capabilities: write').warnings, ['write']);
});

test('rejects malformed JSON-shaped input but accepts plain text', () => {
  assert.throws(
    () => analyzeText('{"connector":"github","limits":'),
    { name: 'SyntaxError', message: 'invalid JSON manifest' }
  );
  assert.equal(analyzeText('Connector: github\nCapabilities: read').fields.Connector, 'github');
});

test('flags exact permission denied values without matching near-miss prose', () => {
  const denied = analyzeText(JSON.stringify({
    connector: 'example',
    capabilities: [{ name: 'records.read', permission: 'permission denied' }],
    limits: { rate: 10 }
  }));
  assert.deepEqual(denied.warnings, ['permission denied']);

  const prose = analyzeText(JSON.stringify({
    connector: 'example',
    capabilities: [{ name: 'records.read', permission: 'handle permission denied errors' }],
    limits: { rate: 10 }
  }));
  assert.deepEqual(prose.warnings, []);
});

test('does not assign low risk to an empty JSON manifest', () => {
  const result = analyzeText('{}');

  assert.deepEqual(result.warnings, [
    'missing connector',
    'missing capabilities or actions',
    'missing limits'
  ]);
  assert.equal(result.risk, 'high');
  assert.match(toMarkdown(result), /Incomplete manifest: missing connector/);
});

test('reports each missing source of required JSON planning evidence', () => {
  const missingConnector = analyzeText(JSON.stringify({ capabilities: ['read'], limits: ['rate limit'] }));
  assert.deepEqual(missingConnector.warnings, ['missing connector']);
  assert.equal(missingConnector.risk, 'review');

  const missingOperations = analyzeText(JSON.stringify({ connector: 'example', limits: ['rate limit'] }));
  assert.deepEqual(missingOperations.warnings, ['missing capabilities or actions']);

  const missingLimits = analyzeText(JSON.stringify({ connector: 'example', actions: ['read'] }));
  assert.deepEqual(missingLimits.warnings, ['missing limits']);
});

test('treats empty JSON values as incomplete and accepts actions as operation evidence', () => {
  const incomplete = analyzeText(JSON.stringify({ connector: ' ', capabilities: [], actions: [], limits: {} }));
  assert.deepEqual(incomplete.warnings, [
    'missing connector',
    'missing capabilities or actions',
    'missing limits'
  ]);

  const complete = analyzeText(JSON.stringify({ connector: 'example', actions: ['read'], limits: { rate: 10 } }));
  assert.deepEqual(complete.warnings, []);
  assert.equal(complete.risk, 'low');
});

test('renders empty connector strings with the same validity used by completeness checks', () => {
  for (const connector of ['', '   \t\n']) {
    const result = analyzeText(JSON.stringify({ connector, capabilities: ['read'], limits: 10 }));

    assert.equal(result.fields.Connector, 'Not found');
    assert.deepEqual(result.warnings, ['missing connector']);
    assert.equal(result.risk, 'review');
    assert.match(toMarkdown(result), /^- Connector: Not found$/m);
  }
});

test('retains valid string and numeric connector findings', () => {
  for (const [connector, expected] of [['example', 'example'], [0, '0'], [42, '42']]) {
    const result = analyzeText(JSON.stringify({ connector, capabilities: ['read'], limits: 10 }));

    assert.equal(result.fields.Connector, expected);
    assert.doesNotMatch(result.warnings.join('\n'), /missing connector/);
  }
});

test('renders invalid structured fields as not found when completeness warnings are emitted', () => {
  for (const manifest of [
    { connector: 'example', capabilities: [], actions: [], limits: false },
    { connector: 'example', capabilities: [42, {}, { name: ' ' }], limits: [] }
  ]) {
    const result = analyzeText(JSON.stringify(manifest));

    assert.equal(result.fields.Capabilities, 'Not found');
    assert.equal(result.fields.Actions, 'Not found');
    assert.equal(result.fields.Limits, 'Not found');
    assert.deepEqual(result.warnings, [
      'missing capabilities or actions',
      'missing limits'
    ]);
  }
});

test('retains summaries for valid structured operation and limit values', () => {
  const arrays = analyzeText(JSON.stringify({
    connector: 'example',
    capabilities: ['records.read', { name: 'records.write' }],
    actions: [{ name: 'reports.export' }],
    limits: [{ rate: 10 }]
  }));
  assert.deepEqual(arrays.fields, {
    Connector: 'example',
    Capabilities: 'records.read, records.write',
    Actions: 'reports.export',
    Limits: 'Present'
  });

  const objects = analyzeText(JSON.stringify({
    connector: 'example',
    capabilities: { read: true },
    limits: { rate: 10 }
  }));
  assert.equal(objects.fields.Capabilities, 'Present');
  assert.equal(objects.fields.Limits, 'Present');
  assert.deepEqual(objects.warnings, []);
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

test('valid JSON requires an object at the top level', () => {
  for (const input of ['[]', '"connector"', '42', 'true', 'null']) {
    assert.throws(
      () => analyzeText(input),
      { name: 'TypeError', message: 'JSON manifest must have an object as its top-level value' }
    );
  }
});
