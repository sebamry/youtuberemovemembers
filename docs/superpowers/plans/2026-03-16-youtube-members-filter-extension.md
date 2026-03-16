# YouTube Members Filter Extension Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension that hides members-only YouTube videos on channel video pages and keeps filtering during SPA navigation and dynamic page updates.

**Architecture:** A single YouTube content script will bootstrap on all YouTube pages, activate only on channel video surfaces, scan candidate video cards for members-only badges, and mark matched cards with a data attribute hidden by an injected stylesheet. The implementation stays modular by separating routing/lifecycle logic, badge phrase matching, DOM selectors, and filtering behavior.

**Tech Stack:** TypeScript, Chrome Manifest V3, Vite, Vitest, jsdom

---

## Chunk 1: Project Foundation and Filtering Runtime

### Task 1: Scaffold the extension toolchain and manifest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.json`
- Create: `src/content/main.ts`
- Create: `src/content/styles.css`

- [ ] **Step 1: Write the failing test for manifest and content-script build outputs**

```ts
import { readFileSync, existsSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('build output', () => {
  test('produces a manifest with a YouTube content script', () => {
    expect(existsSync('dist/manifest.json')).toBe(true);
    const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.content_scripts[0].matches).toContain('https://www.youtube.com/*');
    expect(manifest.content_scripts[0].js).toContain('content/main.js');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/build/manifest.test.ts`
Expected: FAIL because the project files and build output do not exist yet.

- [ ] **Step 3: Write the minimal project scaffold**

Create the Vite/Vitest TypeScript setup with `vite`, `vitest`, `typescript`, `jsdom`, and `@types/chrome`, add MV3 manifest copying, and add a placeholder `src/content/main.ts` plus `src/content/styles.css`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/build/manifest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts manifest.json src/content/main.ts src/content/styles.css tests/build/manifest.test.ts
git commit -m "chore: scaffold members filter extension"
```

### Task 2: Add route gating and badge phrase matching

**Files:**
- Create: `src/content/i18n-badges.ts`
- Create: `src/shared/selectors.ts`
- Create: `tests/content/route-gating.test.ts`
- Create: `tests/content/i18n-badges.test.ts`
- Modify: `src/content/main.ts`

- [ ] **Step 1: Write the failing tests for route activation and badge normalization**

```ts
test('recognizes supported channel video routes', () => {
  expect(isChannelVideoPage(new URL('https://www.youtube.com/@demo/videos'))).toBe(true);
  expect(isChannelVideoPage(new URL('https://www.youtube.com/watch?v=abc'))).toBe(false);
});

test('matches members-only badge phrases after normalization', () => {
  expect(isMembersBadgeText('  Miembros   primero ')).toBe(true);
  expect(isMembersBadgeText('Publico')).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/content/route-gating.test.ts tests/content/i18n-badges.test.ts`
Expected: FAIL because the helpers do not exist yet.

- [ ] **Step 3: Write the minimal route and phrase-matching implementation**

Implement URL gating for channel pages and a normalized dictionary that includes at least:

- `miembros primero`
- `solo para miembros`
- `members only`
- `members first`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/content/route-gating.test.ts tests/content/i18n-badges.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/i18n-badges.ts src/shared/selectors.ts src/content/main.ts tests/content/route-gating.test.ts tests/content/i18n-badges.test.ts
git commit -m "feat: add channel route gating and badge phrase matching"
```

### Task 3: Implement DOM filtering and lifecycle re-scan behavior

**Files:**
- Create: `src/content/filter-members.ts`
- Create: `tests/content/filter-members.test.ts`
- Create: `tests/content/main.test.ts`
- Modify: `src/content/main.ts`
- Modify: `src/content/styles.css`
- Modify: `src/shared/selectors.ts`

- [ ] **Step 1: Write the failing tests for filtering cards and reacting to DOM updates**

```ts
test('marks member-only cards for hiding', () => {
  document.body.innerHTML = `
    <ytd-rich-item-renderer>
      <div id="details">
        <ytd-badge-supported-renderer>
          <span>Miembros primero</span>
        </ytd-badge-supported-renderer>
      </div>
    </ytd-rich-item-renderer>
  `;
  hideMembersOnlyVideos(document);
  expect(document.querySelector('[data-yt-remove-members="true"]')).not.toBeNull();
});

test('re-scans when matching content is appended on an active channel page', async () => {
  const runtime = bootstrapYouTubeMembersFilter(window, document);
  appendMembersOnlyCard(document);
  await flushTimersAndMutations();
  expect(document.querySelector('[data-yt-remove-members="true"]')).not.toBeNull();
  runtime.dispose();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/content/filter-members.test.ts tests/content/main.test.ts`
Expected: FAIL because the filtering runtime is not implemented yet.

- [ ] **Step 3: Write the minimal filtering implementation**

Implement card scanning, badge inspection, and data-attribute marking in `src/content/filter-members.ts`.

- [ ] **Step 4: Run the filtering tests to verify they pass**

Run: `npm test -- tests/content/filter-members.test.ts`
Expected: PASS

- [ ] **Step 5: Write the minimal lifecycle implementation**

Implement initial scan, debounced mutation observation, route re-checking, and navigation listeners in `src/content/main.ts`.

- [ ] **Step 6: Run the lifecycle tests to verify they pass**

Run: `npm test -- tests/content/main.test.ts`
Expected: PASS

- [ ] **Step 7: Run both tests to verify the integrated behavior**

Run: `npm test -- tests/content/filter-members.test.ts tests/content/main.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/content/filter-members.ts src/content/main.ts src/content/styles.css src/shared/selectors.ts tests/content/filter-members.test.ts tests/content/main.test.ts
git commit -m "feat: filter members-only videos on channel pages"
```

### Task 4: Verify the full project

**Files:**
- Test: `tests/build/manifest.test.ts`
- Test: `tests/content/route-gating.test.ts`
- Test: `tests/content/i18n-badges.test.ts`
- Test: `tests/content/filter-members.test.ts`
- Test: `tests/content/main.test.ts`

- [ ] **Step 1: Run the unit test suite**

Run: `npm test`
Expected: PASS with all tests green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS and emit the extension files in `dist/`.

- [ ] **Step 3: Inspect the built manifest**

Run: `cat dist/manifest.json`
Expected: Shows MV3 metadata and the YouTube content script entry.

- [ ] **Step 4: Commit final implementation adjustments if needed**

```bash
git add .
git commit -m "test: verify members filter extension build"
```
