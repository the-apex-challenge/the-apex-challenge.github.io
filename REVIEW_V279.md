# V2.79 — Full review and reliability improvements

Reviewed the active frontend modules, Daily and Free Play progression, scanner and guess limits, timers and hints, storage synchronization, nickname forms, score submission, Trivia requests and rendering, ranking reads/caches, accessibility controls, responsive layouts, deployment workflow, score Edge Function, and database access boundaries.

## Fixed

- Daily views now reconcile their mode and difficulty with the saved selection on every render. Another tab changing or clearing progress cannot leave a mismatched game or crash the active tab. Free Play remains independent.
- Background renders preserve text-field focus and caret selection, including Trivia answers and nickname drafts.
- A hint click immediately checks the round deadline, closing the small window before the periodic timer update.
- The rankings nickname input is required. Client and server validate the normalized nickname, rejecting empty or whitespace-padded short names and consistently collapsing repeated spaces.
- New Classic ranked requests must retain their 120-second timer. Untimed historical v265 submissions still use their original rules. Score weighting and streak calculations are unchanged.
- Trivia timer progress now uses one scale factor. A refresh halfway through a question no longer shrinks a half-width bar by another half.
- Mobile settings, nickname and navigation controls have 44px touch targets.
- Daily Trivia reward changes propagate to other open tabs.

## Verification

- 246 automated tests pass, including existing score parity and legacy compatibility tests.
- All active JavaScript modules parse; release validation passes on a clean build.
- Real Chromium: 44 screen/viewport combinations at 360, 390, 768 and 1280 pixels, with no horizontal overflow or page exceptions.
- Browser checks cover Trivia typing through rerenders, two-tab Daily reconciliation, clearing progress, timer progress, and a hint click after expiry.
- Existing RLS boundaries are enabled; anonymous reads and authenticated direct writes to score, question, run and nickname tables are denied. No database schema, historical score, or user statistics were changed.

## Remaining architectural limits

Daily scoring validates submitted guesses, answers, limits and timing, but Daily answers are still derived in public client code. This is suitable for a casual fan game, not proof of cheat-resistant play. Stronger protection would require server-issued runs and server-owned guess history. This release does not claim that protection or rewrite historical rankings.

Some character images still depend on external sources. Existing fallback behavior remains available when those sources fail. The repository retains older files that the established build cleanup excludes; removing them from source control is a separate cleanup, not part of this release.
