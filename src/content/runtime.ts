import { FILTERED_ATTRIBUTE, syncMemberOnlyShelf, syncMembersOnlyVideoCard, unhideMembersOnlyVideos } from './filter-members';
import { getMatchingSurfaceDetectors, type SurfaceDetector } from './surfaces';

import {
  DEFAULT_SETTINGS,
  normalizeHistoricalHiddenVideoIds,
  readSettings,
  type ExtensionSettings,
  writeSettings
} from '@shared/settings';
import { extractChannelKeyFromUrl, findClosestMatchingElement, findMutationRelevantElements, findRelevantElements } from '@shared/selectors';

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

const MUTATION_BATCH_DELAY_MS = 50;
const HISTORICAL_PERSIST_DELAY_MS = 250;

type ResolvedFilterOptions = {
  currentPageChannelKey: string | null;
  currentUrl: URL;
  whitelistChannels: Set<string>;
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
  const trackedHiddenElements = new Map<Element, string[]>();
  const pageHiddenVideoRefCounts = new Map<string, number>();
  const persistedHistoricalIds = new Set(settings.stats.hiddenVideoIds);
  const pendingHistoricalIds = new Set<string>();
  const pendingMutationRoots = new Set<Element>();
  let historicalPersistTimeoutId: number | undefined;
  const messageListener =
    typeof chrome !== 'undefined' && chrome.runtime?.onMessage
      ? ((message: unknown, _sender: unknown, sendResponse: (value: unknown) => void) => {
          if (
            typeof message === 'object' &&
            message !== null &&
            'type' in message &&
            message.type === 'yt-members-filter:get-page-stats'
          ) {
            sendResponse({ hiddenCount: pageHiddenVideoRefCounts.size });
          }
        })
      : null;

  const updateTrackedElement = (element: Element, nextHiddenVideoIds: string[]) => {
    const previousHiddenVideoIds = trackedHiddenElements.get(element) ?? [];
    if (
      previousHiddenVideoIds.length === nextHiddenVideoIds.length &&
      previousHiddenVideoIds.every((videoId, index) => videoId === nextHiddenVideoIds[index])
    ) {
      return;
    }

    previousHiddenVideoIds.forEach((videoId) => {
      const nextCount = (pageHiddenVideoRefCounts.get(videoId) ?? 0) - 1;
      if (nextCount <= 0) {
        pageHiddenVideoRefCounts.delete(videoId);
      } else {
        pageHiddenVideoRefCounts.set(videoId, nextCount);
      }
    });

    if (nextHiddenVideoIds.length > 0) {
      trackedHiddenElements.set(element, nextHiddenVideoIds);
      nextHiddenVideoIds.forEach((videoId) => {
        pageHiddenVideoRefCounts.set(videoId, (pageHiddenVideoRefCounts.get(videoId) ?? 0) + 1);
      });
      return;
    }

    trackedHiddenElements.delete(element);
  };

  const scheduleHistoricalPersist = () => {
    if (historicalPersistTimeoutId !== undefined) {
      return;
    }

    historicalPersistTimeoutId = currentWindow.setTimeout(() => {
      historicalPersistTimeoutId = undefined;
      void flushHistoricalIds();
    }, HISTORICAL_PERSIST_DELAY_MS);
  };

  const queueHistoricalIds = (hiddenVideoIds: string[]) => {
    let hasPendingIds = false;
    hiddenVideoIds.forEach((videoId) => {
      if (persistedHistoricalIds.has(videoId) || pendingHistoricalIds.has(videoId)) {
        return;
      }

      pendingHistoricalIds.add(videoId);
      hasPendingIds = true;
    });

    if (hasPendingIds) {
      scheduleHistoricalPersist();
    }
  };

  const flushHistoricalIds = async () => {
    if (pendingHistoricalIds.size === 0) {
      return;
    }

    const nextPendingIds = Array.from(pendingHistoricalIds);
    const mergedHiddenVideoIds = normalizeHistoricalHiddenVideoIds([...(settings.stats?.hiddenVideoIds ?? []), ...nextPendingIds]);
    const nextTotalHiddenCount = (settings.stats?.totalHiddenCount ?? settings.stats?.hiddenVideoIds.length ?? 0) + nextPendingIds.length;
    if (
      mergedHiddenVideoIds.length === (settings.stats?.hiddenVideoIds ?? []).length &&
      nextTotalHiddenCount === (settings.stats?.totalHiddenCount ?? settings.stats?.hiddenVideoIds.length ?? 0)
    ) {
      pendingHistoricalIds.clear();
      return;
    }

    settings = {
      ...settings,
      stats: {
        hiddenVideoIds: mergedHiddenVideoIds,
        totalHiddenCount: nextTotalHiddenCount
      }
    };

    persistedHistoricalIds.clear();
    mergedHiddenVideoIds.forEach((videoId) => persistedHistoricalIds.add(videoId));
    pendingHistoricalIds.clear();
    await settingsStore.write?.(settings);
  };

  const cleanupRemovedElement = (root: Element) => {
    const hiddenElements = findRelevantElements(root, [`[${FILTERED_ATTRIBUTE}="true"]`]);
    hiddenElements.forEach((element) => updateTrackedElement(element, []));
  };

  const getMutationSelectors = (detectors: SurfaceDetector[]) =>
    Array.from(new Set(detectors.flatMap((detector) => [...detector.cardSelectors, ...(detector.shelfSelectors ?? [])])));

  const addPendingMutationRoot = (candidate: Element) => {
    for (const existingRoot of pendingMutationRoots) {
      if (existingRoot === candidate || existingRoot.contains(candidate)) {
        return;
      }
    }

    Array.from(pendingMutationRoots).forEach((existingRoot) => {
      if (candidate.contains(existingRoot)) {
        pendingMutationRoots.delete(existingRoot);
      }
    });

    pendingMutationRoots.add(candidate);
  };

  const enqueueRelevantMutationRoots = (element: Element, selectors: string[]) => {
    findMutationRelevantElements(element, selectors).forEach((match) => addPendingMutationRoot(match));
  };

  const enqueueClosestMutationRoot = (element: Element, selectors: string[]) => {
    const closestMatch = findClosestMatchingElement(element, selectors);
    if (closestMatch) {
      addPendingMutationRoot(closestMatch);
    }
  };

  const processSurfaceRoot = (detector: SurfaceDetector, root: Element, options: ResolvedFilterOptions) => {
    if (!settings.surfaces[detector.key]) {
      return;
    }
    const processedShelves = new Set<Element>();
    const processedCards = new Set<Element>();

    (detector.shelfSelectors ? findMutationRelevantElements(root, detector.shelfSelectors) : []).forEach((shelf) => {
      if (processedShelves.has(shelf)) {
        return;
      }

      processedShelves.add(shelf);
      const result = syncMemberOnlyShelf(shelf, detector.key, {
        currentPageChannelKey: options.currentPageChannelKey,
        currentUrl: options.currentUrl,
        whitelistChannels: options.whitelistChannels
      });
      updateTrackedElement(shelf, result.hiddenVideoIds);
      queueHistoricalIds(result.hiddenVideoIds);
    });

    findMutationRelevantElements(root, detector.cardSelectors).forEach((card) => {
      if (processedCards.has(card)) {
        return;
      }

      processedCards.add(card);
      const result = syncMembersOnlyVideoCard(card, detector.key, {
        currentPageChannelKey: options.currentPageChannelKey,
        currentUrl: options.currentUrl,
        whitelistChannels: options.whitelistChannels
      });
      updateTrackedElement(card, result.hiddenVideoIds);
      queueHistoricalIds(result.hiddenVideoIds);
    });
  };

  const run = () => {
    const currentUrl = new URL(currentWindow.location.href);
    const activeDetectors = getMatchingSurfaceDetectors(currentUrl);
    const filterOptions = {
      currentPageChannelKey: extractChannelKeyFromUrl(currentUrl),
      currentUrl,
      whitelistChannels: new Set(settings.whitelist.channels)
    };
    pendingMutationRoots.clear();
    trackedHiddenElements.clear();
    pageHiddenVideoRefCounts.clear();

    unhideMembersOnlyVideos(currentDocument);

    if (!settings.enabled) {
      return;
    }

    for (const detector of activeDetectors) {
      if (!settings.surfaces[detector.key]) {
        continue;
      }

      if (detector.findShelves) {
        detector.findShelves(currentDocument).forEach((shelf) => {
          const result = syncMemberOnlyShelf(shelf, detector.key, filterOptions);
          updateTrackedElement(shelf, result.hiddenVideoIds);
          queueHistoricalIds(result.hiddenVideoIds);
        });
      }

      detector.findCards(currentDocument).forEach((card) => {
        const result = syncMembersOnlyVideoCard(card, detector.key, filterOptions);
        updateTrackedElement(card, result.hiddenVideoIds);
        queueHistoricalIds(result.hiddenVideoIds);
      });
    }
  };

  const flushPendingMutations = () => {
    if (!settings.enabled || pendingMutationRoots.size === 0) {
      pendingMutationRoots.clear();
      return;
    }

    const currentUrl = new URL(currentWindow.location.href);
    const activeDetectors = getMatchingSurfaceDetectors(currentUrl);
    const filterOptions = {
      currentPageChannelKey: extractChannelKeyFromUrl(currentUrl),
      currentUrl,
      whitelistChannels: new Set(settings.whitelist.channels)
    };
    const roots = Array.from(pendingMutationRoots);
    pendingMutationRoots.clear();

    roots.forEach((root) => {
      activeDetectors.forEach((detector) => processSurfaceRoot(detector, root, filterOptions));
    });
  };

  const rescan = debounce(flushPendingMutations, MUTATION_BATCH_DELAY_MS);
  const scheduleFullRun = debounce(run, MUTATION_BATCH_DELAY_MS);
  const observer = new MutationObserver((records) => {
    const currentUrl = new URL(currentWindow.location.href);
    const activeDetectors = getMatchingSurfaceDetectors(currentUrl).filter((detector) => settings.surfaces[detector.key]);
    const mutationSelectors = getMutationSelectors(activeDetectors);

    records.forEach((record) => {
      if (!(record.target instanceof Element)) {
        return;
      }

      let addedElementCount = 0;
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          addedElementCount += 1;
          enqueueRelevantMutationRoots(node, mutationSelectors);
        }
      });
      record.removedNodes.forEach((node) => {
        if (node instanceof Element) {
          cleanupRemovedElement(node);
        }
      });

      if (addedElementCount === 0) {
        enqueueClosestMutationRoot(record.target, mutationSelectors);
      }
    });

    rescan();
  });

  observer.observe(currentDocument.body ?? currentDocument.documentElement, {
    childList: true,
    subtree: true
  });

  const handleRouteChange = () => scheduleFullRun();
  const unsubscribe = settingsStore.subscribe(() => {
    void settingsStore.read().then((nextSettings) => {
      settings = nextSettings;
      persistedHistoricalIds.clear();
      nextSettings.stats.hiddenVideoIds.forEach((videoId) => persistedHistoricalIds.add(videoId));
      scheduleFullRun();
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
      if (historicalPersistTimeoutId !== undefined) {
        currentWindow.clearTimeout(historicalPersistTimeoutId);
      }
      void flushHistoricalIds();
      unsubscribe();
      currentWindow.removeEventListener('popstate', handleRouteChange);
      currentDocument.removeEventListener('yt-navigate-finish', handleRouteChange as EventListener);
      if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    },
    run,
    getPageHiddenCount() {
      return pageHiddenVideoRefCounts.size;
    }
  };
}
