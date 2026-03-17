import { describe, expect, test } from 'vitest';

import { readSettings, writeSettings } from '@shared/settings';

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
      }
    });

    const settings = await readSettings(storage);

    expect(settings.surfaces.channel).toBe(false);
    expect(settings.surfaces.home).toBe(false);
    expect(settings.surfaces.subscriptions).toBe(false);
  });
});
