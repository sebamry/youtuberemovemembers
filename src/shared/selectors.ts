const CHANNEL_ROUTE_PATTERNS = [/^\/@[^/]+\/videos\/?$/u, /^\/c\/[^/]+\/videos\/?$/u, /^\/user\/[^/]+\/videos\/?$/u, /^\/channel\/[^/]+\/videos\/?$/u];
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
