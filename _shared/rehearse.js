/* Rehearsal driver for a live session (used for the live tests; not loaded by any page).
   Load it from the browser console on an app's instructor page (?view=instructor) that holds a
   live session:   await import('../_shared/rehearse.js')   then   Rehearse.run(['preset', ...], 12)
   It joins N simulated students (the game's own sim), clicks the instructor's own controls through
   every listed round (show, open, each step, close, reveal), and records what happened in
   Rehearse.log. Steps wait until every student has answered or 25 seconds pass. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const C = window.Classroom, game = window.CLASSROOM_GAME;
const params = new URLSearchParams(location.search);
const host = JSON.parse(localStorage.getItem(`cls-host-${game.id}`) || 'null');
const code = (params.get('code') || (host && host.code) || '').toUpperCase();
const R = window.Rehearse = { log: [], busy: false, bots: [], stopBots: false, code };
const enabled = re => [...document.querySelectorAll('button')].find(b => b.offsetParent && !b.disabled && re.test(b.textContent.trim()));
const waitFor = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await sleep(600); } return null; };
let api = null;
async function state() { return api.state(code); }
async function joinBots(n) {
  const conn = await C.connect(game.id, false); api = conn.api;
  if (!conn.live) throw new Error('not live');
  for (let i = 0; i < n; i++) { const p = await api.join(code, `Bot ${i + 1}`); R.bots.push({ id: p.id, secret: p.secret, tag: p.tag, name: `Bot ${i + 1}` }); }
}
function startLoop() {
  R.stopBots = false;
  (async function loop() {
    while (!R.stopBots) {
      try { const st = await state(); if (st.phase === 'open' && !st.pending) for (const line of await C.simTick(api, code, R.bots, game, Math.random)) if (/fail|error/i.test(line)) R.log.push('bot: ' + line); }
      catch (e) { R.log.push('bot error: ' + e.message); }
      await sleep(1200);
    }
  })();
}
async function round(preset, opts) {
  const sel = [...document.querySelectorAll('select')].find(s => s.offsetParent);
  if (preset && sel) { sel.value = preset; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(400); }
  let b = null;
  if ((await state()).phase !== 'instructions') { b = await waitFor(() => enabled(/^Show (round|next round)/), 20000); if (!b) return R.log.push(`${preset}: no Show button`); b.click(); }
  const openText = typeof game.openLabel === 'function' ? null : game.openLabel;
  b = await waitFor(() => openText ? [...document.querySelectorAll('button')].find(x => x.offsetParent && !x.disabled && x.textContent.trim() === openText) : enabled(/^Open/), 20000); if (!b) return R.log.push(`${preset}: no Open button`); b.click();
  const answered = [];
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const st0 = await waitFor(async () => { const s = await state(); return s.phase === 'open' && !s.pending && (s.nMoved >= (opts.expect ? opts.expect(s) : s.nPlayers)) ? s : null; }, opts.maxWait || 25000) || await state();
    answered.push(`${st0.nMoved}/${st0.nPlayers}`);
    const nSteps = typeof game.steps === 'function' ? game.steps(st0.settings) : 1, last = st0.step >= nSteps;
    const want = last ? (game.closeLabel ? game.closeLabel(st0) : 'Close') : (game.stepLabel ? game.stepLabel(st0) : 'Next');
    let b2 = [...document.querySelectorAll('button')].find(x => x.offsetParent && !x.disabled && x.textContent.trim() === want), ended = last;
    if (opts.pick) { const p = opts.pick(st0); b2 = p && p.button; ended = !!(p && p.ended); }
    /* A game may swap in its own ending control (e.g. "End round: the peg has broken"). */
    if (!b2) { b2 = [...document.querySelectorAll('button')].find(x => x.offsetParent && !x.disabled && /^(End|Close)/.test(x.textContent.trim())); ended = true; if (b2) answered.push(`[${b2.textContent.trim()}]`); }
    if (!b2) return R.log.push(`${preset}: no button "${want}"`);
    b2.click();
    if (ended) break;
    await waitFor(async () => { const s = await state(); return s.phase !== 'open' || !s.pending; }, 30000);
  }
  b = await waitFor(() => enabled(/^Reveal/), 30000); if (!b) return R.log.push(`${preset}: no Reveal button`); b.click();
  const st = await waitFor(async () => { const s = await state(); return s.phase === 'revealed' ? s : null; }, 30000);
  const h = st && st.history.find(x => x.roundNo === st.roundNo);
  R.log.push(`${preset}: round ${st ? st.roundNo : '?'} answered ${answered.join(' ')} → ${st ? 'revealed' : 'NOT revealed'}${h && h.result ? ' · ' + JSON.stringify(h.result).slice(0, 400) : ''}`);
}
/* Bots only (the instructor drives by hand); R.stopBots = true stops them. */
R.startBots = async (n = 4) => { if (!R.bots.length) await joinBots(n); startLoop(); };
R.run = async (presets, n = 12, opts = {}) => {
  R.busy = true;
  try { if (!R.bots.length) await joinBots(n); startLoop(); for (const p of presets || game.presets.map(x => x.id)) await round(p, opts); }
  catch (e) { R.log.push('ERROR ' + e.message); }
  R.busy = false; R.stopBots = true;
};
export default R;
