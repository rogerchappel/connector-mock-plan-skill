#!/usr/bin/env node
import { planConnectorMocks, toMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const usage = 'Usage: connector-mock-plan <file> [--format <markdown|json>]';

if (args.includes('--help')) {
  console.log(usage);
  process.exit(0);
}

let options;
try {
  options = parseArgs(args);
} catch (error) {
  console.error('connector-mock-plan: ' + error.message);
  console.error(usage);
  process.exit(2);
}

try {
  const result = planConnectorMocks(options.file);
  console.log(options.format === 'json' ? JSON.stringify(result, null, 2) : toMarkdown(result));
} catch (error) {
  console.error('connector-mock-plan: ' + error.message);
  process.exit(1);
}

function parseArgs(input) {
  let file;
  let format = 'markdown';

  for (let index = 0; index < input.length; index += 1) {
    const arg = input[index];
    if (arg === '--json') {
      format = 'json';
    } else if (arg === '--format') {
      const value = input[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--format requires a value');
      format = value;
      index += 1;
    } else if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length);
      if (!value) throw new Error('--format requires a value');
      format = value;
    } else if (arg.startsWith('--')) {
      throw new Error('unknown option: ' + arg);
    } else if (file) {
      throw new Error('unexpected argument: ' + arg);
    } else {
      file = arg;
    }
  }

  if (!file) throw new Error('missing input file');
  if (!['markdown', 'json'].includes(format)) throw new Error('unsupported format: ' + format);
  return { file, format };
}
