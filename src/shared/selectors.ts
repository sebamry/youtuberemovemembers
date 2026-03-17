import { normalizeChannelInput } from './settings';

const CHANNEL_ROUTE_PATTERNS = [
  /^\/@[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u,
  /^\/c\/[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u,
  /^\/user\/[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u,
  /^\/channel\/[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u
];
const BADGE_SELECTOR = 'ytd-badge-supported-renderer, ytd-thumbnail-overlay-badge-supported-renderer';

export function isChannelVideoPageUrl(url: URL) {
  return CHANNEL_ROUTE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

export function findCardsBySelectors(root: ParentNode, selectors: string[]) {
  return selectors.flatMap((selector) => Array.from(root.querySelectorAll(selector)));
}

export function findBadgeContainers(card: ParentNode) {
  return Array.from(card.querySelectorAll(BADGE_SELECTOR));
}

function resolveHref(candidate: string) {
  try {
    return new URL(candidate, 'https://www.youtube.com');
  } catch {
    return null;
  }
}

export function extractVideoIdFromCard(card: ParentNode) {
  const links = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href]'));

  for (const link of links) {
    const resolvedUrl = resolveHref(link.getAttribute('href') ?? '');
    if (!resolvedUrl) {
      continue;
    }

    if (resolvedUrl.pathname === '/watch') {
      const videoId = resolvedUrl.searchParams.get('v');
      if (videoId) {
        return videoId;
      }
    }

    const shortsMatch = resolvedUrl.pathname.match(/^\/shorts\/([^/?#]+)$/u);
    if (shortsMatch) {
      return shortsMatch[1];
    }
  }

  return null;
}

export function extractChannelKeysFromCard(card: ParentNode) {
  const links = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href]'));
  const keys = links
    .map((link) => normalizeChannelInput(link.getAttribute('href') ?? ''))
    .filter((key): key is string => key !== null);

  return Array.from(new Set(keys));
}

export function extractChannelKeyFromUrl(url: URL) {
  const match = url.pathname.match(/^((?:\/@|\/channel\/|\/c\/|\/user\/)[^/]+)(?:\/(?:videos|featured|playlists|community))?\/?$/u);
  if (!match) {
    return null;
  }

  return normalizeChannelInput(match[1]);
}
