import { describe, expect, test } from 'vitest';

import { isChannelVideoPageUrl } from '@shared/selectors';

describe('channel video route gating', () => {
  test('recognizes supported channel video routes', () => {
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
