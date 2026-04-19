import { type SurfaceKey } from '@shared/settings';
import { findCardsBySelectors, isChannelVideoPageUrl } from '@shared/selectors';

export type SurfaceDetector = {
  key: SurfaceKey;
  cardSelectors: string[];
  shelfSelectors?: string[];
  findCards: (root: ParentNode) => Element[];
  findShelves?: (root: ParentNode) => Element[];
  matches: (url: URL) => boolean;
};

const SURFACE_DETECTORS: SurfaceDetector[] = [
  {
    key: 'channel',
    cardSelectors: ['ytd-grid-video-renderer', 'ytd-rich-grid-media', 'ytd-rich-item-renderer', 'ytd-video-renderer'],
    shelfSelectors: ['ytd-shelf-renderer'],
    matches: (url) => isChannelVideoPageUrl(url),
    findCards: (root) => findCardsBySelectors(root, ['ytd-grid-video-renderer', 'ytd-rich-grid-media', 'ytd-rich-item-renderer', 'ytd-video-renderer']),
    findShelves: (root) => findCardsBySelectors(root, ['ytd-shelf-renderer'])
  },
  {
    key: 'home',
    cardSelectors: ['ytd-rich-item-renderer', 'ytd-rich-grid-media'],
    matches: (url) => url.pathname === '/',
    findCards: (root) => findCardsBySelectors(root, ['ytd-rich-item-renderer', 'ytd-rich-grid-media'])
  },
  {
    key: 'search',
    cardSelectors: ['ytd-video-renderer', 'ytd-rich-item-renderer'],
    matches: (url) => url.pathname === '/results',
    findCards: (root) => findCardsBySelectors(root, ['ytd-video-renderer', 'ytd-rich-item-renderer'])
  },
  {
    key: 'subscriptions',
    cardSelectors: ['ytd-rich-item-renderer', 'ytd-rich-grid-media', 'ytd-grid-video-renderer'],
    matches: (url) => url.pathname === '/feed/subscriptions',
    findCards: (root) => findCardsBySelectors(root, ['ytd-rich-item-renderer', 'ytd-rich-grid-media', 'ytd-grid-video-renderer'])
  },
  {
    key: 'recommendations',
    cardSelectors: ['ytd-compact-video-renderer', 'ytd-video-renderer'],
    matches: (url) => url.pathname === '/watch',
    findCards: (root) => findCardsBySelectors(root, ['ytd-compact-video-renderer', 'ytd-video-renderer'])
  }
];

export function getMatchingSurfaceDetectors(url: URL) {
  return SURFACE_DETECTORS.filter((detector) => detector.matches(url));
}

export function getActiveSurfaceDetectors(url: URL, root: ParentNode) {
  return getMatchingSurfaceDetectors(url).filter(
    (detector) => detector.findCards(root).length > 0 || (detector.findShelves?.(root).length ?? 0) > 0
  );
}
