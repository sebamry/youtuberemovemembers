# Chrome Web Store Listing Kit

Use this file as the source for your Chrome Web Store listing fields.

## Single Purpose

Hide YouTube videos and shelves that are marked as members-only or members-first so non-member browsing stays clean.

## Suggested Category

Productivity

## Suggested Language

Spanish or English, depending on the listing you want to publish first.

## Store Name

Members Only Filter

## Short Description

Hide members-only and members-first content across YouTube channels, home, search, recommendations, and subscriptions.

## Detailed Description

Members Only Filter removes members-only YouTube content from the places where it gets in the way most.

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

All filtering happens locally in your browser.

## Privacy Practices Summary

Use this wording when filling out the privacy section in the dashboard, adjusted to the exact questions shown there:

- The extension stores settings locally in Chrome storage.
- The extension stores a bounded local-only history of hidden YouTube video IDs to avoid recounting recent items.
- The extension stores a persistent total hidden-count number so the historical counter survives browser restarts.
- The extension does not sell personal data.
- The extension does not transfer user data to third parties.
- The extension does not use personal data for unrelated purposes.
- The extension does not use remote code.
- The extension runs only on YouTube pages and does not send browsing activity to a server.

## Permission Justification

### `storage`

Used to store:

- enabled/disabled state
- per-surface toggles
- theme preference
- whitelist entries
- local hidden-content statistics

### `https://www.youtube.com/*`

Required so the content script can identify and hide members-only content on supported YouTube surfaces.

## Reviewer Notes

Suggested note for Chrome Web Store review:

This extension has a single purpose: hide YouTube content that is explicitly marked as members-only or members-first. It runs only on YouTube pages, stores settings locally, and does not send user data to a server.

## Public URLs To Fill In After GitHub Is Live

- Homepage URL: `https://github.com/sebamry/youtuberemovemembers`
- Support URL: `https://github.com/sebamry/youtuberemovemembers/issues`
- Privacy Policy URL:
  - preferred: `https://sebamry.github.io/youtuberemovemembers/privacy/`
  - fallback ready now: `https://github.com/sebamry/youtuberemovemembers/blob/main/PRIVACY.md`

## Store Assets Included In This Repo

- extension icon `128x128`: `src/assets/icons/icon-128.png`
- screenshot `1280x800`: `docs/chrome-web-store/assets/store-screenshot-overview.png`
- screenshot `1280x800`: `docs/chrome-web-store/assets/store-screenshot-settings.png`
- small promo tile `440x280`: `docs/chrome-web-store/assets/store-small-promo-tile.png`

Keep the screenshots focused on the actual extension UI and YouTube before/after states.
