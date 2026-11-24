# Bank Run

A hold-or-withdraw coordination game for the March 4 class on bank runs. Some depositors need cash, the round unfolds in three withdrawal windows with a public count, and everyone guesses how many will withdraw before choosing. Rules and payout examples are in [SPEC.md](SPEC.md); the class plan is in [INSTRUCTOR_GUIDE.md](INSTRUCTOR_GUIDE.md).

| File | What it is |
|---|---|
| `index.html` | The app: student, instructor, and projector screens |
| `model.js` | The payout rule. Every screen and every check calls it |
| `tests.html` | Open in a browser to run the model checks (90 pass as of 2026-11-13) |
| `config.js` | Empty = local demo. Supabase URL and anon key = live on phones |
| `supabase/schema.sql` | Tables and functions for live play |

## Local demo (works now)

Open `index.html` in a current browser. No install, account, or network connection is needed. Select **Instructor**, press **Add 30 simulated depositors**, then **Show round to class**, **Open withdrawals**, **End window** three times, and **Reveal results**. **Show next round** replays the same treatment unless you choose another. Add `?view=projector` or `?view=instructor` to the address to open a screen directly.

All tabs in one browser share the session, and each tab is its own student, so you can open three or four tabs to play several depositors against the simulated ones. **Reset demo** clears everything.

## Going live on phones (not yet tested)

The live mode is written but has never been run against a real Supabase project, and `schema.sql` was rewritten on 2026-11-13 for cash needs, windows, and guesses. Treat the first run as a test and expect to fix things.

1. Create a Supabase project (plan decision D8).
2. In the SQL editor, run all of `supabase/schema.sql`. Then run the short "step 2" statement at the bottom of that file with your own instructor passphrase. Only a hash of the passphrase is stored.
3. Put the project URL and the anon (publishable) key in `config.js`. Never put the service-role key or the passphrase there.
4. Host the folder at an https address (GitHub Pages, per D3) so phones can reach it and the QR code appears.
5. Open `index.html?view=instructor`, enter the passphrase, and create a session. Students go to the page, enter the four-letter code and a display name. Open the projector link from the instructor screen.

In live mode each screen asks the server for the current state every two to three seconds, and the instructor's actions also push an immediate update over a Supabase Realtime broadcast channel. A student who refreshes or reopens the page stays in the session on that device.

## Still open

- Run the live mode against a real project, then playtest with 3–5 phones (D.2, D.3).
- Classroom-scale rehearsal with 70–100 connections.
- The CSV export button has not been clicked since the export gained its new columns.
- After the first class, check whether three windows and 20% needing cash produce a run often enough, and correct "What to expect" in the instructor guide.
- Bank Run was built before the shared session toolkit exists. When the Inflation Auction goes through the full classroom flow, the session code in `index.html` and `schema.sql` (join, rounds, host actions, state polling) is the natural starting point for that toolkit, or should be replaced by it.
