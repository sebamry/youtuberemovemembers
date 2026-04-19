import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { regenerateIcons } from './release-utils.mjs';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const rootMirrorDirs = ['content', 'popup', 'options', 'icons'];

async function copyStaticAssets() {
  await cp(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
  await mkdir(path.join(distDir, 'popup'), { recursive: true });
  await mkdir(path.join(distDir, 'options'), { recursive: true });
  await mkdir(path.join(distDir, 'icons'), { recursive: true });
  await cp(path.join(rootDir, 'src/popup/index.html'), path.join(distDir, 'popup/index.html'));
  await cp(path.join(rootDir, 'src/options/index.html'), path.join(distDir, 'options/index.html'));
  await cp(path.join(rootDir, 'src/assets/icons/icon-16.png'), path.join(distDir, 'icons/icon-16.png'));
  await cp(path.join(rootDir, 'src/assets/icons/icon-32.png'), path.join(distDir, 'icons/icon-32.png'));
  await cp(path.join(rootDir, 'src/assets/icons/icon-48.png'), path.join(distDir, 'icons/icon-48.png'));
  await cp(path.join(rootDir, 'src/assets/icons/icon-128.png'), path.join(distDir, 'icons/icon-128.png'));
}

async function mirrorBuildToRoot() {
  await Promise.all(
    rootMirrorDirs.map(async (dirName) => {
      await rm(path.join(rootDir, dirName), { recursive: true, force: true });
      await cp(path.join(distDir, dirName), path.join(rootDir, dirName), { recursive: true });
    })
  );
}

async function startBuild() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(path.join(distDir, 'content'), { recursive: true });
  await mkdir(path.join(distDir, 'popup'), { recursive: true });
  await mkdir(path.join(distDir, 'options'), { recursive: true });

  await regenerateIcons();

  await build({
    entryPoints: {
      'content/main': path.join(rootDir, 'src/content/main.ts'),
      'popup/main': path.join(rootDir, 'src/popup/main.ts'),
      'options/main': path.join(rootDir, 'src/options/main.ts')
    },
    bundle: true,
    format: 'iife',
    target: 'chrome120',
    platform: 'browser',
    outdir: distDir,
    sourcemap: true,
    logLevel: 'info'
  });

  await copyStaticAssets();
  await mirrorBuildToRoot();
}

startBuild().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
