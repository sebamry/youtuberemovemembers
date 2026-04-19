import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { readReleaseMetadata, regenerateIcons } from '../../scripts/release-utils.mjs';

const ICON_SIZES = [16, 32, 48, 128];

const tempDirs: string[] = [];

async function makeTempDir() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'members-filter-release-'));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('readReleaseMetadata', () => {
  test('reads a synchronized release version from manifest and package metadata', async () => {
    const rootDir = await makeTempDir();
    await writeFile(
      path.join(rootDir, 'package.json'),
      JSON.stringify({
        name: 'members-only-filter-extension',
        version: '1.2.3'
      })
    );
    await writeFile(
      path.join(rootDir, 'manifest.json'),
      JSON.stringify({
        version: '1.2.3'
      })
    );

    const metadata = await readReleaseMetadata({ rootDir });

    expect(metadata.version).toBe('1.2.3');
    expect(metadata.zipFileName).toBe('members-only-filter-v1.2.3.zip');
  });

  test('throws when package and manifest versions drift apart', async () => {
    const rootDir = await makeTempDir();
    await writeFile(path.join(rootDir, 'package.json'), JSON.stringify({ version: '1.2.3' }));
    await writeFile(path.join(rootDir, 'manifest.json'), JSON.stringify({ version: '2.0.0' }));

    await expect(readReleaseMetadata({ rootDir })).rejects.toThrow(/version/i);
  });
});

describe('regenerateIcons', () => {
  test('keeps committed png icons when rasterization fails but pngs already exist', async () => {
    const rootDir = await makeTempDir();
    const iconsDir = path.join(rootDir, 'src/assets/icons');
    await mkdir(iconsDir, { recursive: true });
    await writeFile(path.join(iconsDir, 'icon-base.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await Promise.all(
      ICON_SIZES.map((size) => writeFile(path.join(iconsDir, `icon-${size}.png`), `png-${size}`))
    );

    const runCommand = vi.fn(async () => {
      const error = new Error('Cannot extract image from file');
      Object.assign(error, { code: 13 });
      throw error;
    });

    const result = await regenerateIcons({
      rootDir,
      runCommand,
      warn: vi.fn()
    });

    expect(result.usedFallback).toBe(true);
    expect(runCommand).toHaveBeenCalledTimes(ICON_SIZES.length);
  });
});
