import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { FILTERED_ATTRIBUTE, SURFACE_ATTRIBUTE } from '@content/filter-members';
import { bootstrapYouTubeMembersFilter } from '@content/runtime';
import { type ExtensionSettings } from '@shared/settings';

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return {
    enabled: true,
    surfaces: {
      channel: true,
      recommendations: true,
      home: true,
      search: true,
      subscriptions: true,
      ...overrides.surfaces
    },
    whitelist: {
      channels: [],
      ...overrides.whitelist
    },
    stats: {
      hiddenVideoIds: [],
      ...overrides.stats
    },
    appearance: {
      theme: 'system',
      ...overrides.appearance
    },
    ...overrides
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
    const settingsStore = createSettingsStore(
      makeSettings({
        surfaces: {
          channel: true,
          recommendations: false,
          home: true,
          search: true,
          subscriptions: true
        }
      })
    );

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

  test('hides a members-only shelf on the channel home page', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/@demo');
    document.body.innerHTML = `
      <ytd-shelf-renderer id="members-shelf">
        <ytd-grid-video-renderer>
          <a href="/watch?v=member1111111">Video</a>
          <ytd-badge-supported-renderer id="video-badges">
            <badge-shape class="yt-badge-shape yt-badge-shape--membership yt-badge-shape--typography"></badge-shape>
          </ytd-badge-supported-renderer>
        </ytd-grid-video-renderer>
        <ytd-grid-video-renderer>
          <a href="/watch?v=member2222222">Video</a>
          <ytd-badge-supported-renderer id="video-badges">
            <badge-shape class="yt-badge-shape yt-badge-shape--membership yt-badge-shape--typography"></badge-shape>
          </ytd-badge-supported-renderer>
        </ytd-grid-video-renderer>
      </ytd-shelf-renderer>
    `;
    const settingsStore = createSettingsStore();

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    await flushTimersAndMutations();

    expect(document.querySelector('#members-shelf')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(runtime.getPageHiddenCount()).toBe(2);
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

    await settingsStore.update(
      makeSettings({
        surfaces: {
          channel: true,
          recommendations: true,
          home: false,
          search: true,
          subscriptions: true
        }
      })
    );
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    runtime.dispose();
  });

  test('tracks unique hidden video ids for the page and persists historical ids', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = `
      <div id="items">
        <ytd-rich-item-renderer id="first-card">
          <a href="/watch?v=abc123xyz89">Video</a>
          <a href="/@blockedchannel">Blocked</a>
          <ytd-badge-supported-renderer><span>Members only</span></ytd-badge-supported-renderer>
        </ytd-rich-item-renderer>
        <ytd-rich-item-renderer id="duplicate-card">
          <a href="/watch?v=abc123xyz89">Video</a>
          <a href="/@blockedchannel">Blocked</a>
          <ytd-badge-supported-renderer><span>Members only</span></ytd-badge-supported-renderer>
        </ytd-rich-item-renderer>
      </div>
    `;

    const settingsStore = createSettingsStore();
    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    await flushTimersAndMutations();

    expect(runtime.getPageHiddenCount()).toBe(1);
    expect((await settingsStore.read()).stats.hiddenVideoIds).toEqual(['abc123xyz89']);
    runtime.dispose();
  });

  test('responds to popup stat requests through chrome runtime messaging', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = `
      <div id="items">
        <ytd-rich-item-renderer id="first-card">
          <a href="/watch?v=abc123xyz89">Video</a>
          <a href="/@blockedchannel">Blocked</a>
          <ytd-badge-supported-renderer><span>Members only</span></ytd-badge-supported-renderer>
        </ytd-rich-item-renderer>
      </div>
    `;

    const listeners = new Set<(message: unknown, sender: unknown, sendResponse: (value: unknown) => void) => void>();
    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: (listener: (message: unknown, sender: unknown, sendResponse: (value: unknown) => void) => void) =>
            listeners.add(listener),
          removeListener: (listener: (message: unknown, sender: unknown, sendResponse: (value: unknown) => void) => void) =>
            listeners.delete(listener)
        }
      }
    });

    const runtime = await bootstrapYouTubeMembersFilter(window, document, createSettingsStore());
    await flushTimersAndMutations();

    let response: unknown;
    listeners.forEach((listener) => {
      listener({ type: 'yt-members-filter:get-page-stats' }, {}, (value) => {
        response = value;
      });
    });

    expect(response).toEqual({ hiddenCount: 1 });
    runtime.dispose();
    vi.unstubAllGlobals();
  });
});
