import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@shared/settings';
import { initPopup } from '../../src/popup/runtime';

function createStorage(settings = DEFAULT_SETTINGS) {
  let storedSettings = settings;

  return {
    get: vi.fn(async () => ({ settings: storedSettings })),
    set: vi.fn(async (value: { settings: typeof DEFAULT_SETTINGS }) => {
      storedSettings = value.settings;
    })
  };
}

function mountPopup(settings = DEFAULT_SETTINGS) {
  document.body.innerHTML = `
    <main id="app">
      <form id="popup-form"></form>
    </main>
  `;

  const storage = createStorage(settings);
  return {
    storage,
    ready: initPopup(document, storage)
  };
}

describe('popup controls', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('renders global and child toggles from stored settings', async () => {
    const { ready } = mountPopup({
      enabled: false,
      surfaces: {
        channel: true,
        recommendations: true,
        home: true,
        search: true,
        subscriptions: true
      }
    });

    await ready;

    const globalToggle = document.querySelector<HTMLInputElement>('#setting-enabled');
    const channelToggle = document.querySelector<HTMLInputElement>('#surface-channel');

    expect(globalToggle?.checked).toBe(false);
    expect(channelToggle?.disabled).toBe(true);
    expect(document.body.textContent).toContain('Los cambios se aplican al instante');
    expect(document.body.textContent).toContain('Paginas de canal');
  });

  test('writes updated settings immediately when a child toggle changes', async () => {
    const { storage, ready } = mountPopup();

    await ready;

    const homeToggle = document.querySelector<HTMLInputElement>('#surface-home');
    expect(homeToggle).not.toBeNull();

    homeToggle!.checked = false;
    homeToggle!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(storage.set).toHaveBeenCalledWith({
      settings: {
        enabled: true,
        surfaces: {
          channel: true,
          recommendations: true,
          home: false,
          search: true,
          subscriptions: true
        }
      }
    });
  });

  test('disables child controls when the global toggle is turned off', async () => {
    const { storage, ready } = mountPopup();

    await ready;

    const globalToggle = document.querySelector<HTMLInputElement>('#setting-enabled');

    globalToggle!.checked = false;
    globalToggle!.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    const searchToggle = document.querySelector<HTMLInputElement>('#surface-search');

    expect(searchToggle?.disabled).toBe(true);
    expect(storage.set).toHaveBeenCalledWith({
      settings: {
        enabled: false,
        surfaces: {
          channel: true,
          recommendations: true,
          home: true,
          search: true,
          subscriptions: true
        }
      }
    });
  });
});
