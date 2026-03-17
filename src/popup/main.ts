import './styles.css';

import { DEFAULT_SETTINGS } from '@shared/settings';
import { initPopup } from './runtime';

const previewStorage = {
  get: async () => ({ settings: DEFAULT_SETTINGS }),
  set: async () => {}
};

async function getCurrentPageStats() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return { hiddenCount: 0 };
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    return { hiddenCount: 0 };
  }

  try {
    const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'yt-members-filter:get-page-stats' });
    return { hiddenCount: typeof response?.hiddenCount === 'number' ? response.hiddenCount : 0 };
  } catch {
    return { hiddenCount: 0 };
  }
}

const environment =
  typeof chrome !== 'undefined' && chrome.storage?.local
    ? {
        storage: chrome.storage.local,
        getCurrentPageStats,
        openOptionsPage: () => chrome.runtime.openOptionsPage()
      }
    : {
        storage: previewStorage,
        getCurrentPageStats: async () => ({ hiddenCount: 0 }),
        openOptionsPage: async () => {}
      };

void initPopup(document, environment);
