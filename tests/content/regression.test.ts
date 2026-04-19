import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { FILTERED_ATTRIBUTE } from '@content/filter-members';
import { bootstrapYouTubeMembersFilter } from '@content/runtime';
import { DEFAULT_SETTINGS, type ExtensionSettings } from '@shared/settings';

function readFixture(name: string) {
  return readFileSync(path.resolve(__dirname, '../fixtures/content', name), 'utf8');
}

type SettingsOverrides = Partial<Omit<ExtensionSettings, 'surfaces' | 'whitelist' | 'stats' | 'appearance'>> & {
  surfaces?: Partial<ExtensionSettings['surfaces']>;
  whitelist?: Partial<ExtensionSettings['whitelist']>;
  stats?: Partial<ExtensionSettings['stats']>;
  appearance?: Partial<ExtensionSettings['appearance']>;
};

function makeSettings(overrides: SettingsOverrides = {}): ExtensionSettings {
  return {
    enabled: overrides.enabled ?? DEFAULT_SETTINGS.enabled,
    surfaces: {
      ...DEFAULT_SETTINGS.surfaces,
      ...(overrides.surfaces ?? {})
    },
    whitelist: {
      ...DEFAULT_SETTINGS.whitelist,
      ...(overrides.whitelist ?? {})
    },
    stats: {
      ...DEFAULT_SETTINGS.stats,
      ...(overrides.stats ?? {})
    },
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...(overrides.appearance ?? {})
    }
  };
}

function createSettingsStore(initialSettings: ExtensionSettings = makeSettings()) {
  let settings = initialSettings;
  const listeners = new Set<() => void>();

  return {
    async read() {
      return settings;
    },
    async write(nextSettings: ExtensionSettings) {
      settings = nextSettings;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

async function flushTimersAndMutations() {
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(60);
  await Promise.resolve();
}

describe('regression coverage for known YouTube DOM shapes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    history.replaceState({}, '', 'https://www.youtube.com/');
  });

  test('hides the full members-only shelf on a channel home fixture', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/@demo');
    document.body.innerHTML = readFixture('channel-home-members-shelf.html');

    const runtime = await bootstrapYouTubeMembersFilter(window, document, createSettingsStore());
    await flushTimersAndMutations();

    expect(document.querySelector('#members-shelf')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(runtime.getPageHiddenCount()).toBe(2);
    runtime.dispose();
  });

  test('does not hide a public shelf on a channel home fixture', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/@demo');
    document.body.innerHTML = readFixture('channel-home-public-shelf.html');

    const runtime = await bootstrapYouTubeMembersFilter(window, document, createSettingsStore());
    await flushTimersAndMutations();

    expect(document.querySelector('#public-shelf')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    expect(runtime.getPageHiddenCount()).toBe(0);
    runtime.dispose();
  });

  test('hides only the members-only cards in the modern channel videos grid fixture', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/@demo/videos');
    document.body.innerHTML = readFixture('channel-videos-modern-grid.html');

    const runtime = await bootstrapYouTubeMembersFilter(window, document, createSettingsStore());
    await flushTimersAndMutations();

    expect(document.querySelector('#members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(document.querySelector('#public-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    expect(runtime.getPageHiddenCount()).toBe(1);
    runtime.dispose();
  });
});
