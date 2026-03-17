import { describe, expect, test } from 'vitest';

import { extractChannelKeyFromUrl, extractChannelKeysFromCard, extractVideoIdFromCard } from '@shared/selectors';

describe('youtube card selectors', () => {
  test('extracts a watch video id from a card link', () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer id="card">
        <a href="/watch?v=abc123xyz89">Video</a>
      </ytd-rich-item-renderer>
    `;

    expect(extractVideoIdFromCard(document.querySelector('#card')!)).toBe('abc123xyz89');
  });

  test('extracts a shorts video id from a card link', () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer id="card">
        <a href="/shorts/short1234567">Short</a>
      </ytd-rich-item-renderer>
    `;

    expect(extractVideoIdFromCard(document.querySelector('#card')!)).toBe('short1234567');
  });

  test('extracts normalized channel keys from channel links inside a card', () => {
    document.body.innerHTML = `
      <ytd-video-renderer id="card">
        <a href="/@DemoChannel">Demo</a>
        <a href="/channel/UC123ABC">Fallback</a>
      </ytd-video-renderer>
    `;

    expect(extractChannelKeysFromCard(document.querySelector('#card')!)).toEqual(['@demochannel', 'channel:UC123ABC']);
  });

  test('extracts a normalized channel key from a channel page url', () => {
    expect(extractChannelKeyFromUrl(new URL('https://www.youtube.com/@DemoChannel/videos'))).toBe('@demochannel');
    expect(extractChannelKeyFromUrl(new URL('https://www.youtube.com/channel/UC123ABC/videos'))).toBe('channel:UC123ABC');
    expect(extractChannelKeyFromUrl(new URL('https://www.youtube.com/watch?v=abc'))).toBeNull();
  });
});
