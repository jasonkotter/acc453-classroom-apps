/* Can the Central Bank Be Believed? on the shared classroom toolkit. Rules: README.md.
   A small policy team (picked at random each round) sets inflation; everyone else sets wages and
   prices by forecasting it. Each year: the public enters its expected inflation, then the team
   chooses actual inflation and announces next year's plan. Unemployment falls below its natural
   rate only when inflation beats expectations: u = 5 − (π − πᵉ). The team's score counts
   inflation away from 2% and unemployment away from 3% (it wants unemployment below the natural
   rate), which is the temptation. Treatments: discretion; commitment (each plan binds next
   year); and a conservative central banker scored on inflation alone. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, pct } = ui;
  const TARGET = 2, NATURAL = 5, WANT_U = 3, MAXPI = 15;

  const fields = [
    { id: 'mode', label: 'Policy regime', type: 'select', options: [['discretion', 'Discretion: choose inflation each year'], ['commit', 'Commitment: each plan binds next year'], ['conservative', 'Conservative central banker: scored on inflation only']] },
    { id: 'years', label: 'Years', type: 'number', min: 2, max: 6 },
    { id: 'team', label: 'Policy team size', type: 'number', min: 1, max: 6 },
    { id: 'w', label: 'Weight the team puts on unemployment', type: 'number', min: 0, max: 5, step: 0.5 }
  ];
  const presets = [
    { id: 'disc', label: 'Discretion', note: 'The team chooses inflation each year after seeing the public\'s expectations. Announcements are only words.', values: { mode: 'discretion', years: 4, team: 3, w: 2 } },
    { id: 'commit', label: 'Commitment', note: 'A new team. Each year\'s announced plan becomes next year\'s inflation: the team cannot change it after expectations are set.', values: { mode: 'commit', years: 4, team: 3, w: 2 } },
    { id: 'cons', label: 'A conservative central banker', note: 'A new team, choosing each year again, but scored only on inflation (an independent banker with a price-stability mandate).', values: { mode: 'conservative', years: 4, team: 3, w: 2 } }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { mode: ['discretion', 'commit', 'conservative'].includes(v.mode) ? v.mode : 'discretion', years: Math.round(n(v.years, 4, 2, 6)), team: Math.round(n(v.team, 3, 1, 6)), w: n(v.w, 2, 0, 5) }; };
  function buildSettings(v) {
    const s = clean(v), input = {}, pi = { type: 'num', label: 'Inflation', min: 0, max: MAXPI }, ann = { type: 'num', label: 'Next year\'s plan', min: 0, max: MAXPI };
    for (let y = 1; y <= s.years; y++) {
      input[String(2 * y - 1)] = { role: 'public', required: ['exp'], fields: { exp: { type: 'num', label: 'Your forecast', min: 0, max: MAXPI } } };
      const last = y === s.years;
      input[String(2 * y)] = s.mode === 'commit'
        ? { role: 'policy', required: last ? [] : ['announce'], fields: { announce: Object.assign({ optional: true }, ann) } }
        : { role: 'policy', required: ['pi'], fields: { pi, announce: Object.assign({ optional: true }, ann) } };
    }
    s.input = input;
    return s;
  }
  const steps = s => 2 * clean(s).years;
  const teamW = s => s.mode === 'conservative' ? 0 : s.w;
  const unemp = (pi, pe) => NATURAL - (pi - pe);
  const loss = (pi, pe, w) => Math.pow(pi - TARGET, 2) + w * Math.pow(unemp(pi, pe) - WANT_U, 2);
  const best = (pe, w) => (TARGET + w * (NATURAL - WANT_U + pe)) / (1 + w);   // the team's best inflation given expectations
  const f1 = x => x == null || !isFinite(x) ? '—' : (Math.round(x * 10) / 10).toFixed(1) + '%';

  function rules(s) {
    s = clean(s);
    return `<ul class="rules">
      <li>A few of you are the <b>central bank</b> (the policy team, picked at random). Everyone else sets wages and prices.</li>
      <li>Each of ${s.years} years: first, <b>the public forecasts inflation</b>. Then the policy team ${s.mode === 'commit' ? '<b>announces next year\'s inflation, and that plan is binding</b>: this year\'s inflation is last year\'s plan (year 1: the 2% target)' : '<b>chooses this year\'s inflation</b> and may announce a plan for next year'}.</li>
      <li><b>Unemployment = ${NATURAL}% − (inflation − the class's average forecast).</b> Only a surprise moves it: inflation above what people expected pushes unemployment down.</li>
      <li><b>Public:</b> your score is how far your forecast missed. Lower is better.</li>
      <li><b>Policy team:</b> your score is (inflation − 2)²${teamW(s) ? ` + ${teamW(s)} × (unemployment − ${WANT_U})²` : ''}. Lower is better.${teamW(s) ? ` The team wants inflation at 2% and unemployment at ${WANT_U}%, below its natural rate.` : ' You are scored on inflation only.'}</li></ul>`;
  }

  /* ---------- the model ---------- */
  /* Replay steps 1..upTo. Returns the years and each student's running score. */
  function run(S, data, upTo) {
    const s = clean(S.settings), P = data.private, ids = Object.keys(P), team = ids.filter(id => P[id].role === 'policy');
    const mv = {}; for (const m of data.moves) (mv[m.step] = mv[m.step] || {})[m.player] = m.data;
    const years = [], miss = {}; let plan = TARGET, prevPi = TARGET, teamLoss = 0;
    for (let y = 1; 2 * y - 1 <= upTo; y++) {
      const ex = Object.entries(mv[2 * y - 1] || {}).filter(([id]) => P[id] && P[id].role === 'public').map(([id, d]) => [id, d.exp]);
      const pe = ex.length ? ui.mean(ex.map(e => e[1])) : prevPi;
      const yr = { year: y, announced: plan, pe, nExp: ex.length, spread: ex.length ? [Math.min(...ex.map(e => e[1])), Math.max(...ex.map(e => e[1]))] : null };
      if (2 * y <= upTo) {
        const tm = team.map(id => (mv[2 * y] || {})[id]).filter(Boolean);
        const med = k => { const v = tm.map(d => d[k]).filter(x => Number.isFinite(x)); return v.length ? ui.median(v) : null; };
        const pi = s.mode === 'commit' ? plan : (med('pi') ?? TARGET);
        const next = s.mode === 'commit' ? (med('announce') ?? plan) : med('announce');
        Object.assign(yr, { pi, u: unemp(pi, pe), loss: loss(pi, pe, teamW(s)), next, done: true });
        teamLoss += yr.loss; prevPi = pi; plan = next ?? TARGET;
        for (const [id, e] of ex) miss[id] = (miss[id] || 0) + Math.abs(pi - e);
      }
      years.push(yr);
    }
    return { years, miss, teamLoss, team };
  }
  function privOut(S, data, r) {
    const out = {}, last = r.years[r.years.length - 1];
    for (const id of Object.keys(data.private)) out[id] = data.private[id].role === 'policy' ? { score: r.teamLoss } : { score: r.miss[id] || 0 };
    return out;
  }
  function assign({ roster, settings, rng }) {
    const s = clean(settings), ids = ui.shuffle(roster.map(p => p.id), rng), k = Math.min(s.team, Math.max(1, ids.length - 1)), priv = {};
    ids.forEach((id, i) => { priv[id] = { role: i < k ? 'policy' : 'public', score: 0 }; });
    return { private: priv, pub: { years: [], nTeam: k, plan: TARGET } };
  }
  function afterStep({ S, data, closedStep }) {
    const r = run(S, data, closedStep), last = r.years[r.years.length - 1];
    return { pub: { years: r.years, plan: last && last.done ? (last.next ?? TARGET) : (last ? last.announced : TARGET) }, private: privOut(S, data, r) };
  }
  function resolve({ S, data }) {
    const s = clean(S.settings);
    let r = run(S, data, S.step);
    if (S.step % 2) r = run(S, data, S.step + 1);   // closed after a forecast step: that year's inflation is the default
    const yrs = r.years.filter(y => y.done), scores = Object.entries(r.miss).map(e => e[1]);
    return { private: privOut(S, data, r), pub: { years: r.years }, result: { mode: s.mode, years: yrs.length, avgPi: ui.mean(yrs.map(y => y.pi)), avgU: ui.mean(yrs.map(y => y.u)), avgPe: ui.mean(yrs.map(y => y.pe)),
      gap: ui.mean(yrs.map(y => y.pi - y.announced)), teamLoss: r.teamLoss, medMiss: ui.median(scores), discEq: TARGET + teamW(s) * (NATURAL - WANT_U) } };
  }

  /* ---------- screens ---------- */
  const modeName = m => ({ discretion: 'Discretion', commit: 'Commitment', conservative: 'Conservative banker' }[m]);
  function chart(S) {
    const s = clean(S.settings), ys = S.pub.years || [];
    const pts = k => ys.filter(y => y[k] != null && isFinite(y[k])).map(y => [y.year, y[k]]);
    return ui.lines([{ points: pts('announced'), color: '#9aa5a8', dash: true, dots: true, label: 'Announced' }, { points: pts('pe'), color: '#c47f17', dots: true, label: 'Public forecast (average)' }, { points: pts('pi'), color: '#9d3c35', dots: true, label: 'Actual inflation' }, { points: pts('u'), color: 'var(--teal)', dots: true, label: 'Unemployment' }],
      { xLabel: 'Year', yLabel: 'Percent', xMin: 1, xMax: s.years, yMin: 0, yMax: Math.max(10, ...ys.flatMap(y => [y.pi || 0, y.pe || 0, y.u || 0])) + 1, xTicks: Array.from({ length: s.years }, (_, i) => i + 1), xFmt: x => Math.round(x), yFmt: y => Math.round(y) + '%', aria: 'Announced, expected, and actual inflation and unemployment by year' });
  }
  function yearTable(S) {
    const ys = S.pub.years || [];
    if (!ys.length) return '';
    return ui.table(['Year', 'Announced', 'Public forecast', 'Inflation', 'Unemployment'], ys.map(y => [y.year, f1(y.announced), f1(y.pe), y.done ? `<b>${f1(y.pi)}</b>` : '…', y.done ? f1(y.u) : '…']));
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.years);
    if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Regime', 'Average inflation', 'Average unemployment', 'Inflation − announced', 'Team score'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, modeName(r.mode), `<b>${f1(r.avgPi)}</b>`, f1(r.avgU), (r.gap >= 0 ? '+' : '') + r.gap.toFixed(1), r.teamLoss.toFixed(1)]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>Can the central bank be believed?</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const y = Math.ceil(S.step / 2), pubStep = S.step % 2 === 1;
      const h2 = S.phase === 'closed' ? 'The last year is over' : S.pending ? 'Counting…' : pubStep ? `Year ${y}: public, forecast inflation` : `Year ${y}: the central bank decides`;
      const plan = (S.pub.years || []).length && pubStep ? ((S.pub.years.find(x => x.year === y - 1) || {}).next) : null;
      return `${head}<h2>${h2}</h2><div class="split"><div><div class="banner warn"><strong style="font-size:1.3em">${S.nMoved} in</strong>${pubStep ? `The central bank ${s.mode === 'commit' ? 'is committed to' : 'says it is aiming for'} <b>${f1(y === 1 ? TARGET : (plan ?? TARGET))}</b> this year.` : `${S.pub.nTeam}-person policy team: choose on your phones.`}</div>${yearTable(S)}${ctx.joinLine()}</div><div>${chart(S)}</div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">${modeName(r.mode)} · average inflation</div><div class="lead">${f1(r.avgPi)}</div>
      <p class="sub">with unemployment averaging <b>${f1(r.avgU)}</b> (natural rate ${NATURAL}%). Inflation ran ${Math.abs(r.gap).toFixed(1)} points ${r.gap >= 0 ? 'above' : 'below'} what was announced.${r.mode === 'discretion' ? ` If everyone saw the temptation coming, inflation would settle at <b>${f1(r.discEq)}</b> with no gain in jobs.` : ''}</p>${yearTable(S)}</div>
      <div>${chart(S)}</div></div>${comparison(S)}`;
  }
  /* The policy team's calculator: for each inflation choice, unemployment and the team's score. */
  function calculator(s, pe) {
    const w = teamW(s), rows = [], b = best(pe, w);
    for (let pi = 0; pi <= 10; pi++) rows.push([pi === Math.round(b) ? `<b>${pi}%</b>` : pi + '%', f1(unemp(pi, pe)), pi === Math.round(b) ? `<b>${loss(pi, pe, w).toFixed(1)}</b>` : loss(pi, pe, w).toFixed(1)]);
    return `<p class="note">With the public expecting ${f1(pe)}:</p>${ui.table(['Inflation', 'Unemployment', 'Team score (lower is better)'], rows)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {}, policy = p.role === 'policy';
    if (S.phase === 'instructions') return '<h2>Get ready</h2><p class="sub">Roles are assigned when the round opens.</p>';
    const ys = S.pub.years || [], role = policy ? `<div class="banner"><strong>You are on the policy team</strong>${s.mode === 'conservative' ? 'You are scored on inflation only.' : 'You want 2% inflation and unemployment at 3%.'}</div>` : '<div class="banner"><strong>You set wages and prices</strong>Forecast inflation as accurately as you can.</div>';
    const score = `<p class="note">Your score so far: ${(p.score || 0).toFixed(1)} (lower is better).</p>`;
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Counting…</h2>' + role;
      const y = Math.ceil(S.step / 2), pubStep = S.step % 2 === 1, mine = me.moves[String(S.step)];
      const plan = y === 1 ? TARGET : ((ys.find(x => x.year === y - 1) || {}).next ?? TARGET);
      const hist = ys.filter(x => x.done).map(x => `Year ${x.year}: announced ${f1(x.announced)}, inflation <b>${f1(x.pi)}</b>, unemployment ${f1(x.u)}`).join('<br>');
      const histHtml = hist ? `<p class="note">${hist}</p>` : '';
      if (pubStep && !policy) return `<h2>Year ${y}: your forecast</h2>${role}<p class="sub">The central bank ${s.mode === 'commit' ? 'is committed to' : 'says it is aiming for'} <b>${f1(plan)}</b> inflation this year.</p>${histHtml}
        <div class="row"><div class="field"><label for="cExp">Inflation you expect this year (%)</label><input id="cExp" type="number" min="0" max="${MAXPI}" step="0.5" inputmode="decimal" value="${mine ? mine.exp : ''}"></div><button class="btn primary" id="cSend">Submit</button></div>
        <p class="msg good" id="receipt">${mine ? `Your forecast: ${f1(mine.exp)}. You can change it until forecasts close.` : ''}</p>${score}`;
      if (pubStep && policy) return `<h2>Year ${y}</h2>${role}<p class="sub">The public is forecasting inflation. ${s.mode === 'commit' ? `This year's inflation is already fixed at ${f1(plan)}.` : 'You choose inflation next, after seeing their forecasts.'}</p>${histHtml}${score}`;
      if (!policy) return `<h2>Year ${y}</h2>${role}<p class="sub">Forecasts are in. The central bank is deciding.</p>${histHtml}${score}`;
      const yr = ys.find(x => x.year === y) || {}, pe = yr.pe ?? TARGET, last = y === s.years;
      if (s.mode === 'commit') return `<h2>Year ${y}: inflation is ${f1(plan)}</h2>${role}<p class="sub">The public expected ${f1(pe)}. ${last ? 'This is the last year; nothing more to decide.' : 'Announce next year\'s inflation. <b>It is binding</b>, and the public sees it before forecasting.'}</p>
        ${last ? '' : `<div class="row"><div class="field"><label for="cAnn">Next year's inflation (%)</label><input id="cAnn" type="number" min="0" max="${MAXPI}" step="0.5" inputmode="decimal" value="${mine && mine.announce != null ? mine.announce : ''}"></div><button class="btn primary" id="cSend">Submit</button></div>
        <p class="note">If the public believes your plan, unemployment stays at ${NATURAL}% and your score is (plan − 2)².</p>`}<p class="msg good" id="receipt">${mine && mine.announce != null ? `Your plan: ${f1(mine.announce)}.` : ''}</p>${histHtml}${score}`;
      return `<h2>Year ${y}: choose inflation</h2>${role}<p class="sub">The public expects <b>${f1(pe)}</b> on average. The team's choice is the middle of your votes.</p>
        <div class="row"><div class="field"><label for="cPi">Inflation this year (%)</label><input id="cPi" type="number" min="0" max="${MAXPI}" step="0.5" inputmode="decimal" value="${mine ? mine.pi : ''}"></div>
        ${last ? '' : `<div class="field"><label for="cAnn">Announce for next year (%), optional</label><input id="cAnn" type="number" min="0" max="${MAXPI}" step="0.5" inputmode="decimal" value="${mine && mine.announce != null ? mine.announce : ''}"></div>`}<button class="btn primary" id="cSend">Submit</button></div>
        <p class="msg good" id="receipt">${mine ? `Your vote: ${f1(mine.pi)}${mine.announce != null ? `; plan ${f1(mine.announce)}` : ''}.` : ''}</p>${calculator(s, pe)}${histHtml}${score}`;
    }
    if (S.phase === 'closed') return '<h2>The last year is over</h2>' + role + score;
    const h = S.history.find(x => x.roundNo === S.roundNo), r = h && h.result;
    return `<h2>${policy ? 'Your team\'s score' : 'Your forecasting score'}</h2><div class="bigpay">${(p.score || 0).toFixed(1)}</div><p class="sub">${policy ? 'inflation and unemployment away from the team\'s goals, summed over the years' : 'total points your forecasts missed by'} (lower is better). Average inflation this round: ${r ? f1(r.avgPi) : '—'}.</p>`;
  }
  function wireStudent(root, ctx) {
    const b = root.querySelector('#cSend'); if (!b) return;
    const val = id => { const el = root.querySelector(id); return el && el.value !== '' ? Math.max(0, Math.min(MAXPI, Math.round(Number(el.value) * 2) / 2)) : null; };
    b.onclick = () => {
      if (root.querySelector('#cExp')) { const e = val('#cExp'); if (e == null) return ctx.say('Enter your forecast.'); return ctx.submit({ exp: e }); }
      const d = {}, pi = root.querySelector('#cPi'), an = val('#cAnn');
      if (pi) { const v = val('#cPi'); if (v == null) return ctx.say('Enter this year\'s inflation.'); d.pi = v; }
      if (an != null) d.announce = an; else if (!pi) return ctx.say('Enter next year\'s plan.');
      ctx.submit(d);
    };
  }
  function renderInstructor(S) {
    if (S.phase !== 'open') return '';
    const pubStep = S.step % 2 === 1;
    return `<div class="banner"><strong>Year ${Math.ceil(S.step / 2)} · ${pubStep ? 'public forecasts' : 'policy team'} · ${S.nMoved} in</strong>${pubStep ? 'No forecasts = last year\'s inflation.' : 'No team answer = 2% (commitment: the plan stands).'}</div>`;
  }
  /* Simulated players. Public: year 1 near the announcement; later, mostly last year's inflation,
     partly the announcement. Team: the best response to the forecast (2% if conservative). */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const s = clean(st.settings), y = Math.ceil(st.step / 2), ys = st.pub.years || [], pubStep = st.step % 2 === 1;
    const prev = ys.find(x => x.year === y - 1), plan = y === 1 ? TARGET : (prev && prev.next != null ? prev.next : TARGET);
    const half = x => Math.max(0, Math.min(MAXPI, Math.round(x * 2) / 2));
    if (pubStep && p.role === 'public') { const base = s.mode === 'commit' || !prev ? plan : 0.3 * plan + 0.7 * prev.pi + 0.5; return { submit: { exp: half(base + (rand() - 0.5) * 1.5) } }; }
    if (!pubStep && p.role === 'policy') {
      const yr = ys.find(x => x.year === y) || {}, pe = yr.pe ?? TARGET;
      if (s.mode === 'commit') return y < s.years ? { submit: { announce: TARGET } } : null;
      return { submit: { pi: half(best(pe, teamW(s))), announce: TARGET } };
    }
    return null;
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id];
      return { round: h.roundNo, label: h.label, mode: h.settings.mode, display_name: p.name, role: x.role, answers: d.moves.filter(m => m.player === p.id).map(m => `${m.step}:${m.data.exp ?? ''}${m.data.pi ?? ''}${m.data.announce != null ? '/' + m.data.announce : ''}`).join(' '), score: (x.score || 0).toFixed(2) }; });
  }
  const game = { id: 'credibility', title: 'Can the Central Bank Be Believed?', eyebrow: 'Expectations and commitment', tagline: 'A few of you run the central bank. The rest of you decide whether to believe it.',
    fields, presets, buildSettings, rules, steps, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    openLabel: 'Open year 1 forecasts', stepLabel: S => S.step % 2 ? `Close year ${Math.ceil(S.step / 2)} forecasts` : `End year ${S.step / 2}`, closeLabel: S => S.step >= steps(S.settings) ? 'End the last year' : 'End the round now', model: { run, best, loss } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
