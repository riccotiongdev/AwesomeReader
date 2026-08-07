# ADR-0003: Two-space shell (News | Books)

**Status:** Accepted  
**Date:** 2026-02-18 (session)

## Context

AwesomeReader's shell is feed-centric (sidebar of feeds/folders, article list, article reader modal). Books are a different content model — a curated shelf, not a stream — and forcing them into the feed UI would pollute both experiences. The app needs a top-level way to choose "what kind of reading I'm doing today."

## Decision

The app gains two top-level **spaces**: **News** (everything existing) and **Books** (shelf + reader). A **persistent switcher** (bottom tab bar on mobile, segmented control in the header on desktop) sits at the top level; launching defaults to the **last-used mode**. The shelf and the reader are dedicated views, not the article modal. The feed experience stays untouched.

## Consequences

- Switching modes is one tap and state (open book, scroll positions) survives per mode.
- No dead-end landing screen; the "choose on entry" feel comes from the default-to-last-used behavior.
- Android hardware back in the reader returns to the shelf, then to the previous mode.
