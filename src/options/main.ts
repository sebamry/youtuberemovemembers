import './styles.css';

import { DEFAULT_SETTINGS } from '@shared/settings';
import { initOptionsPage } from './runtime';

const previewStorage = {
  get: async () => ({ settings: DEFAULT_SETTINGS }),
  set: async () => {}
};

const environment =
  typeof chrome !== 'undefined' && chrome.storage?.local
    ? {
        storage: chrome.storage.local
      }
    : {
        storage: previewStorage
      };

void initOptionsPage(document, environment);
