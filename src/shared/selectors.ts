const CHANNEL_ROUTE_PATTERNS = [/^\/@[^/]+\/videos\/?$/u, /^\/c\/[^/]+\/videos\/?$/u, /^\/user\/[^/]+\/videos\/?$/u, /^\/channel\/[^/]+\/videos\/?$/u];

export function isChannelVideoPageUrl(url: URL) {
  return CHANNEL_ROUTE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}
