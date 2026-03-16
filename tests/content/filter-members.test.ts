import { describe, expect, test } from 'vitest';

import { FILTERED_ATTRIBUTE, hideMembersOnlyVideos } from '@content/filter-members';

describe('members-only card filtering', () => {
  test('marks member-only cards for hiding', () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer id="members-card">
        <div id="details">
          <ytd-badge-supported-renderer>
            <span>Miembros primero</span>
          </ytd-badge-supported-renderer>
        </div>
      </ytd-rich-item-renderer>
      <ytd-rich-item-renderer id="public-card">
        <div id="details">
          <ytd-badge-supported-renderer>
            <span>Publico</span>
          </ytd-badge-supported-renderer>
        </div>
      </ytd-rich-item-renderer>
    `;

    const hiddenCount = hideMembersOnlyVideos(document);

    expect(hiddenCount).toBe(1);
    expect(document.querySelector('#members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    expect(document.querySelector('#public-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
  });

  test('accepts thumbnail overlay badges as a supported badge structure', () => {
    document.body.innerHTML = `
      <ytd-grid-video-renderer id="overlay-card">
        <ytd-thumbnail-overlay-badge-supported-renderer aria-label="Members only"></ytd-thumbnail-overlay-badge-supported-renderer>
      </ytd-grid-video-renderer>
    `;

    hideMembersOnlyVideos(document);

    expect(document.querySelector('#overlay-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
  });
});
