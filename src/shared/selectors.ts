const CHANNEL_ROUTE_PATTERNS = [/^\/@[^/]+\/videos\/?$/u, /^\/c\/[^/]+\/videos\/?$/u, /^\/user\/[^/]+\/videos\/?$/u, /^\/channel\/[^/]+\/videos\/?$/u];
const VIDEO_CARD_SELECTOR = 'ytd-rich-grid-media, ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer';
const BADGE_SELECTOR = 'ytd-badge-supported-renderer, ytd-thumbnail-overlay-badge-supported-renderer';

export function isChannelVideoPageUrl(url: URL) {
  return CHANNEL_ROUTE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

export function findCandidateVideoCards(root: ParentNode) {
  return Array.from(root.querySelectorAll(VIDEO_CARD_SELECTOR));
}

export function hasCandidateVideoCards(root: ParentNode) {
  return findCandidateVideoCards(root).length > 0;
}

export function findBadgeContainers(card: ParentNode) {
  return Array.from(card.querySelectorAll(BADGE_SELECTOR));
}
