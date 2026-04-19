import { isMembersBadgeText, normalizeBadgeText } from './i18n-badges';

import { type SurfaceKey } from '@shared/settings';
import { extractChannelKeyFromUrl, extractChannelKeysFromCard, extractVideoIdFromCard, findBadgeContainers, findRelevantElements } from '@shared/selectors';

export const FILTERED_ATTRIBUTE = 'data-yt-remove-members';
export const SURFACE_ATTRIBUTE = 'data-yt-remove-surface';
const MEMBERSHIP_BADGE_SELECTOR = '.yt-badge-shape--membership, .badge-style-type-members-only';
const SHELF_CARD_SELECTOR =
  'ytd-grid-video-renderer, ytd-rich-grid-media, ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer';

type HideMembersOptions = {
  currentUrl?: URL;
  currentPageChannelKey?: string | null;
  whitelistChannels?: Iterable<string>;
};

type SyncFilterResult = {
  hiddenVideoIds: string[];
  isHidden: boolean;
};

function removeFilterAttributes(element: Element) {
  element.removeAttribute(FILTERED_ATTRIBUTE);
  element.removeAttribute(SURFACE_ATTRIBUTE);
}

function resolveCurrentPageChannelKey(options: HideMembersOptions) {
  if (options.currentPageChannelKey !== undefined) {
    return options.currentPageChannelKey;
  }

  return options.currentUrl ? extractChannelKeyFromUrl(options.currentUrl) : null;
}

function resolveWhitelistChannels(options: HideMembersOptions) {
  if (options.whitelistChannels instanceof Set) {
    return options.whitelistChannels;
  }

  return new Set(options.whitelistChannels ?? []);
}

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
  const badges = findBadgeContainers(card);
  for (let index = 0; index < badges.length; index += 1) {
    const badge = badges[index];
    if (isMembersOnlyBadge(badge)) {
      return true;
    }
  }

  return false;
}

export function syncMembersOnlyVideoCard(card: Element, surface: SurfaceKey, options: HideMembersOptions = {}): SyncFilterResult {
  if (!cardHasMembersOnlyBadge(card)) {
    removeFilterAttributes(card);
    return {
      hiddenVideoIds: [],
      isHidden: false
    };
  }

  const whitelistChannels = resolveWhitelistChannels(options);
  if (whitelistChannels.size > 0) {
    const channelKeys = extractChannelKeysFromCard(card);
    const currentPageChannelKey = resolveCurrentPageChannelKey(options);
    if (currentPageChannelKey) {
      channelKeys.push(currentPageChannelKey);
    }

    if (channelKeys.some((channelKey) => whitelistChannels.has(channelKey))) {
      removeFilterAttributes(card);
      return {
        hiddenVideoIds: [],
        isHidden: false
      };
    }
  }

  card.setAttribute(FILTERED_ATTRIBUTE, 'true');
  card.setAttribute(SURFACE_ATTRIBUTE, surface);

  const videoId = extractVideoIdFromCard(card);
  return {
    hiddenVideoIds: videoId ? [videoId] : [],
    isHidden: true
  };
}

export function hideMembersOnlyVideosForCards(cards: Element[], surface: SurfaceKey, options: HideMembersOptions = {}) {
  let hiddenCount = 0;
  const hiddenVideoIds = new Set<string>();

  for (const card of cards) {
    const result = syncMembersOnlyVideoCard(card, surface, options);
    if (!result.isHidden) {
      continue;
    }

    hiddenCount += 1;
    result.hiddenVideoIds.forEach((videoId) => {
      hiddenVideoIds.add(videoId);
    });
  }

  return {
    hiddenCount,
    hiddenVideoIds: Array.from(hiddenVideoIds)
  };
}

export function syncMemberOnlyShelf(shelf: Element, surface: SurfaceKey, options: HideMembersOptions = {}): SyncFilterResult {
  const cards = Array.from(shelf.querySelectorAll(SHELF_CARD_SELECTOR));
  if (cards.length === 0) {
    removeFilterAttributes(shelf);
    return {
      hiddenVideoIds: [],
      isHidden: false
    };
  }

  const membersOnlyCards = cards.filter((card) => cardHasMembersOnlyBadge(card));
  if (membersOnlyCards.length === 0 || membersOnlyCards.length !== cards.length) {
    removeFilterAttributes(shelf);
    return {
      hiddenVideoIds: [],
      isHidden: false
    };
  }

  const whitelistChannels = resolveWhitelistChannels(options);
  if (whitelistChannels.size > 0) {
    const channelKeys = cards.flatMap((card) => extractChannelKeysFromCard(card));
    const currentPageChannelKey = resolveCurrentPageChannelKey(options);
    if (currentPageChannelKey) {
      channelKeys.push(currentPageChannelKey);
    }

    if (channelKeys.some((channelKey) => whitelistChannels.has(channelKey))) {
      removeFilterAttributes(shelf);
      return {
        hiddenVideoIds: [],
        isHidden: false
      };
    }
  }

  shelf.setAttribute(FILTERED_ATTRIBUTE, 'true');
  shelf.setAttribute(SURFACE_ATTRIBUTE, surface);

  const hiddenVideoIds = new Set<string>();
  cards.forEach((card) => {
    const videoId = extractVideoIdFromCard(card);
    if (videoId) {
      hiddenVideoIds.add(videoId);
    }
  });

  return {
    hiddenVideoIds: Array.from(hiddenVideoIds),
    isHidden: true
  };
}

export function hideMemberOnlyShelves(shelves: Element[], surface: SurfaceKey, options: HideMembersOptions = {}) {
  let hiddenCount = 0;
  const hiddenVideoIds = new Set<string>();

  for (const shelf of shelves) {
    const result = syncMemberOnlyShelf(shelf, surface, options);
    if (!result.isHidden) {
      continue;
    }

    hiddenCount += 1;
    result.hiddenVideoIds.forEach((videoId) => {
      hiddenVideoIds.add(videoId);
    });
  }

  return {
    hiddenCount,
    hiddenVideoIds: Array.from(hiddenVideoIds)
  };
}

export function unhideMembersOnlyVideos(root: ParentNode, surface?: SurfaceKey) {
  const hiddenCards =
    root instanceof Element
      ? findRelevantElements(root, [`[${FILTERED_ATTRIBUTE}="true"]`])
      : Array.from(root.querySelectorAll(`[${FILTERED_ATTRIBUTE}="true"]`));

  for (const card of hiddenCards) {
    if (surface && card.getAttribute(SURFACE_ATTRIBUTE) !== surface) {
      continue;
    }

    removeFilterAttributes(card);
  }
}
