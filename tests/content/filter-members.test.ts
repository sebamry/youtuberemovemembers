import { describe, expect, test, vi } from 'vitest';

import {
  FILTERED_ATTRIBUTE,
  SURFACE_ATTRIBUTE,
  hideMemberOnlyShelves,
  hideMembersOnlyVideosForCards,
  syncMembersOnlyVideoCard,
  unhideMembersOnlyVideos
} from '@content/filter-members';

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

    const result = hideMembersOnlyVideosForCards(
      Array.from(document.querySelectorAll('ytd-rich-item-renderer')),
      'channel'
    );

    expect(result.hiddenCount).toBe(1);
    expect(result.hiddenVideoIds).toEqual([]);
    expect(document.querySelector('#members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(document.querySelector('#public-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
  });

  test('accepts thumbnail overlay badges as a supported badge structure', () => {
    document.body.innerHTML = `
      <ytd-grid-video-renderer id="overlay-card">
        <ytd-thumbnail-overlay-badge-supported-renderer aria-label="Members only"></ytd-thumbnail-overlay-badge-supported-renderer>
      </ytd-grid-video-renderer>
    `;

    const result = hideMembersOnlyVideosForCards(Array.from(document.querySelectorAll('ytd-grid-video-renderer')), 'channel');

    expect(result.hiddenCount).toBe(1);
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

    const result = hideMembersOnlyVideosForCards(Array.from(document.querySelectorAll('ytd-rich-grid-media')), 'channel');

    expect(result.hiddenCount).toBe(1);
    expect(document.querySelector('#modern-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
  });

  test('matches membership badges by structural membership class even without localized text', () => {
    document.body.innerHTML = `
      <ytd-grid-video-renderer id="membership-class-card">
        <a href="/watch?v=membership123">Video</a>
        <ytd-badge-supported-renderer id="video-badges">
          <badge-shape class="yt-badge-shape yt-badge-shape--membership yt-badge-shape--typography"></badge-shape>
        </ytd-badge-supported-renderer>
      </ytd-grid-video-renderer>
    `;

    const result = hideMembersOnlyVideosForCards(Array.from(document.querySelectorAll('ytd-grid-video-renderer')), 'channel');

    expect(result.hiddenCount).toBe(1);
    expect(result.hiddenVideoIds).toEqual(['membership123']);
    expect(document.querySelector('#membership-class-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
  });

  test('matches direct badge-shape membership labels used in newer home feed cards', () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer id="direct-badge-card">
        <a href="/watch?v=directbadge1">Video</a>
        <div id="details">
          <div id="badges">
            <badge-shape aria-label="Solo para miembros">Solo para miembros</badge-shape>
          </div>
        </div>
      </ytd-rich-item-renderer>
    `;

    const result = hideMembersOnlyVideosForCards(Array.from(document.querySelectorAll('ytd-rich-item-renderer')), 'home');

    expect(result.hiddenCount).toBe(1);
    expect(result.hiddenVideoIds).toEqual(['directbadge1']);
    expect(document.querySelector('#direct-badge-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
  });

  test('hides a full channel-home shelf when all shelf videos are members-only', () => {
    document.body.innerHTML = `
      <ytd-shelf-renderer id="members-shelf">
        <ytd-grid-video-renderer id="members-card-1">
          <a href="/watch?v=member1111111">Video</a>
          <ytd-badge-supported-renderer id="video-badges">
            <badge-shape class="yt-badge-shape yt-badge-shape--membership yt-badge-shape--typography"></badge-shape>
          </ytd-badge-supported-renderer>
        </ytd-grid-video-renderer>
        <ytd-grid-video-renderer id="members-card-2">
          <a href="/watch?v=member2222222">Video</a>
          <ytd-badge-supported-renderer id="video-badges">
            <badge-shape class="yt-badge-shape yt-badge-shape--membership yt-badge-shape--typography"></badge-shape>
          </ytd-badge-supported-renderer>
        </ytd-grid-video-renderer>
      </ytd-shelf-renderer>
      <ytd-shelf-renderer id="mixed-shelf">
        <ytd-grid-video-renderer id="public-card">
          <a href="/watch?v=public3333333">Video</a>
        </ytd-grid-video-renderer>
        <ytd-grid-video-renderer id="member-card">
          <a href="/watch?v=member4444444">Video</a>
          <ytd-badge-supported-renderer id="video-badges">
            <badge-shape class="yt-badge-shape yt-badge-shape--membership yt-badge-shape--typography"></badge-shape>
          </ytd-badge-supported-renderer>
        </ytd-grid-video-renderer>
      </ytd-shelf-renderer>
    `;

    const result = hideMemberOnlyShelves(Array.from(document.querySelectorAll('ytd-shelf-renderer')), 'channel');

    expect(result.hiddenCount).toBe(1);
    expect(result.hiddenVideoIds).toEqual(['member1111111', 'member2222222']);
    expect(document.querySelector('#members-shelf')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(document.querySelector('#mixed-shelf')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
  });

  test('does not hide videos from whitelisted channels and returns unique hidden video ids', () => {
    document.body.innerHTML = `
      <ytd-video-renderer id="members-card">
        <a href="/watch?v=abc123xyz89">Video</a>
        <a href="/@AllowedChannel">Allowed</a>
        <ytd-badge-supported-renderer>
          <span>Members only</span>
        </ytd-badge-supported-renderer>
      </ytd-video-renderer>
      <ytd-video-renderer id="hidden-card">
        <a href="/watch?v=xyz98765432">Video</a>
        <a href="/@BlockedChannel">Blocked</a>
        <ytd-badge-supported-renderer>
          <span>Members only</span>
        </ytd-badge-supported-renderer>
      </ytd-video-renderer>
    `;

    const result = hideMembersOnlyVideosForCards(Array.from(document.querySelectorAll('ytd-video-renderer')), 'home', {
      whitelistChannels: ['@allowedchannel']
    });

    expect(result.hiddenCount).toBe(1);
    expect(result.hiddenVideoIds).toEqual(['xyz98765432']);
    expect(document.querySelector('#members-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    expect(document.querySelector('#hidden-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
  });

  test('does not scan channel links when whitelist is empty', () => {
    document.body.innerHTML = `
      <ytd-video-renderer id="members-card">
        <a href="/watch?v=abc123xyz89">Video</a>
        <a href="/@BlockedChannel">Blocked</a>
        <ytd-badge-supported-renderer>
          <span>Members only</span>
        </ytd-badge-supported-renderer>
      </ytd-video-renderer>
    `;

    const querySelectorAllSpy = vi.spyOn(Element.prototype, 'querySelectorAll');
    const card = document.querySelector('#members-card');
    if (!card) {
      throw new Error('expected members card');
    }

    syncMembersOnlyVideoCard(card, 'home');

    const anchorQueryCalls = querySelectorAllSpy.mock.calls.filter((call) => call[0] === 'a[href]').length;
    expect(anchorQueryCalls).toBe(1);
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
