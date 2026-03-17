import { isMembersBadgeText, normalizeBadgeText } from './i18n-badges';

import { type SurfaceKey } from '@shared/settings';
import { findBadgeContainers } from '@shared/selectors';

export const FILTERED_ATTRIBUTE = 'data-yt-remove-members';
export const SURFACE_ATTRIBUTE = 'data-yt-remove-surface';

function isMembersOnlyBadge(container: Element) {
  const ariaLabel = container.getAttribute('aria-label');
  if (ariaLabel && isMembersBadgeText(ariaLabel)) {
    return true;
  }

  const text = normalizeBadgeText(container.textContent ?? '');
  return text.length > 0 && isMembersBadgeText(text);
}

export function hideMembersOnlyVideosForCards(cards: Element[], surface: SurfaceKey) {
  let hiddenCount = 0;

  for (const card of cards) {
    if (card.getAttribute(FILTERED_ATTRIBUTE) === 'true') {
      continue;
    }

    const hasMembersBadge = findBadgeContainers(card).some((badge) => isMembersOnlyBadge(badge));
    if (!hasMembersBadge) {
      continue;
    }

    card.setAttribute(FILTERED_ATTRIBUTE, 'true');
    card.setAttribute(SURFACE_ATTRIBUTE, surface);
    hiddenCount += 1;
  }

  return hiddenCount;
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
