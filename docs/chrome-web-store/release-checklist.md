# Release Checklist

## GitHub Readiness

- choose the final public repository name
- push `main` to GitHub
- make sure `README.md` reflects the shipped behavior
- make sure `PRIVACY.md` is public
- confirm the support URL points to GitHub issues

## Pre-Release Verification

Run:

```bash
npm run verify
npm run test:regression
npm run package
```

Confirm:

- all tests pass
- typecheck passes
- build succeeds
- `release/members-only-filter-v1.0.0.zip` exists
- the root folder still loads in `chrome://extensions`
- the ZIP loads cleanly when unpacked for a final smoke test

## Chrome Web Store Submission

- upload the ZIP from `release/`
- fill in short description and detailed description
- set category
- add support URL: `https://github.com/sebamry/youtuberemovemembers/issues`
- add homepage URL: `https://github.com/sebamry/youtuberemovemembers`
- add privacy policy URL:
  - preferred: `https://sebamry.github.io/youtuberemovemembers/privacy/`
  - fallback: `https://github.com/sebamry/youtuberemovemembers/blob/main/PRIVACY.md`
- complete privacy disclosures accurately
- upload screenshots from `docs/chrome-web-store/assets/`
- upload the small promo tile from `docs/chrome-web-store/assets/store-small-promo-tile.png`
- include reviewer notes describing the single purpose

## Manual Smoke Test Before Clicking Submit

- channel home page hides a members-only shelf
- channel `/videos` hides members-only items
- public shelves remain visible
- popup toggles apply immediately
- whitelist keeps approved channels visible
- options page saves settings
- theme switcher works
- hidden counter updates

## After Publication

- tag the release in GitHub
- keep the privacy policy URL stable
- increment version in both `manifest.json` and `package.json` before every store update
