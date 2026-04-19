# Members Only Filter

Hide members-only and members-first YouTube content so non-member browsing stays focused.

This Chrome extension removes member-gated video cards and fully member-only shelves from the YouTube surfaces where they are most distracting, while letting you keep specific channels visible through a whitelist.

## Features

- Hides members-only and members-first content on:
  - channel pages
  - Home
  - watch-page recommendations
  - search results
  - subscriptions
- Removes fully member-only shelves on channel pages
- Includes a global on/off switch plus per-surface toggles
- Supports a channel whitelist for creators you always want to keep visible
- Tracks page-level and historical hidden counts locally in Chrome storage
- Supports system, light, and dark themes in the popup and options page
- Handles YouTube's dynamic navigation and incremental DOM updates
- Detects known members-only badges in multiple languages covered by the test suite

## Why This Exists

Some YouTube pages surface member-gated videos even when you are not a member. This extension removes that noise without changing the rest of the browsing experience.

## Install Locally

### Requirements

- Node.js `24`
- npm

The repository includes `.nvmrc`, so you can run `nvm use` if you use `nvm`.

### Build

```bash
npm ci
npm run build
```

### Load The Extension In Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select one of these directories:
   - the repository root
   - `dist/`

`npm run build` writes the production build to `dist/` and mirrors the unpacked extension files back into the repository root for convenience.

## How It Works

The extension runs as a Manifest V3 content script on `https://www.youtube.com/*`.

- `src/content/` contains the filtering runtime, badge detection, and supported surface detectors
- `src/popup/` contains the quick controls for enabling the filter and toggling surfaces
- `src/options/` contains theme settings, whitelist management, and hidden-count reset controls
- `src/shared/` contains settings, theme helpers, and DOM selector utilities
- `scripts/build.mjs` bundles the extension with esbuild
- `scripts/package.mjs` creates a Chrome Web Store upload ZIP from `dist/`

The content runtime watches for YouTube route changes and DOM mutations so the filter keeps working as videos load in dynamically.

## Development

Useful commands:

```bash
npm test
npx tsc --noEmit
npm run build
npm run test:regression
npm run verify
```

`npm run verify` is the full local gate and runs tests, TypeScript checks, and the production build.

## Testing Coverage

The test suite covers:

- filtering logic for cards and shelves
- route and surface detection
- whitelist and settings normalization
- popup and options UI behavior
- regression fixtures for YouTube layouts that previously broke
- Chrome Web Store readiness docs and packaging metadata
- targeted runtime performance benchmarks in `tests/perf/runtime.perf.ts`

Current regression fixtures include:

- modern channel `/videos` grids
- members-only shelves on channel home pages
- public shelves that must remain visible

## Package For Chrome Web Store

Generate an upload ZIP with:

```bash
npm run package
```

The package is written to `release/`, and the script prints the exact ZIP path it generated.

Publishing docs live in:

- [PRIVACY.md](./PRIVACY.md)
- [docs/chrome-web-store/listing.md](./docs/chrome-web-store/listing.md)
- [docs/chrome-web-store/release-checklist.md](./docs/chrome-web-store/release-checklist.md)
- [docs/chrome-web-store/dashboard-submission.md](./docs/chrome-web-store/dashboard-submission.md)

## Privacy

The extension stores settings locally in Chrome storage. It does not send data to a server, track users, or collect browsing history beyond the YouTube surfaces needed to apply the filter.

Use [PRIVACY.md](./PRIVACY.md) as the privacy-policy source for your public repo or GitHub Pages site.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the local setup and verification flow expected before opening a pull request.

## Support

- Issues: [github.com/sebamry/youtuberemovemembers/issues](https://github.com/sebamry/youtuberemovemembers/issues)
- Repository: [github.com/sebamry/youtuberemovemembers](https://github.com/sebamry/youtuberemovemembers)
