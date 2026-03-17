# Release Checklist

## GitHub Readiness

- choose the final public repository name
- push `main` to GitHub
- make sure `README.md` reflects the shipped behavior
- make sure `PRIVACY.md` is public
- decide the support URL, usually GitHub issues

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
- `release/youtube-members-filter-v1.0.0.zip` exists
- the root folder still loads in `chrome://extensions`
- the ZIP loads cleanly when unpacked for a final smoke test

## Chrome Web Store Submission

- upload the ZIP from `release/`
- fill in short description and detailed description
- set category
- add support URL
- add homepage URL
- add privacy policy URL
- complete privacy disclosures accurately
- add screenshots
- add promotional assets if desired
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
