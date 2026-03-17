import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { FILTERED_ATTRIBUTE, SURFACE_ATTRIBUTE } from '@content/filter-members';
import { bootstrapYouTubeMembersFilter } from '@content/runtime';

function createSettingsStore(initialSettings = {
  enabled: true,
  surfaces: {
    channel: true,
    recommendations: true,
    home: true,
    search: true,
    subscriptions: true
  }
}) {
  let settings = initialSettings;
  const listeners = new Set<() => void>();

  return {
    async read() {
      return settings;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async update(nextSettings: typeof initialSettings) {
      settings = nextSettings;
      listeners.forEach((listener) => listener());
    }
  };
}

function appendMembersOnlyCard(tagName = 'ytd-rich-item-renderer') {
  const host = document.querySelector('#items');
  if (!host) {
    throw new Error('expected #items host to exist');
  }

  host.insertAdjacentHTML(
    'beforeend',
    `
      <${tagName} id="late-members-card">
        <div id="details">
          <ytd-badge-supported-renderer>
            <span>Members only</span>
          </ytd-badge-supported-renderer>
        </div>
      </${tagName}>
    `
  );
}

async function flushTimersAndMutations() {
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(60);
  await Promise.resolve();
}

describe('members filter runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    history.replaceState({}, '', 'https://www.youtube.com/');
  });

  test('re-scans when matching content is appended on an active channel page', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/@demo/videos');
    document.body.innerHTML = '<div id="items"></div>';
    const settingsStore = createSettingsStore();

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);

    appendMembersOnlyCard();
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    runtime.dispose();
  });

  test('stays inactive on non-channel pages', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/watch?v=abc');
    document.body.innerHTML = '<div id="items"></div>';
    const settingsStore = createSettingsStore({
      enabled: true,
      surfaces: {
        channel: true,
        recommendations: false,
        home: true,
        search: true,
        subscriptions: true
      }
    });

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);

    appendMembersOnlyCard();
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    runtime.dispose();
  });

  test('reacts to yt-navigate-finish after a route change into a channel page', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/watch?v=abc');
    document.body.innerHTML = '<div id="items"></div>';
    const settingsStore = createSettingsStore();

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);

    history.replaceState({}, '', 'https://www.youtube.com/@demo/videos');
    appendMembersOnlyCard();
    document.dispatchEvent(new Event('yt-navigate-finish'));
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    runtime.dispose();
  });

  test('reacts to storage changes by unhiding a disabled surface', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = '<div id="items"></div>';
    appendMembersOnlyCard('ytd-rich-item-renderer');
    const settingsStore = createSettingsStore();

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.getAttribute(SURFACE_ATTRIBUTE)).toBe('home');

    await settingsStore.update({
      enabled: true,
      surfaces: {
        channel: true,
        recommendations: true,
        home: false,
        search: true,
        subscriptions: true
      }
    });
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    runtime.dispose();
  });
});
