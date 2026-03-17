import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { beforeAll, describe, expect, test } from 'vitest';

beforeAll(() => {
  execFileSync('node', ['scripts/build.mjs'], { stdio: 'pipe' });
});

describe('build output', () => {
  test('produces a manifest with a YouTube content script', () => {
    expect(existsSync('dist/manifest.json')).toBe(true);

    const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('storage');
    expect(manifest.content_scripts[0].matches).toContain('https://www.youtube.com/*');
    expect(manifest.content_scripts[0].js).toContain('content/main.js');
    expect(manifest.content_scripts[0].css).toContain('content/main.css');
    expect(manifest.action.default_popup).toBe('popup/index.html');
  });

  test('emits a classic content script without ESM export syntax', () => {
    const contentScript = readFileSync('dist/content/main.js', 'utf8');

    expect(contentScript).not.toContain('export {');
    expect(contentScript).not.toContain('export{');
  });
});
