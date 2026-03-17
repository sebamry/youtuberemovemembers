export type SurfaceKey = 'channel' | 'recommendations' | 'home' | 'search' | 'subscriptions';
export type ThemePreference = 'system' | 'light' | 'dark';

export type ExtensionSettings = {
  enabled: boolean;
  surfaces: Record<SurfaceKey, boolean>;
  whitelist: {
    channels: string[];
  };
  stats: {
    hiddenVideoIds: string[];
  };
  appearance: {
    theme: ThemePreference;
  };
};

type PartialSettings = {
  enabled?: boolean;
  surfaces?: Partial<Record<SurfaceKey, boolean>>;
  whitelist?: {
    channels?: unknown;
  };
  stats?: {
    hiddenVideoIds?: unknown;
  };
  appearance?: {
    theme?: unknown;
  };
};

type StorageLike = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (value: Record<string, unknown>) => Promise<void>;
};

const SETTINGS_KEY = 'settings';

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeChannelPath(pathname: string) {
  const trimmed = pathname.trim();

  const handleMatch = trimmed.match(/^\/(@[^/]+)/u);
  if (handleMatch) {
    return handleMatch[1].toLowerCase();
  }

  const channelMatch = trimmed.match(/^\/channel\/([^/]+)/u);
  if (channelMatch) {
    return `channel:${channelMatch[1]}`;
  }

  const customMatch = trimmed.match(/^\/c\/([^/]+)/u);
  if (customMatch) {
    return `c:${customMatch[1].toLowerCase()}`;
  }

  const userMatch = trimmed.match(/^\/user\/([^/]+)/u);
  if (userMatch) {
    return `user:${userMatch[1].toLowerCase()}`;
  }

  return null;
}

export function normalizeChannelInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directPath = normalizeChannelPath(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
  if (directPath) {
    return directPath;
  }

  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith('youtube.com')) {
      return null;
    }

    return normalizeChannelPath(url.pathname);
  } catch {
    return null;
  }
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  surfaces: {
    channel: true,
    recommendations: true,
    home: true,
    search: true,
    subscriptions: true
  },
  whitelist: {
    channels: []
  },
  stats: {
    hiddenVideoIds: []
  },
  appearance: {
    theme: 'system'
  }
};

function normalizeStoredSettings(value: unknown): ExtensionSettings {
  const partial: PartialSettings = typeof value === 'object' && value !== null ? (value as PartialSettings) : {};
  const partialSurfaces: Partial<Record<SurfaceKey, boolean>> =
    typeof partial.surfaces === 'object' && partial.surfaces !== null ? partial.surfaces : {};
  const normalizedChannels = Array.isArray(partial.whitelist?.channels)
    ? uniqueStrings(
        partial.whitelist.channels
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => normalizeChannelInput(entry))
          .filter((entry): entry is string => entry !== null)
      )
    : DEFAULT_SETTINGS.whitelist.channels;
  const normalizedHiddenVideoIds = Array.isArray(partial.stats?.hiddenVideoIds)
    ? uniqueStrings(partial.stats.hiddenVideoIds.filter((entry): entry is string => typeof entry === 'string'))
    : DEFAULT_SETTINGS.stats.hiddenVideoIds;
  const normalizedTheme =
    partial.appearance?.theme === 'light' || partial.appearance?.theme === 'dark' || partial.appearance?.theme === 'system'
      ? partial.appearance.theme
      : DEFAULT_SETTINGS.appearance.theme;

  return {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : DEFAULT_SETTINGS.enabled,
    surfaces: {
      channel: typeof partialSurfaces.channel === 'boolean' ? partialSurfaces.channel : DEFAULT_SETTINGS.surfaces.channel,
      recommendations: typeof partialSurfaces.recommendations === 'boolean' ? partialSurfaces.recommendations : DEFAULT_SETTINGS.surfaces.recommendations,
      home: typeof partialSurfaces.home === 'boolean' ? partialSurfaces.home : DEFAULT_SETTINGS.surfaces.home,
      search: typeof partialSurfaces.search === 'boolean' ? partialSurfaces.search : DEFAULT_SETTINGS.surfaces.search,
      subscriptions: typeof partialSurfaces.subscriptions === 'boolean' ? partialSurfaces.subscriptions : DEFAULT_SETTINGS.surfaces.subscriptions
    },
    whitelist: {
      channels: normalizedChannels
    },
    stats: {
      hiddenVideoIds: normalizedHiddenVideoIds
    },
    appearance: {
      theme: normalizedTheme
    }
  };
}

export async function readSettings(storage: StorageLike) {
  const stored = await storage.get(SETTINGS_KEY);
  return normalizeStoredSettings(stored[SETTINGS_KEY]);
}

export async function writeSettings(storage: StorageLike, settings: ExtensionSettings) {
  await storage.set({
    [SETTINGS_KEY]: normalizeStoredSettings(settings)
  });
}
