# ADR-0001: EPUB-only for the Books MVP

**Status:** Accepted  
**Date:** 2026-02-18 (session)

## Context

AwesomeReader is being extended from an RSS reader into a multi-format reader (inspired by Readest). The formats under consideration — EPUB, PDF, MOBI/AZW3, FB2, CBZ, TXT/MD — are not one problem but several: EPUB is reflowable HTML/CSS in a zip; PDF is fixed-layout and needs a completely different rendering path; the rest are conversion busywork.

## Decision

The first MVP supports **EPUB only**. PDF is its own project and a separate milestone. MOBI/AZW3/FB2/CBZ/TXT/MD are explicitly out.

## Consequences

- The MVP proves the whole pipeline (import → store → render → resume) with one format.
- The reader reuses the existing OLED/Sepia/Light themes and typography nearly verbatim.
- Future formats bolt onto the folio adapter seam (ADR-0002) without reworking the shell.
