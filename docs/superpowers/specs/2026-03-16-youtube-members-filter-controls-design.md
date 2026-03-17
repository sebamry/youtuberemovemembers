# YouTube Members Filter Controls Design

## Summary

Add a Chrome extension popup that lets the user enable or disable the members-only filter globally and by YouTube surface. This work also expands the filter beyond channel video pages so the new child toggles have real effect in the first release of the controls UI.

## Goals

- Add a popup opened from the extension icon.
- Provide a global on/off control for the entire extension.
- Provide child controls for these YouTube surfaces:
  - channel pages
  - recommendations
  - home
  - search
  - subscriptions
- Apply toggle changes immediately without requiring a page reload.
- Keep the UI compact, clear, and easy to understand inside a Chrome extension popup.

## Non-Goals

- Adding a full options page.
- Adding per-channel allowlists or blocklists.
- Supporting Shorts in this iteration.
- Showing detailed analytics or counts of hidden videos.

## User Experience

When the user clicks the extension icon, a popup opens. At the top, the popup shows a visually prominent global switch that enables or disables the extension entirely. Below that, a second section shows per-surface switches that are visually subordinate to the global switch.

The child rows must use explicit labels:

- `Paginas de canal`
- `Recomendaciones`
- `Inicio`
- `Busqueda`
- `Suscripciones`

Each child row should also include a short explanation or tooltip clarifying what it affects.

If the global switch is off:

- the extension does not filter anything anywhere
- child controls remain visible
- child controls appear disabled/greyed out
- child states remain persisted so they are restored when the global switch is turned back on

The popup should also include a short note that changes apply instantly.

## UX Guidance

The popup is small, so the layout should prioritize clarity over density.

Specific guidance:

- The global switch should have stronger visual emphasis than child switches.
- The child group should be indented or otherwise styled to read as dependent on the global control.
- Disabled child rows must have high visual contrast against enabled rows so the state is obvious.
- Labels must avoid ambiguous names like `Canal`; prefer full surface descriptions.
- The design should avoid requiring a separate save button.

This guidance reflects the external UX critique gathered during design:

- strong hierarchy is a benefit and should be preserved
- too many toggles can feel crowded, so the popup should remain vertically simple
- terminology needs to be explicit
- the live-update behavior should be stated in the popup so users trust that the change took effect

## Scope Expansion

The existing implementation only filters channel video pages. This design intentionally expands filtering support so the new surface toggles are meaningful immediately.

The target surfaces are:

### Channel Pages

Channel-owned video listings such as:

- `/@handle/videos`
- `/c/name/videos`
- `/user/name/videos`
- `/channel/id/videos`

### Recommendations

Video cards shown as recommended or related content, especially in watch-page sidebars and similar recommendation rails.

### Home

Video cards on the YouTube home feed.

### Search

Video cards in global YouTube search results.

### Subscriptions

Video cards in the subscriptions feed.

## Architecture

This iteration adds three capabilities:

1. persisted settings state
2. popup UI
3. multi-surface filtering

The recommended structure is:

- `manifest.json`: add `storage` permission and popup entrypoint.
- `src/shared/settings.ts`: typed settings model, defaults, read/write helpers, and migration-safe normalization.
- `src/content/runtime.ts`: load settings, observe storage changes, route work by active surface, and apply filters live.
- `src/content/surfaces/`: one module per surface to keep selectors and matching rules separate.
- `src/content/filter-members.ts`: shared badge detection helpers reused by each surface module.
- `src/popup/`: popup HTML, script, and styles.

Each surface module should have one clear responsibility:

- detect candidate cards for that surface
- find the right parent card element to hide
- reuse shared badge-detection logic when possible

## Settings Model

Settings should be persisted in `chrome.storage.local`.

The minimum shape is:

```ts
type ExtensionSettings = {
  enabled: boolean;
  surfaces: {
    channel: boolean;
    recommendations: boolean;
    home: boolean;
    search: boolean;
    subscriptions: boolean;
  };
};
```

Default behavior should be:

- `enabled: true`
- `channel: true`
- all newly introduced surfaces default to `true`

This default matches the user's request to “do everything” unless manually disabled later.

## Popup Behavior

The popup should:

- load current settings on open
- render the global switch and child switches
- persist changes immediately when any switch changes
- disable child controls in the UI when the global switch is off
- keep child values stored even while disabled by the global switch

The popup does not need background messaging if direct `chrome.storage.local` access is enough.

## Live Update Behavior

Changes made in the popup must affect open YouTube tabs without requiring manual refresh.

The content runtime should:

- read settings during bootstrap
- subscribe to `chrome.storage.onChanged`
- re-run filtering when settings change
- if the extension becomes globally disabled, stop hiding new content and unhide already hidden content
- if a specific surface is disabled, unhide content previously hidden for that surface

This last point matters: a settings toggle must behave like a reversible filter, not a one-way hide.

## Surface Filtering Strategy

The existing badge detection logic should remain shared, but the candidate-card logic must become surface-aware.

Expected examples:

- channel pages: channel grid/list renderers
- recommendations: watch next and related-item renderers
- home: home feed renderers
- search: search result renderers
- subscriptions: subscription feed renderers

Where YouTube uses different wrappers, the surface module should hide the nearest stable card container for that layout.

## Reversibility

Because the extension can now be turned off in real time, hidden elements must be recoverable.

Recommended behavior:

- mark hidden cards with a shared data attribute
- also mark which surface logic hid them, for example:
  - `data-yt-remove-members="true"`
  - `data-yt-remove-surface="home"`
- when a surface or global setting is disabled, remove the hide markers from affected cards

This avoids needing to reload the page just to show content again.

## Error Handling and Safe Failure

- Missing storage state should fall back to defaults.
- Popup read/write failures should fail quietly with a user-visible fallback only if necessary.
- Unknown YouTube layouts should be ignored rather than hidden incorrectly.
- If a surface detector is uncertain, it should skip the card.

## Testing Strategy

This iteration requires additional automated coverage.

Required tests:

- settings defaults and persistence helpers
- popup rendering from stored settings
- popup state changes writing the expected storage values
- runtime reaction to storage changes
- unhide behavior when global or surface toggles are turned off
- detector coverage for each supported surface using representative fixture HTML

Manual verification should cover:

- enabling/disabling globally from the popup
- enabling/disabling only one surface while leaving others active
- watching the current page update immediately after toggle changes
- checking that hidden items reappear when the relevant toggle is turned off

## Risks and Trade-Offs

### Main Risk: Surface Complexity

Supporting five surfaces increases selector maintenance because YouTube uses different card structures in each one.

### Main UX Risk: Popup Crowding

The popup could become visually noisy if labels and descriptions are too verbose. This is why the layout should stay simple and vertical, with short helper copy.

### Trade-Off: Popup Instead of Options Page

Keeping controls in the popup is faster and more convenient for the user, but it limits how much explanation or future configuration can fit comfortably.

## Acceptance Criteria

This work is successful when:

- Clicking the extension icon opens a popup with a global switch and child switches.
- The child switches are clearly subordinate to the global switch.
- The extension can be disabled globally.
- Each child switch independently controls filtering for its own YouTube surface.
- Changing any switch applies immediately without reloading YouTube.
- Content hidden by the extension reappears when the relevant toggle is disabled.
- The existing channel-page behavior still works.
