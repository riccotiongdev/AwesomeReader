# 02 — Books space shell

**What to build:** The top-level News|Books switcher (ADR-0003). The app opens in the last-used mode; the switcher is always visible (bottom tab bar on mobile, segmented control in the header on desktop) and switches spaces with one tap. The Books space shows a placeholder shelf region (fully wired in ticket 03); the News space keeps working exactly as before — all existing feeds, folders, and reading behavior must be untouched. The chosen mode is persisted so relaunches default to it. Switching modes preserves each space's state (e.g. an open article stays where it was).

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

Implemented and committed (`5527ca4`).

- `AppShell` owns the News|Books choice; persisted via `src/lib/space/space-mode.ts` (localStorage key `awesomereader_space`, defaults to news, guards unavailable storage). Unit-tested (5 cases, node env with storage stub).
- Desktop: segmented `SpaceSwitcher` pill rendered in both spaces' headers (News header via optional props threaded `HomePage → Header`; Books header inside `BooksSpace`).
- Mobile (≤520px): fixed `BottomTabBar` with safe-area inset; content (`space-news`/`space-books`) gets bottom padding, the Mark-All-Read FAB lifts above the bar.
- Both spaces stay mounted — the inactive one is CSS-hidden — so News state (open article, scroll, modals) survives switching.
- Android back no longer exits the app while in the Books space (`space !== 'books'` guard in HomePage's back handler).
- News is regression-free: all changes are additive optional props; `npm test` 77/77, `npm run build` green, APK rebuilt.

Known follow-ups (outside this ticket): Books back-button flow (reader → shelf) lands with the reader in tickets 04/05.

- [ ] Launch defaults to last-used mode (News on first launch)
- [ ] One-tap switch between News and Books from anywhere; switcher visible in both spaces
- [ ] News space regression-free: feeds, folders, article reader, and back-button behavior all work as before
- [ ] State per space survives switching (open article/book position retained)
- [ ] Mode persists across reloads and app restarts
