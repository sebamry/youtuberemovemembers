import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

const repositoryUrl = 'https://github.com/sebamry/youtuberemovemembers';

describe('chrome web store readiness docs', () => {
  test('publishing docs point at real public URLs instead of placeholders', () => {
    const readme = readFileSync('README.md', 'utf8');
    const listing = readFileSync('docs/chrome-web-store/listing.md', 'utf8');

    expect(readme).not.toContain('<your-user>');
    expect(readme).toContain(`${repositoryUrl}/issues`);
    expect(listing).not.toContain('<your-user>');
    expect(listing).toContain(repositoryUrl);
  });

  test('repo includes the store assets needed for submission', () => {
    expect(existsSync('docs/chrome-web-store/assets/store-screenshot-overview.png')).toBe(true);
    expect(existsSync('docs/chrome-web-store/assets/store-screenshot-settings.png')).toBe(true);
    expect(existsSync('docs/chrome-web-store/assets/store-small-promo-tile.png')).toBe(true);
  });
});
