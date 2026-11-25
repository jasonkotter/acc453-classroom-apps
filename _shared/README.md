# Shared classroom toolkit

Every multiplayer app runs on these files. Design and decisions: `../../APP_BUILD_PLAN.md`
("Shared classroom system").

| File | What it is |
|---|---|
| `schema.sql` | The Supabase backend (`cls_*` tables and functions). Run once in the SQL editor; safe to re-run. Copies Bank Run's passphrase hash. |
| `config.js` | Supabase URL and publishable key for all apps. Empty values = local demo. |
| `classroom.js` | The toolkit: screens, joining, polling, instructor controls, CSV, charts, simulated students. The comment at the top documents the game object. |
| `local.js` | The local demo backend, the same rules as `schema.sql` kept in localStorage. Keep the two in step. |
| `classroom.css` | Shared styles, including the projector mode. |
| `bots.html` | Joins simulated students to a live session for a classroom-scale rehearsal. The live instructor screen now has the same thing built in: **Add 10 simulated students** joins Bot 1, Bot 2, … to the session (after a confirmation); they play each step while that instructor page is open, survive a reload (their keys are kept in that browser), and can be paused to test nonresponse. They stay in the session for good, so use a practice session. |
| `sessions.html` | Creates live sessions for several apps with one passphrase entry (`?apps=folder,folder` pre-ticks them); each app's instructor page in that browser then opens on its session. |
| `rehearse.js` | Rehearsal driver, loaded from the console on a live instructor page: `(await import('../_shared/rehearse.js')).default.run(null, 12)` joins 12 simulated students and clicks the instructor's own controls through every preset, logging each round's result in `Rehearse.log`. `opts.pick` handles games with custom controls (Class Check). |

## Teaching supports (added 2026-11-25, from APP_TEACHING_REVIEW.md)

Every game gets these from the toolkit; each game supplies its own content in `game.js`.

- **Nonresponse.** The instructor banner shows "X of Y answered (Z still to answer)" and what a
  non-answer becomes (`game.nonresponse`). Ending a step or closing with nobody answered, or with
  15% or more unanswered, asks for confirmation first. `game.expected(S)` says how many should
  answer (games with roles use it; Bank Run and Defend the Peg count only the first window's guess,
  since doing nothing is a real choice to hold there).
- **Late joiners** see a short "While you wait" task (`game.waitTask` to override).
- **Lost connection.** A student phone that cannot reach the session shows "Reconnecting…" and
  says that answers already sent are safe; a submit that fails on the network says to send again.
- **Round comparison card.** On the projector when the next round is shown, and again in the
  debrief: what changed in the settings, what stayed fixed, how many played, a caveat
  (`game.compare.note`), and a prediction prompt for `game.compare.metric`. `compare: false` turns
  it off (Class Check).
- **Debrief.** **Begin debrief** puts `game.debrief(S, h)` on the projector and phones: an
  *explain* prompt that quotes this round's numbers, a *transfer* question, and a one-question
  exit check on each phone that shows the reasoning and a common mistake after the student
  answers. Exit-check answers stay on the phone (session storage): they are not sent, graded,
  timed, or named. Recording them would need a schema change (`cls_submit` accepts answers only
  while a round is open).
- **`ui.brief(have, choose, next)`** draws the "You have / You choose / What happens next" card
  that each game's student screen now shows before the first decision, with a worked example.

## Adding a game

1. Make `apps/<name>/index.html` that loads `../_shared/classroom.css`, `config.js`, `local.js`,
   `classroom.js`, then the game's own scripts (copy `inflation-auction/index.html`).
2. In `game.js`, build the game object and end with
   `window.CLASSROOM_GAME = game; if (!window.CLASSROOM_NO_START) window.Classroom.start(game);`
   so the bot runner can load it without drawing the page.
3. Answer rules go in `settings.input` (see `cls_check` in `schema.sql`): the server rejects
   anything else. Private per-student data comes from `assign`; results from `resolve`.
4. Add the game to the menu in `bots.html`, to the list in `sessions.html`, and to the landing page.
5. Bump the `?v=` version on the script tags when publishing changes, so phones do not run a
   cached copy.

## Testing

- Local demo: `<app>/?demo=1&view=instructor`, add simulated students, run rounds.
- Backend: the SQL test script used on 2026-11-24 plays sessions through the `anon` role
  against a local PostgreSQL 17 (RLS, every rejection, steps, reveal-once, barter and money trades).
- Live: create a session on the instructor screen, then open `_shared/bots.html?app=<app>&code=XXXX`.
