import { normalizeChannelInput } from './settings';

const CHANNEL_ROUTE_PATTERNS = [
  /^\/@[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u,
  /^\/c\/[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u,
  /^\/user\/[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u,
  /^\/channel\/[^/]+(?:\/(?:videos|featured|playlists|community))?\/?$/u
];
const BADGE_SELECTOR = 'ytd-badge-supported-renderer, ytd-thumbnail-overlay-badge-supported-renderer, badge-shape';

function joinSelectors(selectors: string[]) {
  return selectors.join(', ');
}

export function isChannelVideoPageUrl(url: URL) {
  return CHANNEL_ROUTE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

export function findCardsBySelectors(root: ParentNode, selectors: string[]) {
  return findMatchingElements(root, selectors);
}

export function findMatchingElements(root: ParentNode, selectors: string[]) {
  if (selectors.length === 0) {
    return [];
  }

  return Array.from(root.querySelectorAll(joinSelectors(selectors)));
}

export function findRelevantElements(root: Element, selectors: string[]) {
  if (selectors.length === 0) {
    return [];
  }

  const selector = joinSelectors(selectors);
  const matches = new Set<Element>();
  const closestMatch = root.closest(selector);
  if (closestMatch) {
    matches.add(closestMatch);
  }

  findMatchingElements(root, selectors).forEach((element) => matches.add(element));
  return Array.from(matches);
}

export function findClosestMatchingElement(root: Element, selectors: string[]) {
  if (selectors.length === 0) {
    return null;
  }

  const selector = joinSelectors(selectors);
  if (root.matches(selector)) {
    return root;
  }

  return root.closest(selector);
}

export function findMutationRelevantElements(root: Element, selectors: string[]) {
  const closestMatch = findClosestMatchingElement(root, selectors);
  if (closestMatch) {
    return [closestMatch];
  }

  return findMatchingElements(root, selectors);
}

export function findBadgeContainers(card: ParentNode) {
  return card.querySelectorAll(BADGE_SELECTOR);
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
