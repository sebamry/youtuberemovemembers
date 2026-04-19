# Members Only Filter

Hide members-only YouTube videos and member-only shelves so non-member browsing stays clean.

## What It Does

This Chrome extension removes YouTube content that is marked as members-only or members-first across:

- channel home pages
- channel video pages
- home feed
- recommendations on watch pages
- search results
- subscriptions

It also includes:

- a popup with global and per-surface toggles
- a channel whitelist
- a persistent hidden-content counter
- light, dark, and system theme support

## Why It Exists

Some YouTube channels show members-only videos in places where non-members can still see the cards. This extension removes that noise without changing the rest of the page.

## Install Locally

1. Run:

```bash
npm install
npm run build
```

2. Open `chrome://extensions`
3. Enable `Developer mode`
4. Click `Load unpacked`
5. Select either:

- the repository root
- or the built package directory: `./dist`

## Development

Useful commands:

```bash
npm test
npx tsc --noEmit
npm run build
npm run test:regression
npm run verify
```

Regression coverage includes frozen DOM fixtures for the YouTube layouts that have already broken in the past, including:

- modern channel `/videos` grids
- members-only shelves on channel home pages
- public shelves that must remain visible

## Package For Chrome Web Store

To generate a ZIP ready for upload:

```bash
npm run package
```

This writes a store package to:

`release/members-only-filter-v1.0.0.zip`

## Publishing Files

Chrome Web Store preparation docs live in:

- [PRIVACY.md](./PRIVACY.md)
- [docs/chrome-web-store/listing.md](./docs/chrome-web-store/listing.md)
- [docs/chrome-web-store/release-checklist.md](./docs/chrome-web-store/release-checklist.md)

## Privacy

The extension stores its settings locally in Chrome storage. It does not send data to a server, track users, or collect browsing history outside the supported YouTube surfaces it filters.

Use [PRIVACY.md](./PRIVACY.md) as the privacy-policy source for your public repo or GitHub Pages site.

## Support

The support URL for the Chrome Web Store listing is:

`https://github.com/sebamry/youtuberemovemembers/issues`
