import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { FILTERED_ATTRIBUTE, SURFACE_ATTRIBUTE } from '@content/filter-members';
import { bootstrapYouTubeMembersFilter } from '@content/runtime';
import { DEFAULT_SETTINGS, type ExtensionSettings } from '@shared/settings';

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
  let writeCount = 0;

  return {
    async read() {
      return settings;
    },
    async write(nextSettings: ExtensionSettings) {
      writeCount += 1;
      settings = nextSettings;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async update(nextSettings: typeof initialSettings) {
      settings = nextSettings;
      listeners.forEach((listener) => listener());
    },
    getWriteCount() {
      return writeCount;
    }
  };
}

function appendMembersOnlyCard(tagName = 'ytd-rich-item-renderer', options: { id?: string; videoId?: string } = {}) {
  const host = document.querySelector('#items');
  if (!host) {
    throw new Error('expected #items host to exist');
  }

  const id = options.id ?? 'late-members-card';
  const videoId = options.videoId ?? 'late-members-video';
  host.insertAdjacentHTML(
    'beforeend',
    `
      <${tagName} id="${id}">
        <a href="/watch?v=${videoId}">Video</a>
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

async function flushFor(delayMs: number) {
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(delayMs);
  await Promise.resolve();
}

function countSelectorCalls(spy: ReturnType<typeof vi.spyOn>, selector: string) {
  return spy.mock.calls.filter((call) => call[0] === selector).length;
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

  test('processes appended cards without re-querying the whole document', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = `
      <div id="items">
        <ytd-rich-item-renderer id="existing-public-card">
          <a href="/watch?v=public000001">Video</a>
        </ytd-rich-item-renderer>
      </div>
    `;
    const settingsStore = createSettingsStore();
    const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll');

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    await flushTimersAndMutations();
    querySelectorAllSpy.mockClear();

    appendMembersOnlyCard('ytd-rich-item-renderer', {
      id: 'incremental-members-card',
      videoId: 'incremental123'
    });
    await flushTimersAndMutations();

    expect(document.querySelector('#incremental-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(document.querySelector('#existing-public-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    expect(querySelectorAllSpy).not.toHaveBeenCalled();
    runtime.dispose();
  });

  test('ignores high-level removal mutations that do not touch relevant cards', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = `
      <div id="items">
        <ytd-rich-item-renderer id="existing-public-card">
          <a href="/watch?v=public000001">Video</a>
        </ytd-rich-item-renderer>
        <div id="unrelated-node">remove me</div>
      </div>
    `;
    const settingsStore = createSettingsStore();
    const querySelectorAllSpy = vi.spyOn(Element.prototype, 'querySelectorAll');

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    await flushTimersAndMutations();
    querySelectorAllSpy.mockClear();

    document.querySelector('#unrelated-node')?.remove();
    await flushTimersAndMutations();

    expect(countSelectorCalls(querySelectorAllSpy, 'ytd-rich-item-renderer, ytd-rich-grid-media')).toBe(0);
    expect(document.querySelector('#existing-public-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    runtime.dispose();
  });

  test('collapses nested mutation roots before scanning appended content', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = '<div id="items"></div>';
    const settingsStore = createSettingsStore();
    const querySelectorAllSpy = vi.spyOn(Element.prototype, 'querySelectorAll');

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    await flushTimersAndMutations();
    querySelectorAllSpy.mockClear();

    const host = document.querySelector('#items');
    if (!host) {
      throw new Error('expected #items host to exist');
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'nested-wrapper';
    host.append(wrapper);
    wrapper.innerHTML = `
      <ytd-rich-item-renderer id="nested-members-card">
        <a href="/watch?v=nested123456">Video</a>
        <ytd-badge-supported-renderer>
          <span>Members only</span>
        </ytd-badge-supported-renderer>
      </ytd-rich-item-renderer>
    `;
    await flushTimersAndMutations();

    expect(countSelectorCalls(querySelectorAllSpy, 'ytd-rich-item-renderer, ytd-rich-grid-media')).toBe(1);
    expect(document.querySelector('#nested-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
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
    await flushFor(300);

    expect(runtime.getPageHiddenCount()).toBe(1);
    expect((await settingsStore.read()).stats.hiddenVideoIds).toEqual(['abc123xyz89']);
    expect((await settingsStore.read()).stats.totalHiddenCount).toBe(1);
    runtime.dispose();
  });

  test('batches historical hidden id persistence across nearby incremental discoveries', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = '<div id="items"></div>';
    const settingsStore = createSettingsStore();

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    appendMembersOnlyCard('ytd-rich-item-renderer', {
      id: 'first-members-card',
      videoId: 'persist111111'
    });
    await flushTimersAndMutations();

    appendMembersOnlyCard('ytd-rich-item-renderer', {
      id: 'second-members-card',
      videoId: 'persist222222'
    });
    await flushTimersAndMutations();

    expect(settingsStore.getWriteCount()).toBe(0);

    await flushFor(300);

    expect(settingsStore.getWriteCount()).toBe(1);
    expect((await settingsStore.read()).stats.hiddenVideoIds).toEqual(['persist111111', 'persist222222']);
    expect((await settingsStore.read()).stats.totalHiddenCount).toBe(2);
    runtime.dispose();
  });

  test('caps stored hidden video ids while preserving the historical total counter', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/');
    document.body.innerHTML = '<div id="items"></div>';
    const startingHiddenVideoIds = Array.from({ length: 1000 }, (_, index) => `existing-${index}`);
    const settingsStore = createSettingsStore(
      makeSettings({
        stats: {
          hiddenVideoIds: startingHiddenVideoIds,
          totalHiddenCount: startingHiddenVideoIds.length
        }
      })
    );

    const runtime = await bootstrapYouTubeMembersFilter(window, document, settingsStore);
    appendMembersOnlyCard('ytd-rich-item-renderer', {
      id: 'overflow-members-card',
      videoId: 'persist333333'
    });
    await flushTimersAndMutations();
    await flushFor(300);

    const nextSettings = await settingsStore.read();
    expect(nextSettings.stats.hiddenVideoIds).toHaveLength(1000);
    expect(nextSettings.stats.hiddenVideoIds[0]).toBe('existing-1');
    expect(nextSettings.stats.hiddenVideoIds.at(-1)).toBe('persist333333');
    expect(nextSettings.stats.totalHiddenCount).toBe(1001);
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
