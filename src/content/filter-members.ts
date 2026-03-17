import { isMembersBadgeText, normalizeBadgeText } from './i18n-badges';

import { type SurfaceKey } from '@shared/settings';
import { extractChannelKeyFromUrl, extractChannelKeysFromCard, extractVideoIdFromCard, findBadgeContainers } from '@shared/selectors';

export const FILTERED_ATTRIBUTE = 'data-yt-remove-members';
export const SURFACE_ATTRIBUTE = 'data-yt-remove-surface';
const MEMBERSHIP_BADGE_SELECTOR = '.yt-badge-shape--membership, .badge-style-type-members-only';
const SHELF_CARD_SELECTOR =
  'ytd-grid-video-renderer, ytd-rich-grid-media, ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer';

type HideMembersOptions = {
  currentUrl?: URL;
  whitelistChannels?: string[];
};

function isMembersOnlyBadge(container: Element) {
  if (container.matches(MEMBERSHIP_BADGE_SELECTOR) || container.querySelector(MEMBERSHIP_BADGE_SELECTOR)) {
    return true;
  }

  const ariaLabel = container.getAttribute('aria-label');
  if (ariaLabel && isMembersBadgeText(ariaLabel)) {
    return true;
  }

  const text = normalizeBadgeText(container.textContent ?? '');
  return text.length > 0 && isMembersBadgeText(text);
}

function cardHasMembersOnlyBadge(card: Element) {
  return findBadgeContainers(card).some((badge) => isMembersOnlyBadge(badge));
}

export function hideMembersOnlyVideosForCards(cards: Element[], surface: SurfaceKey, options: HideMembersOptions = {}) {
  let hiddenCount = 0;
  const hiddenVideoIds = new Set<string>();
  const whitelistChannels = new Set(options.whitelistChannels ?? []);

  for (const card of cards) {
    const hasMembersBadge = cardHasMembersOnlyBadge(card);
    if (!hasMembersBadge) {
      continue;
    }

    const channelKeys = extractChannelKeysFromCard(card);
    const currentPageChannelKey = options.currentUrl ? extractChannelKeyFromUrl(options.currentUrl) : null;
    if (currentPageChannelKey) {
      channelKeys.push(currentPageChannelKey);
    }

    if (channelKeys.some((channelKey) => whitelistChannels.has(channelKey))) {
      continue;
    }

    card.setAttribute(FILTERED_ATTRIBUTE, 'true');
    card.setAttribute(SURFACE_ATTRIBUTE, surface);
    hiddenCount += 1;

    const videoId = extractVideoIdFromCard(card);
    if (videoId) {
      hiddenVideoIds.add(videoId);
    }
  }

  return {
    hiddenCount,
    hiddenVideoIds: Array.from(hiddenVideoIds)
  };
}

export function hideMemberOnlyShelves(shelves: Element[], surface: SurfaceKey, options: HideMembersOptions = {}) {
  let hiddenCount = 0;
  const hiddenVideoIds = new Set<string>();
  const whitelistChannels = new Set(options.whitelistChannels ?? []);

  for (const shelf of shelves) {
    const cards = Array.from(shelf.querySelectorAll(SHELF_CARD_SELECTOR));
    if (cards.length === 0) {
      continue;
    }

    const membersOnlyCards = cards.filter((card) => cardHasMembersOnlyBadge(card));
    if (membersOnlyCards.length === 0 || membersOnlyCards.length !== cards.length) {
      continue;
    }

    const channelKeys = cards.flatMap((card) => extractChannelKeysFromCard(card));
    const currentPageChannelKey = options.currentUrl ? extractChannelKeyFromUrl(options.currentUrl) : null;
    if (currentPageChannelKey) {
      channelKeys.push(currentPageChannelKey);
    }

    if (channelKeys.some((channelKey) => whitelistChannels.has(channelKey))) {
      continue;
    }

    shelf.setAttribute(FILTERED_ATTRIBUTE, 'true');
    shelf.setAttribute(SURFACE_ATTRIBUTE, surface);
    hiddenCount += 1;

    cards.forEach((card) => {
      const videoId = extractVideoIdFromCard(card);
      if (videoId) {
        hiddenVideoIds.add(videoId);
      }
    });
  }

  return {
    hiddenCount,
    hiddenVideoIds: Array.from(hiddenVideoIds)
  };
}

export function unhideMembersOnlyVideos(root: ParentNode, surface?: SurfaceKey) {
  const hiddenCards = Array.from(root.querySelectorAll(`[${FILTERED_ATTRIBUTE}="true"]`));

  for (const card of hiddenCards) {
    if (surface && card.getAttribute(SURFACE_ATTRIBUTE) !== surface) {
      continue;
    }

    card.removeAttribute(FILTERED_ATTRIBUTE);
    card.removeAttribute(SURFACE_ATTRIBUTE);
  }
}
