import { type SurfaceKey } from '@shared/settings';
import { findCardsBySelectors, isChannelVideoPageUrl } from '@shared/selectors';

export type SurfaceDetector = {
  key: SurfaceKey;
  findCards: (root: ParentNode) => Element[];
  matches: (url: URL, root: ParentNode) => boolean;
};

const SURFACE_DETECTORS: SurfaceDetector[] = [
  {
    key: 'channel',
    matches: (url) => isChannelVideoPageUrl(url),
    findCards: (root) =>
      findCardsBySelectors(root, [
        'ytd-rich-grid-media',
        'ytd-rich-item-renderer',
        'ytd-grid-video-renderer',
        'ytd-video-renderer'
      ])
  },
  {
    key: 'home',
    matches: (url) => url.pathname === '/',
    findCards: (root) => findCardsBySelectors(root, ['ytd-rich-item-renderer', 'ytd-rich-grid-media'])
  },
  {
    key: 'search',
    matches: (url) => url.pathname === '/results',
    findCards: (root) => findCardsBySelectors(root, ['ytd-video-renderer', 'ytd-rich-item-renderer'])
  },
  {
    key: 'subscriptions',
    matches: (url) => url.pathname === '/feed/subscriptions',
    findCards: (root) =>
      findCardsBySelectors(root, ['ytd-rich-item-renderer', 'ytd-rich-grid-media', 'ytd-grid-video-renderer'])
  },
  {
    key: 'recommendations',
    matches: (url) => url.pathname === '/watch',
    findCards: (root) => findCardsBySelectors(root, ['ytd-compact-video-renderer', 'ytd-video-renderer'])
  }
];

export function getActiveSurfaceDetectors(url: URL, root: ParentNode) {
  return SURFACE_DETECTORS.filter((detector) => detector.matches(url, root) && detector.findCards(root).length > 0);
}
