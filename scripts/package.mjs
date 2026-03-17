import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const version = '1.0.0';
const zipPath = path.join(releaseDir, `youtube-members-filter-v${version}.zip`);

async function run() {
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
