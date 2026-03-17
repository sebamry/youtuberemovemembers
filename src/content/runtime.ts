import { hideMembersOnlyVideos } from './filter-members';

import { hasCandidateVideoCards, isChannelVideoPageUrl } from '@shared/selectors';

export type FilterRuntime = {
  dispose: () => void;
  run: () => void;
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

function isActiveChannelPage(currentWindow: Window, currentDocument: Document) {
  const currentUrl = new URL(currentWindow.location.href);
  return isChannelVideoPageUrl(currentUrl) && hasCandidateVideoCards(currentDocument);
}

export function bootstrapYouTubeMembersFilter(currentWindow: Window, currentDocument: Document): FilterRuntime {
  const run = () => {
    if (!isActiveChannelPage(currentWindow, currentDocument)) {
      return;
    }

    hideMembersOnlyVideos(currentDocument);
  };

  const rescan = debounce(run, 50);
  const observer = new MutationObserver(() => rescan());

  observer.observe(currentDocument.documentElement, {
    childList: true,
    subtree: true
  });

  const handleRouteChange = () => rescan();

  currentWindow.addEventListener('popstate', handleRouteChange);
  currentDocument.addEventListener('yt-navigate-finish', handleRouteChange as EventListener);

  run();

  return {
    dispose() {
      observer.disconnect();
      currentWindow.removeEventListener('popstate', handleRouteChange);
      currentDocument.removeEventListener('yt-navigate-finish', handleRouteChange as EventListener);
    },
    run
  };
}
