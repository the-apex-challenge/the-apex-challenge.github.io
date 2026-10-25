# V2.78 — Classic Daily regression fix

New Daily attempts use Classic scanner gameplay with a shared UTC mystery. Easy Full Scan keeps five guesses and 70% score weight; Hard One Signal keeps six guesses and 100% weight. Timer, hints, streak bonuses and the one-score-per-user-per-day constraint remain unchanged.

The v278 submission protocol requires Classic on the server. The deployed submit-score function also accepts prior v265/v218 and legacy five-mode submissions so open old clients and rounds can finish. Played rounds retain their answers and progress; untouched prior single-Daily choices adopt Classic without changing difficulty. Historical local records and production database scores are not modified.

Intel checkpoint one unlocks on completion of the selected Daily puzzle; checkpoint two remains Daily Trivia. The old home reward panel now reads the same checkpoint state as the other reward controls. Existing UTC rollover handlers and late-response guards are retained and exercised in browser tests.

Validation: CI suite, JavaScript syntax checks, release validator, 90-date Classic selection coverage, authoritative score parity, legacy protocol compatibility, invalid mode/timing/difficulty rejection, history preservation, plus real Chromium Easy/Hard choice/reload/win/Intel/UTC rollover flows. No production test score inserted. Supabase submit-score v13 deployed before the frontend.

The previously referenced /mnt/data/daily-classic-hotfix.patch was unavailable in this Windows workspace; this fix was built and reviewed against repository main 7bc61b8 and live server v12 instead.
