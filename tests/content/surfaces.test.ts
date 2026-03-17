import { describe, expect, test } from 'vitest';

import { getActiveSurfaceDetectors } from '@content/surfaces';

function getDetectorNames(url: string, html: string) {
  history.replaceState({}, '', url);
  document.body.innerHTML = html;

  return getActiveSurfaceDetectors(new URL(url), document).map((detector) => detector.key);
}

describe('surface detectors', () => {
  test('detects channel pages', () => {
    expect(
      getDetectorNames(
        'https://www.youtube.com/@demo/videos',
        '<ytd-rich-grid-media></ytd-rich-grid-media>'
      )
    ).toContain('channel');
  });

  test('detects channel home shelves', () => {
    expect(
      getDetectorNames(
        'https://www.youtube.com/@demo',
        `
          <ytd-shelf-renderer>
            <ytd-grid-video-renderer></ytd-grid-video-renderer>
          </ytd-shelf-renderer>
        `
      )
    ).toContain('channel');
  });

  test('detects home feed', () => {
    expect(
      getDetectorNames(
        'https://www.youtube.com/',
        '<ytd-rich-item-renderer></ytd-rich-item-renderer>'
      )
    ).toContain('home');
  });

  test('detects search results', () => {
    expect(
      getDetectorNames(
        'https://www.youtube.com/results?search_query=test',
        '<ytd-video-renderer></ytd-video-renderer>'
      )
    ).toContain('search');
  });

  test('detects subscriptions feed', () => {
    expect(
      getDetectorNames(
        'https://www.youtube.com/feed/subscriptions',
        '<ytd-rich-item-renderer></ytd-rich-item-renderer>'
      )
    ).toContain('subscriptions');
  });

  test('detects watch-page recommendations', () => {
    expect(
      getDetectorNames(
        'https://www.youtube.com/watch?v=abc',
        '<ytd-compact-video-renderer></ytd-compact-video-renderer>'
      )
    ).toContain('recommendations');
  });
});
