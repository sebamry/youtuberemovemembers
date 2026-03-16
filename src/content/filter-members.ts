import { isMembersBadgeText, normalizeBadgeText } from './i18n-badges';

import { findBadgeContainers, findCandidateVideoCards } from '@shared/selectors';

export const FILTERED_ATTRIBUTE = 'data-yt-remove-members';

function isMembersOnlyBadge(container: Element) {
  const ariaLabel = container.getAttribute('aria-label');
  if (ariaLabel && isMembersBadgeText(ariaLabel)) {
    return true;
  }

  const text = normalizeBadgeText(container.textContent ?? '');
  return text.length > 0 && isMembersBadgeText(text);
}

export function hideMembersOnlyVideos(root: ParentNode) {
  let hiddenCount = 0;

  for (const card of findCandidateVideoCards(root)) {
    if (card.getAttribute(FILTERED_ATTRIBUTE) === 'true') {
      continue;
    }

    const hasMembersBadge = findBadgeContainers(card).some((badge) => isMembersOnlyBadge(badge));
    if (!hasMembersBadge) {
      continue;
    }

    card.setAttribute(FILTERED_ATTRIBUTE, 'true');
    hiddenCount += 1;
  }

  return hiddenCount;
}
