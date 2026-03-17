# YouTube Members Filter Controls Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a popup with global and per-surface toggles, persist settings in Chrome storage, and expand filtering support to channel pages, recommendations, home, search, and subscriptions with live on-page updates.

**Architecture:** Introduce a typed settings layer backed by `chrome.storage.local`, split the content runtime into a settings-aware orchestrator plus per-surface detector modules, and add a compact popup UI that writes settings directly. The runtime will react to `chrome.storage.onChanged`, hide matching cards for enabled surfaces, and unhide them when global or surface toggles are turned off.

**Tech Stack:** TypeScript, Chrome Manifest V3, esbuild, Vitest, jsdom

---

## Chunk 1: Settings, Popup, and Multi-Surface Runtime

### Task 1: Add settings storage primitives and manifest support

**Files:**
- Modify: `manifest.json`
- Create: `src/shared/settings.ts`
- Create: `tests/shared/settings.test.ts`

- [ ] **Step 1: Write the failing settings tests**

```ts
test('returns defaults when storage is empty', async () => {
  const settings = await readSettings(storage);
  expect(settings.enabled).toBe(true);
  expect(settings.surfaces.home).toBe(true);
});

test('merges partial stored values with defaults', async () => {
  await storage.set({ settings: { enabled: false, surfaces: { channel: true } } });
  const settings = await readSettings(storage);
  expect(settings.enabled).toBe(false);
  expect(settings.surfaces.search).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/shared/settings.test.ts`
Expected: FAIL because settings helpers do not exist yet.

- [ ] **Step 3: Write the minimal settings implementation**

Add `storage` permission to the manifest and create typed settings helpers with defaults, normalization, and write support in `src/shared/settings.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/shared/settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add manifest.json src/shared/settings.ts tests/shared/settings.test.ts
git commit -m "feat: add popup settings storage"
```

### Task 2: Add the popup UI and storage-driven controls

**Files:**
- Create: `src/popup/index.html`
- Create: `src/popup/main.ts`
- Create: `src/popup/styles.css`
- Create: `tests/popup/popup.test.ts`
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `scripts/build.mjs`

- [ ] **Step 1: Write the failing popup tests**

```ts
test('renders global and child toggles from stored settings', async () => {
  await mountPopupWithSettings({
    enabled: false,
    surfaces: { channel: true, recommendations: true, home: true, search: true, subscriptions: true }
  });

  expect(screen.getByLabelText('Filtro global')).not.toBeChecked();
  expect(screen.getByLabelText('Paginas de canal')).toBeDisabled();
});

test('writes updated settings immediately when a toggle changes', async () => {
  await mountPopupWithSettings();
  await user.click(screen.getByLabelText('Inicio'));
  expect(storage.set).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/popup/popup.test.ts`
Expected: FAIL because the popup does not exist yet.

- [ ] **Step 3: Write the minimal popup implementation**

Add popup assets, wire them into the manifest and build, render the global and child toggles, apply the hierarchy/disabled states, and persist changes immediately to storage.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/popup/popup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/popup/index.html src/popup/main.ts src/popup/styles.css tests/popup/popup.test.ts manifest.json package.json scripts/build.mjs
git commit -m "feat: add popup controls for filter surfaces"
```

### Task 3: Add reversible per-surface filtering

**Files:**
- Create: `src/content/surfaces/channel.ts`
- Create: `src/content/surfaces/home.ts`
- Create: `src/content/surfaces/recommendations.ts`
- Create: `src/content/surfaces/search.ts`
- Create: `src/content/surfaces/subscriptions.ts`
- Modify: `src/content/filter-members.ts`
- Modify: `src/content/runtime.ts`
- Create: `tests/content/surfaces.test.ts`
- Modify: `tests/content/main.test.ts`
- Modify: `tests/content/filter-members.test.ts`

- [ ] **Step 1: Write the failing surface tests**

```ts
test('finds members-only cards on the home feed', () => {
  document.body.innerHTML = homeFixtureHtml;
  const result = hideMembersOnlyVideosForSurface(document, 'home');
  expect(result.hiddenCount).toBe(1);
});

test('unhides cards when a surface is disabled', async () => {
  const runtime = bootstrapYouTubeMembersFilter(window, document, storage);
  await updateSettings({ enabled: true, surfaces: { home: false } });
  expect(document.querySelector('[data-yt-remove-surface=\"home\"]')).toBeNull();
  runtime.dispose();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/content/surfaces.test.ts tests/content/main.test.ts tests/content/filter-members.test.ts`
Expected: FAIL because multi-surface filtering and reversibility do not exist yet.

- [ ] **Step 3: Write the minimal per-surface implementation**

Create separate surface detectors, extend the filtering markers to record which surface hid each card, load settings into the runtime, and react to `chrome.storage.onChanged` by hiding or unhiding content immediately.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/content/surfaces.test.ts tests/content/main.test.ts tests/content/filter-members.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/surfaces src/content/filter-members.ts src/content/runtime.ts tests/content/surfaces.test.ts tests/content/main.test.ts tests/content/filter-members.test.ts
git commit -m "feat: support live multi-surface filtering"
```

### Task 4: Verify the full extension and build output

**Files:**
- Test: `tests/build/manifest.test.ts`
- Test: `tests/shared/settings.test.ts`
- Test: `tests/popup/popup.test.ts`
- Test: `tests/content/surfaces.test.ts`
- Test: `tests/content/main.test.ts`
- Test: `tests/content/filter-members.test.ts`

- [ ] **Step 1: Add the final failing build/popup integration assertions if needed**

Verify the build test covers popup assets in the manifest and the classic content-script constraint.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS with all tests green.

- [ ] **Step 3: Run type-checking**

Run: `npx tsc --noEmit`
Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS and emit `dist/manifest.json`, `dist/content/*`, and `dist/popup/*`.

- [ ] **Step 5: Inspect the built manifest**

Run: `cat dist/manifest.json`
Expected: Shows `storage` permission, popup entrypoint, YouTube content script JS/CSS, and popup assets wired correctly.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: verify popup-controlled members filter extension"
```
