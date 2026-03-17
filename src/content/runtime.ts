import { hideMembersOnlyVideosForCards, unhideMembersOnlyVideos } from './filter-members';
import { getActiveSurfaceDetectors } from './surfaces';

import { DEFAULT_SETTINGS, readSettings, type ExtensionSettings } from '@shared/settings';

export type FilterRuntime = {
  dispose: () => void;
  run: () => void;
};

export type SettingsStore = {
  read: () => Promise<ExtensionSettings>;
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

  const run = () => {
    const currentUrl = new URL(currentWindow.location.href);
    const activeDetectors = getActiveSurfaceDetectors(currentUrl, currentDocument);

    unhideMembersOnlyVideos(currentDocument);

    if (!settings.enabled) {
      return;
    }

    for (const detector of activeDetectors) {
      if (!settings.surfaces[detector.key]) {
        continue;
      }

      hideMembersOnlyVideosForCards(detector.findCards(currentDocument), detector.key);
    }
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

  run();

  return {
    dispose() {
      observer.disconnect();
      unsubscribe();
      currentWindow.removeEventListener('popstate', handleRouteChange);
      currentDocument.removeEventListener('yt-navigate-finish', handleRouteChange as EventListener);
    },
    run
  };
}
