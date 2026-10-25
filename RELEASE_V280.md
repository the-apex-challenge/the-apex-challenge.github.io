# V2.80 — Daily hub, progression and Intel library

Home now has a single Daily objective with Play, Resume or View Result, puzzle/Trivia completion indicators, streak and UTC reset countdown. Six Free Play cards are always available and explicitly unranked; they do not alter the selected Daily.

The visual language uses consistent charcoal panels, warm gold accents and red primary actions on Home, Stats, Rankings and result screens. Mobile layouts keep readable descriptions, separate controls and touch targets.

Daily results include guesses, elapsed time, hints, score weighting and base/streak components. Copy Result produces a spoiler-free grid with no Legend names, a day/difficulty and the site link. Unsubmitted scores are labeled local previews. Clipboard failure exposes selectable result text.

Stats derive win rate, Easy/Hard rates, guess distribution and a 28-day activity calendar from saved Daily rounds. Existing historic data and total wins are preserved; missing earlier detailed history is never fabricated.

Intel Archive recovers techniques from completed Daily rounds, saved Trivia completion days and existing reward claims. Full notes remain locked until earned. Discovered techniques include source links, drills, category filtering and persistent favorites.

A keyboard-accessible scanner guide appears on the first new Daily selection before the timer begins and can be reopened from gameplay. Completed Daily entry routes directly to the result summary. Empty ranking boards invite a first score; today's matching submitted nickname is highlighted.

Validation: 253 automated tests; 48 responsive screen/viewport combinations at 360, 390, 768 and 1280px; real-browser tutorial, before-first-guess timer, Daily completion, spoiler-free clipboard, archive unlock/favorites persistence, typing retention and two-tab synchronization tests. Clean release validator and active module syntax checks pass. No production test scores or historic stat resets.

Weekly rankings now aggregate existing Daily and finished Daily Trivia scores for Monday–Sunday UTC. The two read-only public RPCs expose the same fields as existing rankings, bound result size to 50, use a fixed empty search path, retain nickname aliases and do not expose raw tables or user IDs. Activation followed explicit user approval of this public scope. Weekly totals were checked against source aggregates. Today/Overall endpoints and score validation remain unchanged. Friend challenges and cross-device accounts remain future work.
