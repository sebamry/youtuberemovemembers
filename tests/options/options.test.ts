import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@shared/settings';
import { initOptionsPage } from '../../src/options/runtime';

function createStorage(settings = DEFAULT_SETTINGS) {
  let storedSettings = settings;

  return {
    get: vi.fn(async () => ({ settings: storedSettings })),
    set: vi.fn(async (value: Record<string, unknown>) => {
      storedSettings = value.settings as typeof DEFAULT_SETTINGS;
    })
  };
}

function mountOptions(settings = DEFAULT_SETTINGS) {
  document.body.innerHTML = `
    <main id="app">
      <div id="options-root"></div>
    </main>
  `;

  const storage = createStorage(settings);

  return {
    storage,
    ready: initOptionsPage(document, { storage })
  };
}

describe('options page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('renders saved whitelist entries and total count', async () => {
    const { ready } = mountOptions({
      ...DEFAULT_SETTINGS,
      whitelist: {
        channels: ['@demochannel']
      },
      stats: {
        hiddenVideoIds: ['abc123', 'xyz987']
      }
    });

    await ready;

    expect(document.body.textContent).toContain('Whitelist de canales');
    expect(document.body.textContent).toContain('Apariencia');
    expect(document.body.textContent).toContain('@demochannel');
    expect(document.body.textContent).toContain('2');
  });

  test('adds a normalized whitelist channel', async () => {
    const { storage, ready } = mountOptions();

    await ready;

    const input = document.querySelector<HTMLInputElement>('#channel-input');
    const addButton = document.querySelector<HTMLButtonElement>('#add-channel');

    input!.value = 'https://www.youtube.com/@DemoChannel/videos';
    addButton!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(storage.set).toHaveBeenCalledWith({
      settings: {
        ...DEFAULT_SETTINGS,
        whitelist: {
          channels: ['@demochannel']
        }
      }
    });
  });

  test('updates the persisted theme preference', async () => {
    const { storage, ready } = mountOptions();

    await ready;

    document.querySelector<HTMLButtonElement>('[data-theme-value="dark"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(storage.set).toHaveBeenCalledWith({
      settings: {
        ...DEFAULT_SETTINGS,
        appearance: {
          theme: 'dark'
        }
      }
    });
  });

  test('resets the historical hidden count', async () => {
    const { storage, ready } = mountOptions({
      ...DEFAULT_SETTINGS,
      stats: {
        hiddenVideoIds: ['abc123']
      }
    });

    await ready;

    document.querySelector<HTMLButtonElement>('#reset-total')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(storage.set).toHaveBeenCalledWith({
      settings: {
        ...DEFAULT_SETTINGS,
        stats: {
          hiddenVideoIds: []
        }
      }
    });
  });
});
