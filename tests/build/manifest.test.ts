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
    expect(manifest.permissions).not.toContain('tabs');
    expect(manifest.content_scripts[0].matches).toContain('https://www.youtube.com/*');
    expect(manifest.content_scripts[0].js).toContain('content/main.js');
    expect(manifest.content_scripts[0].css).toContain('content/main.css');
    expect(manifest.icons['16']).toBe('icons/icon-16.png');
    expect(manifest.action.default_icon['32']).toBe('icons/icon-32.png');
    expect(manifest.action.default_popup).toBe('popup/index.html');
    expect(manifest.options_page).toBe('options/index.html');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.description).toContain('member-only shelves');
  });

  test('emits a classic content script without ESM export syntax', () => {
    const contentScript = readFileSync('dist/content/main.js', 'utf8');

    expect(contentScript).not.toContain('export {');
    expect(contentScript).not.toContain('export{');
  });

  test('links popup html to the built stylesheet', () => {
    const popupHtml = readFileSync('dist/popup/index.html', 'utf8');

    expect(popupHtml).toContain('href="./main.css"');
  });

  test('emits the options page assets', () => {
    expect(existsSync('dist/options/index.html')).toBe(true);
    expect(existsSync('dist/options/main.js')).toBe(true);
    expect(existsSync('dist/options/main.css')).toBe(true);
    expect(existsSync('dist/icons/icon-16.png')).toBe(true);
    expect(existsSync('dist/icons/icon-32.png')).toBe(true);
    expect(existsSync('dist/icons/icon-48.png')).toBe(true);
    expect(existsSync('dist/icons/icon-128.png')).toBe(true);
  });

  test('mirrors built extension assets to the project root for direct Chrome loading', () => {
    expect(existsSync('content/main.js')).toBe(true);
    expect(existsSync('content/main.css')).toBe(true);
    expect(existsSync('popup/index.html')).toBe(true);
    expect(existsSync('popup/main.js')).toBe(true);
    expect(existsSync('options/index.html')).toBe(true);
    expect(existsSync('options/main.js')).toBe(true);
    expect(existsSync('icons/icon-16.png')).toBe(true);
    expect(existsSync('icons/icon-128.png')).toBe(true);
  });
});
