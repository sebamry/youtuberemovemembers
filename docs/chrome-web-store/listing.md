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
- The extension does not sell personal data.
- The extension does not transfer user data to third parties.
- The extension does not use personal data for unrelated purposes.
- The extension does not use remote code.
- The extension does not collect browsing history outside the YouTube pages where it runs.

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

- Homepage URL: `https://github.com/<your-user>/<your-repo>`
- Support URL: `https://github.com/<your-user>/<your-repo>/issues`
- Privacy Policy URL:
  - recommended: GitHub Pages URL
  - fallback: public GitHub file URL for `PRIVACY.md`

## Assets You Still Need Before Submission

- extension icon `128x128`
- at least one store screenshot
- promotional tile if you want richer merchandising in the store

Keep the screenshots focused on the actual extension UI and YouTube before/after states.
