# V2.81 — Free Play completion and uniform Pixel portraits

Reproduced the reported reward confusion: the generic navigation Play button used the saved global session and could open the Daily chooser. Completing that apparent ordinary mode correctly awarded Daily Intel, but the entry point had silently selected the wrong type of game.

All ordinary mode links now default to Free Play. The navigation explicitly says Free Play; Daily is entered through its dedicated Daily controls. Replay persists the Free Play session before saving, clears search state and retains its mode. Finished Free Play rounds clearly identify their result and expose Replay/Next without Daily Intel. Existing Daily progress, historic rotating rounds and score validation remain unchanged.

Pixel previously mixed six full-body cutouts with 22 square fallback portraits, resulting in inconsistent character scale and framing. All 28 Legends now use one locally bundled 256×256 portrait family from the site's existing fallback catalog. Pixel does not switch to unrelated full-body or skin sources. The compositor uses the same dimensions and placement for every portrait. Asset attribution is recorded in assets/pixel-portraits/README.md.

Finished Pixel rounds fully reveal the image on victory, loss, timeout and surrender. The full-image button works for all completed rounds; expanded images are not clipped by the clue panel.

Validation: 257 automated tests pass. Real Chromium checks cover 40 Free Play completion/replay/next flows across five guessing modes, four outcomes and two viewport sizes, plus Practice Trivia, all 28 loaded Pixel portraits with identical frame geometry, and positive Daily-only Intel checks. No production test scores were submitted, and historical stats were not reset.
