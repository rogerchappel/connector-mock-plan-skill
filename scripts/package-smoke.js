#!/usr/bin/env node
import { accessSync, constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import packageJson from '../package.json' with { type: 'json' };

const requiredFiles = [
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SKILL.md',
  'docs/RELEASE_CANDIDATE.md',
  'examples/sample-output.md'
];

for (const file of requiredFiles) {
  accessSync(join(process.cwd(), file), constants.R_OK);
}

for (const [name, relativePath] of Object.entries(packageJson.bin || {})) {
  const binPath = join(process.cwd(), relativePath);
  accessSync(binPath, constants.R_OK | constants.X_OK);

  const result = spawnSync(process.execPath, [binPath, '--help'], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`${name} --help exited with status ${result.status}`);
  }

  if (!result.stdout.includes('Usage:')) {
    throw new Error(`${name} --help did not print usage text`);
  }
}

const pack = spawnSync('npm', ['pack', '--dry-run'], {
  encoding: 'utf8',
  stdio: 'pipe'
});

if (pack.status !== 0) {
  process.stdout.write(pack.stdout);
  process.stderr.write(pack.stderr);
  throw new Error(`npm pack --dry-run exited with status ${pack.status}`);
}

for (const file of requiredFiles) {
  if (!pack.stdout.includes(file) && !pack.stderr.includes(file)) {
    throw new Error(`npm pack --dry-run output did not mention ${file}`);
  }
}
