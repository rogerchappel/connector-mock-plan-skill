import fs from 'node:fs';

const ROWS = [
  [
    "Connector",
    "\"?connector\"?\\s*[:=]\\s*\"?([^\",\\n]+)",
    "i"
  ],
  [
    "Capabilities",
    "\"?capabilities\"?\\s*[:=]?",
    "i"
  ],
  [
    "Actions",
    "\"?actions\"?\\s*[:=]?",
    "i"
  ],
  [
    "Limits",
    "\"?limits\"?\\s*[:=]?",
    "i"
  ]
];
const WARNING_TERMS = [
  "write",
  "delete",
  "sideEffect",
  "permission denied"
];
const COMPLETENESS_WARNINGS = {
  connector: 'missing connector',
  operations: 'missing capabilities or actions',
  limits: 'missing limits'
};

export function readInput(file) {
  return fs.readFileSync(file, 'utf8');
}

export function analyzeText(text) {
  const manifest = parseManifest(text);
  if (manifest) return analyzeManifest(manifest);

  const fields = analyzeTextFields(text);
  const warnings = WARNING_TERMS.filter((term) => {
    const pattern = term === 'sideEffect' ? /\bsideEffect\b/i : new RegExp(`\\b${term}\\b`, 'i');
    return pattern.test(text);
  });
  return buildResult(fields, warnings);
}

function analyzeManifest(manifest) {
  const fields = {
    Connector: scalarValue(manifest.connector),
    Capabilities: summarizeNamedEntries(manifest.capabilities),
    Actions: summarizeNamedEntries(manifest.actions),
    Limits: manifest.limits === undefined ? 'Not found' : 'Present'
  };
  const warningSet = new Set();
  collectHazards(manifest.capabilities, warningSet);
  collectHazards(manifest.effects, warningSet);
  collectHazards(manifest.actions, warningSet);
  const warnings = WARNING_TERMS.filter((term) => warningSet.has(term));
  if (!hasScalarValue(manifest.connector)) warnings.push(COMPLETENESS_WARNINGS.connector);
  if (!hasNamedEntries(manifest.capabilities) && !hasNamedEntries(manifest.actions)) {
    warnings.push(COMPLETENESS_WARNINGS.operations);
  }
  if (!hasMaterialValue(manifest.limits)) warnings.push(COMPLETENESS_WARNINGS.limits);
  return buildResult(fields, warnings);
}

function analyzeTextFields(text) {
  const fields = {};
  for (const [label, source, flags] of ROWS) {
    const match = text.match(new RegExp(source, flags));
    fields[label] = match && match[1] ? clean(match[1]) : match ? 'Present' : 'Not found';
  }
  return fields;
}

function buildResult(fields, warnings) {
  return {
    title: 'Connector Mock Plan',
    fields,
    warnings,
    risk: warnings.length === 0 ? 'low' : warnings.length < 3 ? 'review' : 'high',
    nextSteps: [
      'Review warnings before reuse',
      'Confirm fixture coverage',
      'Keep external side effects behind approval'
    ]
  };
}

function parseManifest(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function collectHazards(value, warnings) {
  if (Array.isArray(value)) {
    for (const item of value) collectHazards(item, warnings);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key.toLowerCase() === 'sideeffect' && item === true) warnings.add('sideEffect');
      if (['name', 'effect', 'permission', 'permissions'].includes(key.toLowerCase())) {
        collectHazards(item, warnings);
      }
    }
    return;
  }
  if (typeof value !== 'string') return;

  for (const token of value.split(/[:./\s_-]+/)) {
    if (token.toLowerCase() === 'write') warnings.add('write');
    if (token.toLowerCase() === 'delete') warnings.add('delete');
    if (token.toLowerCase() === 'sideeffect') warnings.add('sideEffect');
  }
}

function scalarValue(value) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : 'Not found';
}

function hasScalarValue(value) {
  return (typeof value === 'string' && value.trim().length > 0) || typeof value === 'number';
}

function hasNamedEntries(value) {
  if (!Array.isArray(value)) return hasMaterialValue(value);
  return value.some((item) => {
    if (typeof item === 'string') return item.trim().length > 0;
    return item && typeof item.name === 'string' && item.name.trim().length > 0;
  });
}

function hasMaterialValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function summarizeNamedEntries(value) {
  if (!Array.isArray(value)) return value === undefined ? 'Not found' : 'Present';
  const names = value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (item && typeof item.name === 'string') return [item.name];
    return [];
  });
  return names.length > 0 ? names.join(', ') : 'Present';
}

export function planConnectorMocks(file) {
  return analyzeText(readInput(file));
}

export function toMarkdown(result) {
  const lines = ['# ' + result.title, '', 'Risk: ' + result.risk, '', '## Findings'];
  for (const [key, value] of Object.entries(result.fields)) {
    lines.push('- ' + key + ': ' + singleLine(value));
  }
  lines.push('', '## Warnings');
  if (result.warnings.length === 0) {
    lines.push('- None');
  } else {
    for (const warning of result.warnings) {
      const label = Object.values(COMPLETENESS_WARNINGS).includes(warning) ? 'Incomplete manifest: ' : 'Review term: ';
      lines.push('- ' + label + warning);
    }
  }
  lines.push('', '## Next Steps');
  for (const step of result.nextSteps) lines.push('- ' + step);
  return lines.join('\n') + '\n';
}

function singleLine(value) {
  return String(value).replace(/\r\n|[\r\n]/g, ' ');
}

function clean(value) {
  return String(value).replace(/[",]+$/g, '').trim();
}
