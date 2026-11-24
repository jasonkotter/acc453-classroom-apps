# Bank Run

A hold-or-withdraw coordination game for the March 4 class on bank runs. Some depositors need cash, the round unfolds in three withdrawal windows with a public count, and everyone guesses how many will withdraw before choosing. Rules and payout examples are in [SPEC.md](SPEC.md); the class plan is in [INSTRUCTOR_GUIDE.md](INSTRUCTOR_GUIDE.md).

**Ported to the shared classroom toolkit on 2026-11-24.** The rules, presets, payouts, and screens
are unchanged; sessions, joining, and the backend now come from `../_shared/` like every other app.

| File | What it is |
|---|---|
| `index.html` + `game.js` | The app on the shared toolkit: student, instructor, and projector screens |
| `model.js` | The payout rule, unchanged. Every screen and every check calls it |
| `tests.html` | Open in a browser to run the model checks (90 pass as of 2026-11-13) |
| `legacy.html`, `config.js`, `supabase/schema.sql` | The pre-port version on its own `br_*` backend, kept as a fallback until the port passes a live run; then they can go |

## How the port maps the game onto the shared backend

- Each withdrawal window is a step. When the round opens, the instructor's browser picks who
  needs cash (role `need`); everyone else is a depositor (role `dep`).
- A student's answer for a window is `{wd, guess}`: the guess is accepted in window 1 only, and
  only depositors can answer in later windows (checked on the server).
- When a window ends, the instructor's browser counts the new withdrawals (depositors who said
  withdraw and had not withdrawn before, plus everyone who needs cash in window 1), publishes the
  count, and marks those depositors' withdrawals final. The window open when the round closes is
  counted only at the reveal, so the last count stays hidden until then, as before.
- If the published counts show the bank has run out of money, the step button is replaced by
  "End round: the bank has closed".

## Local demo

`index.html?demo=1&view=instructor`: Add 20 simulated students, Show round, Open withdrawals,
End window (three times), Reveal. Each browser tab on the Student phone screen is one more
depositor. Checked on 2026-11-24: window counts recomputed independently from the stored answers
match the published ones; a bad-loans round closes the bank in window 1 and pays each withdrawer
$54.50; guess, withdraw, undo, and a withdrawal turning final all work on a phone-sized screen.

## Live

Students open `index.html` (code and QR on the projector); the instructor opens
`index.html?view=instructor` and creates a session with the instructor passphrase. Rehearse with
`../_shared/bots.html?app=bank-run&code=XXXX`.

## Still open

- A live run of the ported version (then retire `legacy.html` and the `br_*` tables), and the
  3–5 person phone playtest.
- Classroom-scale rehearsal with 70–100 connections.
- After the first class, check whether three windows and 20% needing cash produce a run often
  enough, and correct "What to expect" in the instructor guide.
