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
| `bots.html` | Joins simulated students to a live session for a classroom-scale rehearsal. |

## Adding a game

1. Make `apps/<name>/index.html` that loads `../_shared/classroom.css`, `config.js`, `local.js`,
   `classroom.js`, then the game's own scripts (copy `inflation-auction/index.html`).
2. In `game.js`, build the game object and end with
   `window.CLASSROOM_GAME = game; if (!window.CLASSROOM_NO_START) window.Classroom.start(game);`
   so the bot runner can load it without drawing the page.
3. Answer rules go in `settings.input` (see `cls_check` in `schema.sql`): the server rejects
   anything else. Private per-student data comes from `assign`; results from `resolve`.
4. Add the game to the menu in `bots.html` and to the landing page.
5. Bump the `?v=` version on the script tags when publishing changes, so phones do not run a
   cached copy.

## Testing

- Local demo: `<app>/?demo=1&view=instructor`, add simulated students, run rounds.
- Backend: the SQL test script used on 2026-11-24 plays sessions through the `anon` role
  against a local PostgreSQL 17 (RLS, every rejection, steps, reveal-once, barter and money trades).
- Live: create a session on the instructor screen, then open `_shared/bots.html?app=<app>&code=XXXX`.
