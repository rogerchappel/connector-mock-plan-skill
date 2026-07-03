#!/usr/bin/env node
import { planConnectorMocks, toMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith('--'));
const format = args.includes('--format=json') || args.includes('--json') ? 'json' : 'markdown';

if (!file || args.includes('--help')) {
  console.log('Usage: connector-mock-plan <file> [--format=json]');
  process.exit(file ? 0 : 1);
}

try {
  const result = planConnectorMocks(file);
  console.log(format === 'json' ? JSON.stringify(result, null, 2) : toMarkdown(result));
} catch (error) {
  console.error('connector-mock-plan: ' + error.message);
  process.exit(1);
}
