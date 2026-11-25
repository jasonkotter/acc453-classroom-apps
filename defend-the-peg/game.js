/* Defend the Peg on the shared classroom toolkit (Apr 1, after 13.3). Bank Run's structure with
   a central bank and a currency peg. Everyone holds 100 pesos, pegged at 1 peso = $1. In each
   window a holder may convert to dollars at the peg. The central bank pays conversions from its
   dollar reserves (plus an IMF credit line, if on), window by window. If a window's requests
   exceed what is left, the peg breaks: that window's converters share what is left, and the
   peso falls by the devaluation. Holders earn a small premium if the peg survives. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, money } = ui;
  const sum = a => (a || []).reduce((x, y) => x + y, 0);
  const pct = x => Math.round(x * 100) + '%';

  const fields = [
    { id: 'reservePct', label: 'Dollar reserves (% of pesos outstanding)', type: 'number', min: 0, max: 100 },
    { id: 'imfPct', label: 'IMF credit line (% of pesos)', type: 'number', min: 0, max: 100 },
    { id: 'devalue', label: 'Devaluation if the peg breaks (%)', type: 'number', min: 0, max: 90 },
    { id: 'premium', label: 'Interest premium for holding ($)', type: 'number', min: 0, max: 20 },
    { id: 'needPct', label: 'Importers who must convert (%)', type: 'number', min: 0, max: 100, step: 5 },
    { id: 'windows', label: 'Windows', type: 'number', min: 1, max: 5 }
  ];
  const presets = [
    { id: 'thin', label: 'Thin reserves', note: 'Reserves cover 35% of pesos; 20% of holders are importers who must convert. The peg survives only if few others run.', values: { reservePct: 35, imfPct: 0, devalue: 40, premium: 2, needPct: 20, windows: 3 } },
    { id: 'ample', label: 'Ample reserves', note: 'The same economy with reserves covering 90% of pesos.', values: { reservePct: 90, imfPct: 0, devalue: 40, premium: 2, needPct: 20, windows: 3 } },
    { id: 'imf', label: 'Thin reserves plus an IMF line', note: 'Thin reserves again, with an IMF credit line worth 50% of pesos behind them.', values: { reservePct: 35, imfPct: 50, devalue: 40, premium: 2, needPct: 20, windows: 3 } }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { reservePct: n(v.reservePct, 35, 0, 100), imfPct: n(v.imfPct, 0, 0, 100), devalue: n(v.devalue, 40, 0, 90), premium: n(v.premium, 2, 0, 20), needPct: n(v.needPct, 20, 0, 100), windows: Math.round(n(v.windows, 3, 1, 5)) }; };
  function buildSettings(v) {
    const s = clean(v), wd = { type: 'bool', optional: true };
    s.input = { '1': { fields: { wd, guess: { type: 'int', label: 'Your guess', min: 0, max: 100, optional: true } } }, '*': { role: 'dep', fields: { wd } } };
    return s;
  }
  const steps = s => clean(s).windows;

  /* ---------- the model ---------- */
  function resolvePeg(s, n, byWindow) {
    s = clean(s);
    let left = n * (s.reservePct + s.imfPct), brokeIn = 0, cum = 0; const perWindow = [];
    byWindow.forEach((c, i) => {
      if (brokeIn) { perWindow.push(c ? 0 : null); return; }
      const ask = 100 * c; cum += c;
      if (ask <= left + 1e-9) { left -= ask; perWindow.push(c ? 100 : null); }
      else { perWindow.push(c ? left / c : null); left = 0; brokeIn = i + 1; }
    });
    const holders = n - cum, perHold = brokeIn ? 100 * (1 - s.devalue / 100) : 100 + s.premium;
    const imfUsed = Math.max(0, Math.min(n * s.imfPct, 100 * cum - n * s.reservePct));
    return { n, converted: cum, holders, brokeIn, perWindow, perHold, imfUsed, reserves: n * s.reservePct, imf: n * s.imfPct };
  }
  const maxSafe = (s, n) => Math.floor(n * (clean(s).reservePct + clean(s).imfPct) / 100);
  const payout = (r, w) => w ? r.perWindow[w - 1] : r.perHold;

  /* ---------- instructor side (the same counting as Bank Run) ---------- */
  function assign({ roster, settings, rng }) {
    const s = clean(settings), ids = ui.shuffle(roster.map(p => p.id), rng), nNeed = Math.round(ids.length * s.needPct / 100), priv = {};
    ids.forEach((id, i) => { priv[id] = i < nNeed ? { role: 'need', need: true } : { role: 'dep' }; });
    return { private: priv, pub: { nNeed, byWindow: [] } };
  }
  function countWindow(data, w) {
    const P = data.private, out = [];
    for (const m of data.moves) if (m.step === w && m.data.wd === true && P[m.player] && P[m.player].role === 'dep' && !P[m.player].wdWindow) out.push(m.player);
    return { ids: out, count: out.length + (w === 1 ? Object.values(P).filter(p => p.need).length : 0) };
  }
  function afterStep({ S, data, closedStep }) {
    const c = countWindow(data, closedStep), priv = {}; for (const id of c.ids) priv[id] = { wdWindow: closedStep };
    return { pub: { byWindow: (S.pub.byWindow || []).concat([c.count]) }, private: priv };
  }
  function resolve({ S, settings, data }) {
    const P = data.private; let by = S.pub.byWindow || [], priv = {};
    if (by.length < S.step) { const c = countWindow(data, S.step); for (const id of c.ids) priv[id] = { wdWindow: S.step }; by = by.concat([c.count]); }
    const r = resolvePeg(settings, Object.keys(P).length, by), wOf = id => P[id].need ? 1 : (P[id].wdWindow || (priv[id] && priv[id].wdWindow) || null);
    const g = { hold: [], run: [] };
    for (const m of data.moves) if (m.step === 1 && m.data.guess != null && P[m.player] && !P[m.player].need) g[wOf(m.player) ? 'run' : 'hold'].push(m.data.guess);
    for (const id in P) priv[id] = Object.assign(priv[id] || {}, { pay: payout(r, wOf(id)) });
    return { private: priv, pub: { byWindow: by }, result: { n: r.n, nNeed: S.pub.nNeed, byWindow: by, guessHold: ui.mean(g.hold), guessRun: ui.mean(g.run), nHold: g.hold.length, nRun: g.run.length } };
  }
  function controls(S, list) {
    const shut = S.phase === 'open' && !S.pending && resolvePeg(S.settings, S.nPlayers, S.pub.byWindow || []).brokeIn > 0;
    return shut ? list.filter(b => b.id !== 'step').map(b => b.id === 'close' ? Object.assign(b, { label: 'End round: the peg has broken', next: true }) : b) : list;
  }

  /* ---------- screens ---------- */
  function rules(s) {
    s = clean(s);
    return `<ul class="rules"><li>Each of you holds <b>100 pesos</b>. The central bank promises to swap pesos for dollars <b>one for one</b>.</li>
      <li>Its dollar reserves cover <b>${s.reservePct}%</b> of all pesos${s.imfPct ? `, and an <b>IMF credit line</b> adds ${s.imfPct}% more` : ''}.</li>
      ${s.needPct ? `<li>${s.needPct}% of you, picked at random, are <b>importers who must convert</b> today. Your phone tells you privately.</li>` : ''}
      <li><b>Convert</b> and you get $100, as long as dollars are left. <b>Hold</b> and you earn $${s.premium} of extra interest, worth $${100 + s.premium}, <b>if the peg survives</b>.</li>
      <li>If one window's requests exceed the dollars left, <b>the peg breaks</b>: that window's converters split what is left, and the peso falls <b>${s.devalue}%</b>, so holders end with $${100 - s.devalue}.</li>
      <li>${s.windows} windows; the count of conversions goes on the screen after each. Doing nothing counts as holding.</li></ul>`;
  }
  function meter(s, n, nNeed, cum) {
    const safe = maxSafe(s, n), p = k => Math.min(100, k / Math.max(1, n) * 100).toFixed(1);
    return `<div style="position:relative;height:38px;border-radius:9px;background:#e4eae7;margin:30px 0 30px"><div style="position:absolute;inset:0 auto 0 0;width:${p(cum)}%;background:#eb6834;border-radius:9px 0 0 9px"></div>
      ${nNeed ? `<i style="position:absolute;top:-7px;bottom:-7px;left:${p(nNeed)}%;border-left:2px dashed #152f39"><span style="position:absolute;top:-18px;left:6px;font-size:.8rem;font-weight:750;font-style:normal;white-space:nowrap">${nNeed} importers</span></i>` : ''}
      ${safe < n ? `<i style="position:absolute;top:-7px;bottom:-7px;left:${p(safe)}%;border-left:2px dashed #9d3c35"><span style="position:absolute;bottom:-19px;left:6px;font-size:.8rem;font-weight:750;font-style:normal;white-space:nowrap">Peg breaks beyond ${safe}</span></i>` : ''}</div>`;
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.byWindow); if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Reserves (+IMF)', 'Converted', 'Peg', 'Holders got'], done.map(h => { const s = clean(h.settings), r = resolvePeg(s, h.result.n, h.result.byWindow);
      return [`${h.roundNo}. ${esc(h.label)}`, `${s.reservePct}%${s.imfPct ? ' + ' + s.imfPct + '%' : ''}`, `${r.converted} of ${r.n} (${pct(r.converted / Math.max(1, r.n))})`, r.brokeIn ? `✖ broke in window ${r.brokeIn}` : '✔ held', money(r.perHold)]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), n = S.nPlayers, head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`, by = S.pub.byWindow || [];
    if (S.phase === 'instructions') return `${head}<h2>Hold pesos, or get out?</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const r = resolvePeg(s, n, by), cum = sum(by);
      const st = S.phase === 'closed' ? 'Conversions are closed. The last window is counted at the reveal.' : S.pending ? 'Counting…' : r.brokeIn ? `✖ The peg broke in window ${r.brokeIn}.` : `Window ${S.step} of ${s.windows} is open.${S.step === 1 ? ` ${S.nMoved} of ${n} have answered.` : ''}`;
      return `${head}<h2>${by.length ? `${cum} of ${n} have converted so far` : `${S.pub.nNeed} of ${n} holders are importers who must convert`}</h2>${meter(s, n, S.pub.nNeed, cum)}
        <div class="banner ${r.brokeIn ? 'bad' : 'warn'}"><strong style="font-size:1.3em">${st}</strong>Reserves: $${Math.round(r.reserves)}${r.imf ? ` + IMF $${Math.round(r.imf)}` : ''} against ${n * 100} pesos.</div>
        ${by.length ? ui.table(['Window', 'Converted', 'Total'], by.map((c, i) => [`Window ${i + 1}`, c, sum(by.slice(0, i + 1))])) : ''}${ctx.joinLine()}`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = resolvePeg(s, h.result.n, h.result.byWindow), x = h.result;
    return `${head}<div class="split"><div><div class="label">${r.brokeIn ? 'The peg broke' : 'The peg held'}</div><div class="lead">${r.brokeIn ? `Devalued ${s.devalue}%` : 'Peg held'}</div>
      <p class="sub">${r.converted} of ${r.n} converted; ${x.nNeed} had to. ${r.brokeIn ? `Holders end with ${money(r.perHold)}.` : `Holders earn ${money(r.perHold)}.`}${r.imfUsed > 0.5 ? ` The IMF line paid $${Math.round(r.imfUsed)}.` : ''}</p>
      ${ui.tiles([['Each converter got', r.perWindow.map((v, i) => v == null ? null : `w${i + 1}: ${money(v)}`).filter(Boolean).join(' · ') || '—'], ['Each holder got', money(r.perHold)], ['Holders guessed', x.guessHold != null ? Math.round(x.guessHold) + '%' : '—'], ['Converters guessed', x.guessRun != null ? Math.round(x.guessRun) + '%' : '—']])}</div>
      <div>${meter(s, r.n, x.nNeed, r.converted)}${ui.table(['Window', 'Converted', 'Each got'], x.byWindow.map((c, i) => [`Window ${i + 1}`, c, r.perWindow[i] == null ? '—' : money(r.perWindow[i])]))}</div></div>${comparison(S)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {}, rn = S.roundNo, by = S.pub.byWindow || [];
    if (S.phase === 'instructions') return '<h2>Get ready</h2><p class="sub">Read the rules. Conversions open in a moment.</p>';
    const cur = me.moves[String(S.step)] || {}, first = me.moves['1'] || {}, guess = first.guess;
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Counting…</h2>';
      const r = resolvePeg(s, S.nPlayers, by), K = s.windows;
      let html = `<h2>Window ${S.step} of ${K}</h2>${by.length ? `<div class="banner warn"><strong>${sum(by)} of ${S.nPlayers} have converted</strong>The peg breaks beyond ${maxSafe(s, S.nPlayers)}.</div>` : `<p class="sub">${S.pub.nNeed} of ${S.nPlayers} are importers who must convert. The peg breaks beyond ${maxSafe(s, S.nPlayers)}.</p>`}`;
      if (S.step === 1 && !r.brokeIn) html += `<h3>${guess == null ? 'First, your guess' : 'Your guess'}</h3><p class="note">What share of the class will have converted by the end?</p><div class="chips">${[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(g => `<button class="chip" data-guess="${g}" aria-pressed="${guess === g}">${g}%</button>`).join('')}</div>`;
      if (p.need) html += '<div class="banner"><strong>💵 You are an importer</strong>Your conversion is in. You get $100 if dollars are left.</div>';
      else if (p.wdWindow) html += `<div class="banner"><strong>💵 You converted in window ${p.wdWindow}</strong>That is final.</div>`;
      else if (r.brokeIn) html += '<div class="banner bad"><strong>✖ The peg has broken</strong>No more dollars at the peg. You still hold pesos.</div>';
      else if (cur.wd) html += '<div class="banner warn"><strong>💵 Conversion requested</strong>Final when this window ends.</div><button class="choice" data-wd="0"><b>Undo: keep my pesos</b></button>';
      else if (S.step === 1 && guess == null) html += '<p class="sub">Make your guess to see your choices.</p>';
      else html += `<div class="banner"><strong>🪙 You are holding pesos</strong>Worth $${100 + s.premium} if the peg holds; $${100 - s.devalue} if it breaks.</div><button class="choice" data-wd="1"><b>💵 Convert to dollars now</b><span>Get $100 if dollars are left.</span></button>`;
      return html + '<p class="msg" id="receipt"></p>';
    }
    if (S.phase === 'closed') return `<h2>Conversions are closed</h2><p class="sub">${p.need ? 'You converted as an importer.' : p.wdWindow || cur.wd ? 'You converted.' : 'You held your pesos.'} Waiting for the reveal.</p>`;
    return `<h2>Your result</h2><div class="bigpay">${money(p.pay)}</div><p class="sub">${p.need ? 'You converted as an importer.' : p.wdWindow ? `You converted in window ${p.wdWindow}.` : 'You held your pesos.'}</p>`;
  }
  let lastS = null;
  function wireStudent(root, ctx) {
    const S = lastS; if (!S) return;
    const cur = () => S.me.moves[String(S.step)] || {}, first = S.me.moves['1'] || {}, need = (S.me.priv[S.roundNo] || {}).need;
    const pay = (wd, guess) => { const d = {}; if (S.step === 1 && guess != null) d.guess = guess; if (wd != null && !need) d.wd = wd; return d; };
    root.querySelectorAll('[data-guess]').forEach(b => b.onclick = () => ctx.submit(pay(cur().wd, Number(b.dataset.guess))));
    root.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => ctx.submit(pay(b.dataset.wd === '1', first.guess)));
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>Window ${S.step}${S.pending ? ' · counting' : ''}</strong>${sum(S.pub.byWindow || [])} converted so far · ${S.nMoved} answers this window</div>` : ''; }
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const s = clean(st.settings), n = st.nPlayers, by = st.pub.byWindow || [], cum = sum(by), nNeed = st.pub.nNeed || 0;
    if (resolvePeg(s, n, by).brokeIn) return null;
    const hist = st.history.filter(h => h.result && h.result.byWindow), last = hist[hist.length - 1];
    const prior = last ? Math.max(nNeed / n, sum(last.result.byWindow) / last.result.n) : nNeed / n + 0.05;
    const guess = st.step === 1 ? Math.min(1, Math.max(nNeed / n, prior + (rand() - 0.5) * 0.25)) : Math.min(1, cum / n + Math.max(0, cum / n - nNeed / n) * (0.3 + rand()));
    const d = {}; if (st.step === 1) d.guess = Math.round(guess * 10) * 10;
    if (p.role === 'dep' && !p.wdWindow && Math.round(guess * n) > maxSafe(s, n)) d.wd = true;
    return Object.keys(d).length ? { submit: d } : null;
  }
  function exportRows(h, d) {
    const r = resolvePeg(h.settings, h.result.n, h.result.byWindow);
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id], g = d.moves.find(m => m.player === p.id && m.step === 1);
      return { round: h.roundNo, label: h.label, reserve_pct: h.settings.reservePct, imf_pct: h.settings.imfPct, broke_in_window: r.brokeIn || '', display_name: p.name, importer: !!x.need, converted_in_window: x.need ? 1 : x.wdWindow || '', guess_pct: g && g.data.guess != null ? g.data.guess : '', payout: x.pay != null ? x.pay.toFixed(2) : '' }; });
  }
  const game = { id: 'peg', title: 'Defend the Peg', tagline: 'Everyone holds pesos pegged to the dollar. Hold for the extra interest, or convert before the reserves run out.',
    fields, presets, buildSettings, steps, rules, assign, afterStep, resolve, controls, renderProjector, renderStudent: (S, me, ctx) => { lastS = S; return renderStudent(S, me, ctx); }, wireStudent, renderInstructor, sim, exportRows,
    stepLabel: S => S.step < steps(S.settings) ? `End window ${S.step} of ${steps(S.settings)}` : 'End the last window', closeLabel: S => S.step < steps(S.settings) ? 'End the round now' : 'End the last window', openLabel: 'Open conversions', model: { resolvePeg } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
