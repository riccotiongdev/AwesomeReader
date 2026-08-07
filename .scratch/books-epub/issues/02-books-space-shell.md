# 02 — Books space shell

**What to build:** The top-level News|Books switcher (ADR-0003). The app opens in the last-used mode; the switcher is always visible (bottom tab bar on mobile, segmented control in the header on desktop) and switches spaces with one tap. The Books space shows a placeholder shelf region (fully wired in ticket 03); the News space keeps working exactly as before — all existing feeds, folders, and reading behavior must be untouched. The chosen mode is persisted so relaunches default to it. Switching modes preserves each space's state (e.g. an open article stays where it was).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Launch defaults to last-used mode (News on first launch)
- [ ] One-tap switch between News and Books from anywhere; switcher visible in both spaces
- [ ] News space regression-free: feeds, folders, article reader, and back-button behavior all work as before
- [ ] State per space survives switching (open article/book position retained)
- [ ] Mode persists across reloads and app restarts
