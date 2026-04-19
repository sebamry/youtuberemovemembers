# Chrome Web Store Dashboard Submission Guide

Use this file while completing the Chrome Web Store Developer Dashboard.

## Store Listing

### Name

`Members Only Filter`

### Category

`Productivity`

### Language

Use `English` for the first listing unless you are also localizing the extension package.

### Short Description

`Hide members-only and members-first content across YouTube channels, home, search, recommendations, and subscriptions.`

### Detailed Description

`Members Only Filter removes members-only YouTube content from the places where it gets in the way most.

It can hide:

- members-only video cards on channel pages
- members-only shelves on channel home pages
- members-only items in home, search, recommendations, and subscriptions

It also includes:

- a global on/off switch
- per-surface controls
- a whitelist for channels you want to keep visible
- a persistent hidden-content counter
- system, light, and dark appearance support

All filtering happens locally in your browser.`

## Assets

### Store Icon

Upload:

- `src/assets/icons/icon-128.png`

### Screenshots

Upload at least these two:

- `docs/chrome-web-store/assets/store-screenshot-overview.png`
- `docs/chrome-web-store/assets/store-screenshot-settings.png`

### Small Promo Tile

Upload:

- `docs/chrome-web-store/assets/store-small-promo-tile.png`

### Marquee Promo Tile

Optional. Not included in this repo.

## Listing URLs

### Homepage URL

`https://github.com/sebamry/youtuberemovemembers`

### Support URL

`https://github.com/sebamry/youtuberemovemembers/issues`

### Privacy Policy URL

Preferred once live:

- `https://sebamry.github.io/youtuberemovemembers/privacy/`

Fallback you can use immediately:

- `https://github.com/sebamry/youtuberemovemembers/blob/main/PRIVACY.md`

## Privacy Tab

### Single Purpose Description

`Hide YouTube videos and shelves that are marked as members-only or members-first so non-member browsing stays clean.`

### Permission Justification

`storage`

`Used to save the enabled state, per-surface toggles, theme preference, whitelisted channels, a bounded recent hidden-video history for deduplication, and the persistent hidden-count total.`

`https://www.youtube.com/*`

`Required so the content script can identify and hide members-only content on supported YouTube pages.`

### Remote Code

Choose:

- `No, I am not using remote code`

### Data Use / Privacy Disclosures

The extension stores settings locally in Chrome storage.

The extension stores a bounded local-only history of hidden YouTube video IDs to avoid recounting recent items.

The extension stores a persistent total hidden-count number so the historical counter survives browser restarts.

The extension does not sell personal data.

The extension does not transfer user data to third parties.

The extension does not use personal data for unrelated purposes.

The extension does not use remote code.

The extension runs only on YouTube pages and does not send browsing activity to a server.

## Reviewer Notes

Paste this into the reviewer notes field:

`This extension has a single purpose: hide YouTube content that is explicitly marked as members-only or members-first. It runs only on YouTube pages, stores settings locally, and does not send user data to a server. The persistent hidden counter uses a bounded recent-ID history for deduplication plus a stored total count to avoid unbounded Chrome storage growth.`

## Final Pre-Submit Check

- `npm run verify`
- `npm run package`
- confirm `release/members-only-filter-v1.0.0.zip` is the file you upload
- smoke test the unpacked build once in `chrome://extensions`
- confirm the privacy answers in the dashboard match `PRIVACY.md`
