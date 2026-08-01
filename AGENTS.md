# AwesomeReader — Agent Instructions

## Build conventions

- `npm run build` is the single build command. It runs: TypeScript check + Vite web build + `cap sync` + Android Gradle `assembleDebug` (JDK 17 via Homebrew) + copies the fresh APK to `AwesomeReader.apk` in the project root.
- **Always run `npm run build` after making any change to the app** (source, styles, or config). The updated app must be reflected in the web bundle AND the rebuilt `AwesomeReader.apk`.
- `npm run build:web` is the web-only build if a full APK build is not wanted.
- Tests: `npm test` (vitest). Run the full suite after changes.
