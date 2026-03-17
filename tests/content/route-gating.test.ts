import { describe, expect, test } from 'vitest';

import { isChannelVideoPageUrl } from '@shared/selectors';

describe('channel route gating', () => {
  test('recognizes supported channel routes, including the channel home page', () => {
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/@demo'))).toBe(true);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/c/demo'))).toBe(true);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/user/demo'))).toBe(true);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/channel/abc123'))).toBe(true);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/@demo/videos'))).toBe(true);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/c/demo/videos'))).toBe(true);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/user/demo/videos'))).toBe(true);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/channel/abc123/videos'))).toBe(true);
  });

  test('ignores non-channel or non-video routes', () => {
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/watch?v=abc'))).toBe(false);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/'))).toBe(false);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/results?search_query=test'))).toBe(false);
    expect(isChannelVideoPageUrl(new URL('https://www.youtube.com/@demo/shorts'))).toBe(false);
  });
});
