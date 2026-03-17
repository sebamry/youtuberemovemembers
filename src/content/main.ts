import './styles.css';

import { bootstrapYouTubeMembersFilter } from './runtime';

if (typeof window !== 'undefined' && window.location.hostname.endsWith('youtube.com')) {
  bootstrapYouTubeMembersFilter(window, document);
}
