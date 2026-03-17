export type SurfaceKey = 'channel' | 'recommendations' | 'home' | 'search' | 'subscriptions';

export type ExtensionSettings = {
  enabled: boolean;
  surfaces: Record<SurfaceKey, boolean>;
};

type StorageLike = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (value: Record<string, unknown>) => Promise<void>;
};

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  surfaces: {
    channel: true,
    recommendations: true,
    home: true,
    search: true,
    subscriptions: true
  }
};

function normalizeStoredSettings(value: unknown): ExtensionSettings {
  const partial = typeof value === 'object' && value !== null ? (value as Partial<ExtensionSettings>) : {};
  const partialSurfaces = typeof partial.surfaces === 'object' && partial.surfaces !== null ? partial.surfaces : {};

  return {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : DEFAULT_SETTINGS.enabled,
    surfaces: {
      channel: typeof partialSurfaces.channel === 'boolean' ? partialSurfaces.channel : DEFAULT_SETTINGS.surfaces.channel,
      recommendations: typeof partialSurfaces.recommendations === 'boolean' ? partialSurfaces.recommendations : DEFAULT_SETTINGS.surfaces.recommendations,
      home: typeof partialSurfaces.home === 'boolean' ? partialSurfaces.home : DEFAULT_SETTINGS.surfaces.home,
      search: typeof partialSurfaces.search === 'boolean' ? partialSurfaces.search : DEFAULT_SETTINGS.surfaces.search,
      subscriptions: typeof partialSurfaces.subscriptions === 'boolean' ? partialSurfaces.subscriptions : DEFAULT_SETTINGS.surfaces.subscriptions
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
