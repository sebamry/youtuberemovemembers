import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { readReleaseMetadata } from './release-utils.mjs';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');

async function run() {
  const releaseMetadata = await readReleaseMetadata({ rootDir });
  const zipPath = path.join(releaseDir, releaseMetadata.zipFileName);
  await execFileAsync('node', ['scripts/build.mjs'], { cwd: rootDir });
  await mkdir(releaseDir, { recursive: true });
  await rm(zipPath, { force: true });
  await execFileAsync('zip', ['-r', zipPath, '.', '-x', '*.map', '*/*.map'], { cwd: distDir });
  console.log(zipPath);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
