import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();

async function run() {
  const tempDir = path.join(rootDir, '.tmp-bench');
  const outfile = path.join(tempDir, 'runtime-benchmark.cjs');

  try {
    await mkdir(tempDir, { recursive: true });
    await build({
      entryPoints: [path.join(rootDir, 'tests/perf/runtime.perf.ts')],
      outfile,
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      sourcemap: false,
      logLevel: 'silent',
      external: ['jsdom'],
      alias: {
        '@content': path.join(rootDir, 'src/content'),
        '@shared': path.join(rootDir, 'src/shared')
      }
    });

    await import(pathToFileURL(outfile).href);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
