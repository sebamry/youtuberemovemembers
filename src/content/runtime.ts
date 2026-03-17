import { hideMemberOnlyShelves, hideMembersOnlyVideosForCards, unhideMembersOnlyVideos } from './filter-members';
import { getActiveSurfaceDetectors } from './surfaces';

import { DEFAULT_SETTINGS, readSettings, type ExtensionSettings, writeSettings } from '@shared/settings';

export type FilterRuntime = {
  dispose: () => void;
  run: () => void;
  getPageHiddenCount: () => number;
};

export type SettingsStore = {
  read: () => Promise<ExtensionSettings>;
  write?: (settings: ExtensionSettings) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

function debounce<T extends (...args: never[]) => void>(callback: T, delayMs: number) {
  let timeoutId: number | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => callback(...args), delayMs);
  };
}

function createChromeSettingsStore(): SettingsStore {
  return {
    async read() {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        return DEFAULT_SETTINGS;
      }

      return readSettings(chrome.storage.local);
    },
    async write(settings) {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        return;
      }

      await writeSettings(chrome.storage.local, settings);
    },
    subscribe(listener) {
      if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
        return () => {};
      }

      const handleChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        if (areaName !== 'local' || !changes.settings) {
          return;
        }

        listener();
      };

      chrome.storage.onChanged.addListener(handleChange);
      return () => chrome.storage.onChanged.removeListener(handleChange);
    }
  };
}

export async function bootstrapYouTubeMembersFilter(
  currentWindow: Window,
  currentDocument: Document,
  settingsStore: SettingsStore = createChromeSettingsStore()
): Promise<FilterRuntime> {
  let settings = await settingsStore.read();
  let pageHiddenVideoIds = new Set<string>();
  const messageListener =
    typeof chrome !== 'undefined' && chrome.runtime?.onMessage
      ? ((message: unknown, _sender: unknown, sendResponse: (value: unknown) => void) => {
          if (
            typeof message === 'object' &&
            message !== null &&
            'type' in message &&
            message.type === 'yt-members-filter:get-page-stats'
          ) {
            sendResponse({ hiddenCount: pageHiddenVideoIds.size });
          }
        })
      : null;

  const persistHistoricalIds = async () => {
    const currentHistoricalIds = settings.stats?.hiddenVideoIds ?? [];
    const mergedHiddenVideoIds = Array.from(new Set([...currentHistoricalIds, ...pageHiddenVideoIds]));
    if (mergedHiddenVideoIds.length === currentHistoricalIds.length) {
      return;
    }

    settings = {
      ...settings,
      stats: {
        hiddenVideoIds: mergedHiddenVideoIds
      }
    };

    await settingsStore.write?.(settings);
  };

  const run = () => {
    const currentUrl = new URL(currentWindow.location.href);
    const activeDetectors = getActiveSurfaceDetectors(currentUrl, currentDocument);
    pageHiddenVideoIds = new Set<string>();

    unhideMembersOnlyVideos(currentDocument);

    if (!settings.enabled) {
      return;
    }

    for (const detector of activeDetectors) {
      if (!settings.surfaces[detector.key]) {
        continue;
      }

      if (detector.findShelves) {
        const shelfResult = hideMemberOnlyShelves(detector.findShelves(currentDocument), detector.key, {
          currentUrl,
          whitelistChannels: settings.whitelist.channels
        });
        shelfResult.hiddenVideoIds.forEach((videoId) => pageHiddenVideoIds.add(videoId));
      }

      const result = hideMembersOnlyVideosForCards(detector.findCards(currentDocument), detector.key, {
        currentUrl,
        whitelistChannels: settings.whitelist.channels
      });
      result.hiddenVideoIds.forEach((videoId) => pageHiddenVideoIds.add(videoId));
    }

    void persistHistoricalIds();
  };

  const rescan = debounce(run, 50);
  const observer = new MutationObserver(() => rescan());

  observer.observe(currentDocument.documentElement, {
    childList: true,
    subtree: true
  });

  const handleRouteChange = () => rescan();
  const unsubscribe = settingsStore.subscribe(() => {
    void settingsStore.read().then((nextSettings) => {
      settings = nextSettings;
      rescan();
    });
  });

  currentWindow.addEventListener('popstate', handleRouteChange);
  currentDocument.addEventListener('yt-navigate-finish', handleRouteChange as EventListener);
  if (messageListener) {
    chrome.runtime.onMessage.addListener(messageListener);
  }

  run();

  return {
    dispose() {
      observer.disconnect();
      unsubscribe();
      currentWindow.removeEventListener('popstate', handleRouteChange);
      currentDocument.removeEventListener('yt-navigate-finish', handleRouteChange as EventListener);
      if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    },
    run,
    getPageHiddenCount() {
      return pageHiddenVideoIds.size;
    }
  };
}
