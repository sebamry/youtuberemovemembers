import { describe, expect, test } from 'vitest';

import { FILTERED_ATTRIBUTE, SURFACE_ATTRIBUTE, hideMembersOnlyVideosForCards, unhideMembersOnlyVideos } from '@content/filter-members';

describe('members-only card filtering', () => {
  test('marks member-only cards for hiding', () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer id="members-card">
        <div id="details">
          <ytd-badge-supported-renderer>
            <span>Miembros primero</span>
          </ytd-badge-supported-renderer>
        </div>
      </ytd-rich-item-renderer>
      <ytd-rich-item-renderer id="public-card">
        <div id="details">
          <ytd-badge-supported-renderer>
            <span>Publico</span>
          </ytd-badge-supported-renderer>
        </div>
      </ytd-rich-item-renderer>
    `;

    const hiddenCount = hideMembersOnlyVideosForCards(
      Array.from(document.querySelectorAll('ytd-rich-item-renderer')),
      'channel'
    );

    expect(hiddenCount).toBe(1);
    expect(document.querySelector('#members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(document.querySelector('#public-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
  });

  test('accepts thumbnail overlay badges as a supported badge structure', () => {
    document.body.innerHTML = `
      <ytd-grid-video-renderer id="overlay-card">
        <ytd-thumbnail-overlay-badge-supported-renderer aria-label="Members only"></ytd-thumbnail-overlay-badge-supported-renderer>
      </ytd-grid-video-renderer>
    `;

    hideMembersOnlyVideosForCards(Array.from(document.querySelectorAll('ytd-grid-video-renderer')), 'channel');

    expect(document.querySelector('#overlay-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
  });

  test('matches the modern channel grid card and badge shape used on YouTube channel pages', () => {
    document.body.innerHTML = `
      <ytd-rich-grid-media id="modern-members-card">
        <div id="details" class="style-scope ytd-rich-grid-media">
          <div id="metadata-line">
            <ytd-badge-supported-renderer>
              <div>
                <badge-shape
                  class="yt-badge-shape yt-badge-shape--membership yt-badge-shape--typography"
                  aria-label="Primero para miembros"
                >
                  Primero para miembros
                </badge-shape>
              </div>
            </ytd-badge-supported-renderer>
          </div>
        </div>
      </ytd-rich-grid-media>
    `;

    hideMembersOnlyVideosForCards(Array.from(document.querySelectorAll('ytd-rich-grid-media')), 'channel');

    expect(document.querySelector('#modern-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
  });

  test('unhides only the cards hidden for a specific surface', () => {
    document.body.innerHTML = `
      <ytd-rich-grid-media id="home-card" data-yt-remove-members="true" data-yt-remove-surface="home"></ytd-rich-grid-media>
      <ytd-rich-grid-media id="channel-card" data-yt-remove-members="true" data-yt-remove-surface="channel"></ytd-rich-grid-media>
    `;

    unhideMembersOnlyVideos(document, 'home');

    expect(document.querySelector('#home-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    expect(document.querySelector('#home-card')?.hasAttribute(SURFACE_ATTRIBUTE)).toBe(false);
    expect(document.querySelector('#channel-card')?.getAttribute(SURFACE_ATTRIBUTE)).toBe('channel');
  });
});
