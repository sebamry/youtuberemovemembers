import { describe, expect, test } from 'vitest';

import { MAX_HISTORICAL_HIDDEN_VIDEO_IDS, normalizeChannelInput, readSettings, writeSettings } from '@shared/settings';

type StorageShape = {
  settings?: unknown;
};

function createStorage(initialState: StorageShape = {}) {
  let state = { ...initialState };

  return {
    async get(key: string) {
      return { [key]: state[key as keyof StorageShape] };
    },
    async set(value: StorageShape) {
      state = { ...state, ...value };
    }
  };
}

describe('extension settings', () => {
  test('returns defaults when storage is empty', async () => {
    const storage = createStorage();

    const settings = await readSettings(storage);

    expect(settings.enabled).toBe(true);
    expect(settings.surfaces.channel).toBe(true);
    expect(settings.surfaces.recommendations).toBe(true);
    expect(settings.surfaces.home).toBe(true);
    expect(settings.surfaces.search).toBe(true);
    expect(settings.surfaces.subscriptions).toBe(true);
    expect(settings.whitelist.channels).toEqual([]);
    expect(settings.stats.hiddenVideoIds).toEqual([]);
    expect(settings.stats.totalHiddenCount).toBe(0);
    expect(settings.appearance.theme).toBe('system');
  });

  test('merges partial stored values with defaults', async () => {
    const storage = createStorage({
      settings: {
        enabled: false,
        surfaces: {
          channel: true
        }
      }
    });

    const settings = await readSettings(storage);

    expect(settings.enabled).toBe(false);
    expect(settings.surfaces.channel).toBe(true);
    expect(settings.surfaces.recommendations).toBe(true);
    expect(settings.surfaces.search).toBe(true);
    expect(settings.whitelist.channels).toEqual([]);
    expect(settings.stats.hiddenVideoIds).toEqual([]);
    expect(settings.stats.totalHiddenCount).toBe(0);
    expect(settings.appearance.theme).toBe('system');
  });

  test('writes normalized settings back to storage', async () => {
    const storage = createStorage();

    await writeSettings(storage, {
      enabled: true,
      surfaces: {
        channel: false,
        recommendations: true,
        home: false,
        search: true,
        subscriptions: false
      },
      whitelist: {
        channels: [' https://www.youtube.com/@DemoChannel ', '@demochannel']
      },
      stats: {
        hiddenVideoIds: ['abc123', 'abc123', 'xyz987'],
        totalHiddenCount: 7
      },
      appearance: {
        theme: 'dark'
      }
    });

    const settings = await readSettings(storage);

    expect(settings.surfaces.channel).toBe(false);
    expect(settings.surfaces.home).toBe(false);
    expect(settings.surfaces.subscriptions).toBe(false);
    expect(settings.whitelist.channels).toEqual(['@demochannel']);
    expect(settings.stats.hiddenVideoIds).toEqual(['abc123', 'xyz987']);
    expect(settings.stats.totalHiddenCount).toBe(7);
    expect(settings.appearance.theme).toBe('dark');
  });

  test('derives the historical total from legacy hidden ids and caps stored dedupe ids', async () => {
    const storage = createStorage({
      settings: {
        stats: {
          hiddenVideoIds: Array.from({ length: MAX_HISTORICAL_HIDDEN_VIDEO_IDS + 25 }, (_, index) => `video-${index}`)
        }
      }
    });

    const settings = await readSettings(storage);

    expect(settings.stats.hiddenVideoIds).toHaveLength(MAX_HISTORICAL_HIDDEN_VIDEO_IDS);
    expect(settings.stats.hiddenVideoIds[0]).toBe('video-25');
    expect(settings.stats.totalHiddenCount).toBe(MAX_HISTORICAL_HIDDEN_VIDEO_IDS + 25);
  });

  test('normalizes supported channel whitelist inputs', () => {
    expect(normalizeChannelInput('@DemoChannel')).toBe('@demochannel');
    expect(normalizeChannelInput('https://www.youtube.com/@DemoChannel')).toBe('@demochannel');
    expect(normalizeChannelInput('https://www.youtube.com/@DemoChannel/videos')).toBe('@demochannel');
    expect(normalizeChannelInput('https://www.youtube.com/channel/UC123ABC')).toBe('channel:UC123ABC');
    expect(normalizeChannelInput('https://www.youtube.com/channel/UC123ABC/shorts')).toBe('channel:UC123ABC');
    expect(normalizeChannelInput(' https://www.youtube.com/c/MyChannel ')).toBe('c:mychannel');
    expect(normalizeChannelInput('not a channel')).toBeNull();
  });
});
