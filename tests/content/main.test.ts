import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { FILTERED_ATTRIBUTE } from '@content/filter-members';
import { bootstrapYouTubeMembersFilter } from '@content/runtime';

function appendMembersOnlyCard() {
  const host = document.querySelector('#items');
  if (!host) {
    throw new Error('expected #items host to exist');
  }

  host.insertAdjacentHTML(
    'beforeend',
    `
      <ytd-rich-item-renderer id="late-members-card">
        <div id="details">
          <ytd-badge-supported-renderer>
            <span>Members only</span>
          </ytd-badge-supported-renderer>
        </div>
      </ytd-rich-item-renderer>
    `
  );
}

async function flushTimersAndMutations() {
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(60);
  await Promise.resolve();
}

describe('members filter runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    history.replaceState({}, '', 'https://www.youtube.com/');
  });

  test('re-scans when matching content is appended on an active channel page', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/@demo/videos');
    document.body.innerHTML = '<div id="items"></div>';

    const runtime = bootstrapYouTubeMembersFilter(window, document);

    appendMembersOnlyCard();
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    runtime.dispose();
  });

  test('stays inactive on non-channel pages', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/watch?v=abc');
    document.body.innerHTML = '<div id="items"></div>';

    const runtime = bootstrapYouTubeMembersFilter(window, document);

    appendMembersOnlyCard();
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.hasAttribute(FILTERED_ATTRIBUTE)).toBe(false);
    runtime.dispose();
  });

  test('reacts to yt-navigate-finish after a route change into a channel page', async () => {
    history.replaceState({}, '', 'https://www.youtube.com/watch?v=abc');
    document.body.innerHTML = '<div id="items"></div>';

    const runtime = bootstrapYouTubeMembersFilter(window, document);

    history.replaceState({}, '', 'https://www.youtube.com/@demo/videos');
    appendMembersOnlyCard();
    document.dispatchEvent(new Event('yt-navigate-finish'));
    await flushTimersAndMutations();

    expect(document.querySelector('#late-members-card')?.getAttribute(FILTERED_ATTRIBUTE)).toBe('true');
    runtime.dispose();
  });
});
