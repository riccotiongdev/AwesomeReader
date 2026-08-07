# AwesomeReader — Agent Instructions

## Agent skills

### Issue tracker

Local markdown: specs and issues live under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, label strings equal to their names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Build conventions

- `npm run build` is the single build command. It runs: TypeScript check + Vite web build + `cap sync` + Android Gradle `assembleDebug` (JDK 17 via Homebrew) + copies the fresh APK to `AwesomeReader.apk` in the project root.
- **Always run `npm run build` after making any change to the app** (source, styles, or config). The updated app must be reflected in the web bundle AND the rebuilt `AwesomeReader.apk`.
- `npm run build:web` is the web-only build if a full APK build is not wanted.
- Tests: `npm test` (vitest). Run the full suite after changes.
