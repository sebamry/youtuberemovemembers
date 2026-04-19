export type ReleaseMetadata = {
  version: string;
  zipFileName: string;
};

export type RegenerateIconsOptions = {
  rootDir?: string;
  runCommand?: (command: string, args: string[]) => Promise<unknown>;
  warn?: (message: string) => void;
};

export type RegenerateIconsResult = {
  usedFallback: boolean;
};

export function readReleaseMetadata(options?: { rootDir?: string }): Promise<ReleaseMetadata>;

export function regenerateIcons(options?: RegenerateIconsOptions): Promise<RegenerateIconsResult>;
