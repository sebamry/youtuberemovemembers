import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS, type ExtensionSettings } from '@shared/settings';
import { initPopup } from '../../src/popup/runtime';

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    surfaces: {
      ...DEFAULT_SETTINGS.surfaces,
      ...overrides.surfaces
    },
    whitelist: {
      ...DEFAULT_SETTINGS.whitelist,
      ...overrides.whitelist
    },
    stats: {
      ...DEFAULT_SETTINGS.stats,
      ...overrides.stats
    }
  };
}

function createStorage(settings = DEFAULT_SETTINGS) {
  let storedSettings = settings;

  return {
    get: vi.fn(async () => ({ settings: storedSettings })),
    set: vi.fn(async (value: Record<string, unknown>) => {
      storedSettings = value.settings as typeof DEFAULT_SETTINGS;
    })
  };
}

function mountPopup(settings = DEFAULT_SETTINGS, pageHiddenCount = 0) {
  document.body.innerHTML = `
    <main id="app">
      <form id="popup-form"></form>
    </main>
  `;

  const storage = createStorage(settings);
  const environment = {
    storage,
    getCurrentPageStats: vi.fn(async () => ({ hiddenCount: pageHiddenCount })),
    openOptionsPage: vi.fn(async () => {})
  };

  return {
    storage,
    environment,
    ready: initPopup(document, environment)
  };
}

describe('popup controls', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('renders global and child toggles from stored settings', async () => {
    const { ready } = mountPopup(
      makeSettings({
        enabled: false
      })
    );

    await ready;

    const globalToggle = document.querySelector<HTMLInputElement>('#setting-enabled');
    const channelToggle = document.querySelector<HTMLInputElement>('#surface-channel');

    expect(globalToggle?.checked).toBe(false);
    expect(channelToggle?.disabled).toBe(true);
    expect(document.querySelectorAll('.setting-row')).toHaveLength(6);
    expect(document.querySelector('.settings-card')).not.toBeNull();
    expect(document.body.textContent).toContain('En esta pagina');
    expect(document.body.textContent).toContain('Total ocultados');
    expect(document.body.textContent).toContain('Whitelist y ajustes');
    expect(document.body.textContent).toContain('Activa el filtro en YouTube');
    expect(document.body.textContent).not.toContain('Oculta videos para miembros');
    expect(document.body.textContent).toContain('Paginas de canal');
  });

  test('writes updated settings immediately when a child toggle changes', async () => {
    const { storage, ready } = mountPopup();

    await ready;

    const homeToggle = document.querySelector<HTMLInputElement>('#surface-home');
    expect(homeToggle).not.toBeNull();

    homeToggle!.checked = false;
    homeToggle!.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(storage.set).toHaveBeenCalledWith({
      settings: {
        enabled: true,
        surfaces: {
          channel: true,
          recommendations: true,
          home: false,
          search: true,
          subscriptions: true
        },
        whitelist: {
          channels: []
        },
        stats: {
          hiddenVideoIds: []
        },
        appearance: {
          theme: 'system'
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
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

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
        },
        whitelist: {
          channels: []
        },
        stats: {
          hiddenVideoIds: []
        },
        appearance: {
          theme: 'system'
        }
      }
    });
  });

  test('renders current-page and historical counts and opens options page', async () => {
    const { environment, ready } = mountPopup(
      {
        ...DEFAULT_SETTINGS,
        stats: {
          hiddenVideoIds: ['abc123', 'xyz987']
        }
      },
      3
    );

    await ready;

    expect(document.body.textContent).toContain('3');
    expect(document.body.textContent).toContain('2');

    document.querySelector<HTMLButtonElement>('#open-options')?.click();

    expect(environment.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  test('applies the persisted theme preference to the popup document', async () => {
    const { ready } = mountPopup(
      makeSettings({
        appearance: {
          theme: 'dark'
        }
      })
    );

    await ready;

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
