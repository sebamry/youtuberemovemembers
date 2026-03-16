# YouTube Members Filter Extension Design

## Summary

Build a Google Chrome extension for YouTube that hides videos marked as members-only on channel video pages. The first version only targets channel pages and removes matching video cards from the layout entirely.

## Goals

- Hide channel-page video cards that are labeled as members-only.
- Support multiple YouTube interface languages in the first version.
- Keep the extension lightweight, with no popup, background worker, or options page in V1.
- Reuse the same practical MV3 shape that already works well in the local `youtubesummary` project: a content-script-first architecture that tolerates YouTube SPA navigation.

## Non-Goals

- Filtering videos on the YouTube home feed.
- Filtering watch-page recommendations.
- Filtering search results, subscriptions, or Shorts.
- Adding a settings UI.
- Intercepting internal YouTube API responses.

## User Experience

When a user opens a channel videos view on YouTube, the extension scans visible video cards and hides any card that carries the badge used for members-only or members-first content. The filtered videos should disappear from the layout without requiring a page refresh. The extension should keep filtering as more items load during scrolling or as YouTube re-renders the page during SPA navigation.

If the user visits any non-channel YouTube surface, the content script should stay loaded but inactive.

## Scope

V1 should activate on channel surfaces that render channel-owned video lists, such as:

- `https://www.youtube.com/@handle/videos`
- `https://www.youtube.com/c/name/videos`
- `https://www.youtube.com/user/name/videos`
- equivalent channel subroutes that still render the channel video grid/list

V1 should ignore general YouTube surfaces such as:

- home
- watch pages outside the channel lists
- global search results
- subscriptions
- Shorts feeds

## Architecture

The extension should be a minimal Chrome Manifest V3 project with a single YouTube content script. The content script is injected on `https://www.youtube.com/*`, but runtime logic limits active filtering to channel pages only. This is required because YouTube navigation is SPA-based and a script that only matches channel URLs can miss route changes.

The main units are:

- `manifest.json`: MV3 manifest with minimal permissions and YouTube host access.
- `src/content/main.ts`: bootstrap, route gating, lifecycle wiring, navigation listeners, initial scan, and debounced re-scan.
- `src/content/filter-members.ts`: finds candidate video cards, inspects badges, and marks cards for hiding.
- `src/content/i18n-badges.ts`: stores normalized badge phrases for supported languages.
- `src/content/styles.css`: hides cards marked by the filter through a data attribute.
- `src/shared/selectors.ts`: centralizes DOM selectors and small DOM helpers that are likely to change when YouTube updates its UI.

Each unit has one clear purpose: route/lifecycle management, detection, localization terms, styling, and selector management.

## Detection Strategy

Detection should use layered heuristics so the filter does not rely on a single fragile signal.

### Candidate Cards

The filter should scan channel-page renderers that represent individual videos. Expected candidates include:

- `ytd-rich-item-renderer`
- `ytd-grid-video-renderer`
- `ytd-video-renderer`

The implementation should resolve the nearest matching card container before applying any hide marker.

### Badge Detection

A video should be treated as members-only when the card contains a supported badge structure and at least one strong signal that the badge represents members-only access.

Signals should be checked in this order:

1. Badge text match: inspect badge text nodes inside YouTube badge renderers and compare normalized text against a maintained dictionary of members-only phrases in multiple languages.
2. Badge structure match: prefer known badge containers such as `ytd-badge-supported-renderer` and related text/icon nodes, rather than raw CSS class names.
3. Optional icon signal: if a stable SVG/icon pattern is found during implementation, use it as an additional strong signal, but not as the only required condition for V1.

The dictionary should include at least the common equivalents of:

- `miembros primero`
- `solo para miembros`
- `members only`
- `members first`

The implementation should normalize case, trim whitespace, collapse repeated spaces, and compare against normalized phrases.

### Hiding Behavior

When a card is identified as members-only, the filter should mark the card with:

- `data-yt-remove-members="true"`

The injected stylesheet should hide marked cards with:

- `display: none !important`

Using a data attribute plus CSS is preferred over setting inline styles on every pass because it is easier to inspect and avoids repeatedly mutating style properties.

### Idempotency

Repeated scans must be safe. The filter should:

- skip cards already marked as filtered
- avoid duplicate work where practical
- tolerate cards being detached and re-rendered by YouTube

## Page Activation Rules

The content script should stay inactive unless the current URL and document structure indicate a channel-page video surface.

Activation should require both:

- a channel-like path shape such as `/@`, `/c/`, `/user/`, or `/channel/`
- a page structure that contains recognized channel video renderers

This double check reduces the chance of filtering unrelated YouTube surfaces that happen to reuse similar components.

## Navigation and DOM Updates

YouTube is a SPA, so the extension cannot rely on a one-time page load.

The runtime should:

- run an initial scan after bootstrap
- observe `document.documentElement` with a debounced `MutationObserver`
- re-check route activation when the URL changes
- listen to standard navigation hooks such as `popstate`
- listen to YouTube-specific navigation events if available, such as `yt-navigate-finish`

The observer should debounce re-scans to reduce churn during large DOM updates.

## Error Handling and Safe Failure

If YouTube changes its DOM and detection becomes uncertain, the extension should fail safe by doing nothing rather than hiding ambiguous cards.

Specific expectations:

- Missing selectors should not throw uncaught errors.
- Unknown badges should be ignored.
- Non-channel pages should exit early without side effects.
- Route changes should re-run activation checks cleanly.

V1 does not need telemetry or logging beyond optional development-only console messages.

## Performance

The filter should remain lightweight because it runs on YouTube pages.

Performance constraints:

- debounce mutation-driven re-scans
- query only the renderers needed for channel pages
- avoid full-document expensive parsing on every mutation
- keep text normalization simple and synchronous

V1 does not need advanced caching beyond simple idempotent marking.

## Testing Strategy

The implementation plan should include automated tests before production code changes.

Required test coverage:

- unit tests for text normalization and badge phrase matching
- unit or integration tests for card detection and marking using representative fixture HTML
- lifecycle coverage for repeated scans after DOM mutation
- route-gating tests so non-channel pages are ignored

Manual verification should cover:

- a real channel page with visible members-only badges
- SPA navigation into and within a channel videos page
- infinite-scroll or lazy-loaded additions on a channel page
- a non-channel YouTube page to confirm the filter stays inactive

## Risks and Trade-Offs

### Primary Risk: YouTube DOM Changes

YouTube can change badge structure, text nodes, or renderer composition. Centralizing selectors and using layered heuristics reduces but does not remove this maintenance cost.

### Primary Trade-Off: Text Dictionary vs Full Semantic Detection

V1 intentionally uses a practical dictionary-based approach because it is much cheaper and easier to validate than intercepting internal YouTube data. This may require future updates if badge wording or localization changes.

### Layout Gaps

Hiding cards with `display: none` may create awkward reflow behavior in some channel layouts. This is acceptable in V1. If channel grids show persistent gaps, a future version can reconsider the removal strategy.

## Acceptance Criteria

V1 is successful when:

- On supported channel video pages, cards labeled as members-only are hidden automatically.
- Normal public videos remain visible.
- Filtering continues to work after SPA navigation and dynamic content loads.
- Non-channel YouTube pages are not modified.
- The extension remains simple: MV3 manifest, YouTube content script, no popup, no background worker, no options page.
