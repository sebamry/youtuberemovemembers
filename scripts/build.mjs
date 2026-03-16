import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

async function copyStaticAssets() {
  await cp(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
}

async function startBuild() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(path.join(distDir, 'content'), { recursive: true });

  await build({
    entryPoints: {
      'content/main': path.join(rootDir, 'src/content/main.ts')
    },
    bundle: true,
    format: 'esm',
    target: 'chrome120',
    platform: 'browser',
    outdir: distDir,
    sourcemap: true,
    logLevel: 'info'
  });

  await copyStaticAssets();
}

startBuild().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
