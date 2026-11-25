/* Fire Sale on the shared classroom toolkit. Rules: README.md.
   Every student is a bank with $10 of cash and 90 units of the same long-term asset (price $1),
   funded by deposits and $6–$14 of equity (banks differ). In each step depositors withdraw; each bank
   chooses how many units to sell (and, with a lender of last resort, how much to borrow).
   Total sales push the price down by a published rule, which marks down every bank's units.
   A bank that cannot pay its withdrawals is forced to sell at a discount; a bank whose equity
   at market prices is below zero at the end fails. The reveal re-runs the same choices with no
   price impact, which separates the shared shock from the spillover. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, money, pct } = ui;
  const CASH0 = 10, UNITS0 = 90, DEP0 = 90;
  const NERVOUS_EQ = 4, NERVOUS_EXTRA = 8, WMIN = 3, WMAX = 9, EQMIN = 6, EQMAX = 14;

  const fields = [
    { id: 'impact', label: 'Price impact (% fall per 1% of all units sold)', type: 'number', min: 0, max: 3, step: 0.1 },
    { id: 'steps', label: 'Steps', type: 'number', min: 2, max: 5 },
    { id: 'forced', label: 'Forced-sale discount (%)', type: 'number', min: 0, max: 60 },
    { id: 'lolr', label: 'Central bank lends against the asset', type: 'checkbox' },
    { id: 'lend', label: 'Central bank lends up to (% of pre-crisis value)', type: 'number', min: 0, max: 100 },
    { id: 'rate', label: 'Central bank loan cost (%)', type: 'number', min: 0, max: 20, step: 0.5 },
    { id: 'seed', label: 'Withdrawals (same number = same shocks)', type: 'number', min: 1, max: 999 }
  ];
  const base = { impact: 0.5, steps: 3, forced: 20, lolr: false, lend: 70, rate: 2, seed: 1 };
  const presets = [
    { id: 'impact', label: 'Sales move the price', note: 'Every 1% of all the asset sold lowers its price 0.5%. Your units are marked at that price.', values: base },
    { id: 'noimpact', label: 'Same banks, no price impact', note: 'The same balance sheets and the same withdrawals. Sales no longer move the price.', values: Object.assign({}, base, { impact: 0 }) },
    { id: 'lolr', label: 'Sales move the price; the central bank lends', note: 'As round 1, but a bank can borrow from the central bank against its units at 70% of their pre-crisis value, for 2%.', values: Object.assign({}, base, { lolr: true }) }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { impact: n(v.impact, 0.5, 0, 3), steps: Math.round(n(v.steps, 3, 2, 5)), forced: n(v.forced, 20, 0, 60), lolr: !!v.lolr, lend: n(v.lend, 70, 0, 100), rate: n(v.rate, 2, 0, 20), seed: Math.round(n(v.seed, 1, 1, 999)) }; };
  function buildSettings(v) {
    const s = clean(v), f = { sell: { type: 'int', label: 'Units to sell', min: 0, maxPriv: 'units' } }, req = ['sell'];
    if (s.lolr) { f.borrow = { type: 'int', label: 'Amount to borrow', min: 0, maxPriv: 'cap', optional: true }; }
    s.input = { '1': { required: req.concat('predict'), fields: Object.assign({ predict: { type: 'int', label: 'Your price prediction', min: 0, max: 100 } }, f) }, '*': { required: req, fields: f } };
    return s;
  }
  const steps = s => clean(s).steps;

  function rules(s) {
    s = clean(s);
    return `<ul class="rules">
      <li>You run a bank: <b>$${CASH0} cash</b> and <b>${UNITS0} units</b> of a long-term asset worth $1.00 each, funded by deposits and <b>$${EQMIN}–$${EQMAX} of equity</b> (banks differ; yours is on your phone). Every bank in the room holds the same asset.</li>
      <li>In each of ${s.steps} steps your depositors withdraw (you see the amount first). You pay from cash. Choose how many units to <b>sell</b> to raise cash${s.lolr ? `, and how much to <b>borrow</b> from the central bank (up to ${s.lend}% of your units' pre-crisis value, at ${s.rate}%)` : ''}.</li>
      <li><b>The price rule:</b> ${s.impact ? `every 1% of all the asset in the room sold this step lowers its price <b>${s.impact}%</b>. Everyone's units are marked at the new price.` : 'sales do not move the price.'}</li>
      <li>If you are still short of cash, the rest is sold for you at a <b>${s.forced}% discount</b>. If your equity falls below $${NERVOUS_EQ}, more depositors leave next step ($${NERVOUS_EXTRA} extra).</li>
      <li>Equity = cash + units × price − deposits${s.lolr ? ' − central bank loan' : ''}. Below zero at the end, <b>your bank fails</b>. In step 1, also predict the price at the end.</li></ul>`;
  }

  /* ---------- the model ---------- */
  /* Withdrawals before any extra from nervous depositors, the same for the same seed and roster. */
  function shocks(ids, s) {
    const rng = ui.rng(s.seed * 104729 + ids.length), w = {};
    for (const id of ids) { w[id] = Array.from({ length: s.steps }, () => WMIN + Math.floor(rng() * (WMAX - WMIN + 1))); w[id].eq0 = EQMIN + Math.floor(rng() * (EQMAX - EQMIN + 1)); }
    return w;
  }
  /* Play steps 1..upTo with the given choices. moves[step][id] = {sell, borrow}. */
  function simulate(ids, wbase, moves, s, upTo) {
    const B = {}, U0 = UNITS0 * ids.length || 1, path = [{ step: 0, price: 1 }];
    for (const id of ids) B[id] = { cash: CASH0, units: UNITS0, dep: CASH0 + UNITS0 - wbase[id].eq0, eq0: wbase[id].eq0, loan: 0, failed: false, failStep: null, sold: 0, forcedSold: 0, beyond: 0, w: wbase[id][0], nervous: false };
    let p = 1;
    for (let st = 1; st <= upTo; st++) {
      const mv = moves[st] || {};
      let Q = 0, need = 0, beyond = 0;
      const act = ids.filter(id => !B[id].failed);
      for (const id of act) {
        const b = B[id], m = mv[id] || {}, q = Math.max(0, Math.min(b.units, Math.round(m.sell || 0)));
        const cap = s.lolr ? Math.max(0, b.units * s.lend / 100 - b.loan) : 0, br = Math.max(0, Math.min(cap, Math.round(m.borrow || 0)));
        const needed = Math.max(0, Math.ceil((b.w - b.cash - br) / p));
        b.q = q; b.br = br; b.needed = needed; Q += q; need += Math.min(q, needed); beyond += Math.max(0, q - needed);
      }
      const p1 = p * Math.max(0, 1 - s.impact * Q / U0);
      let F = 0;
      for (const id of act) {
        const b = B[id];
        b.units -= b.q; b.cash += b.q * p1 + b.br; b.loan += b.br; b.sold += b.q; b.beyond += Math.max(0, b.q - b.needed);
        let short = b.w - b.cash, fu = 0;
        if (short > 1e-9) {
          const px = p1 * (1 - s.forced / 100);
          fu = px > 0 ? Math.min(b.units, Math.ceil(short / px - 1e-9)) : b.units;
          b.units -= fu; b.cash += fu * px; b.forcedSold += fu; F += fu;
          if (b.cash < b.w - 1e-9) { b.failed = true; b.failStep = st; F += b.units; b.units = 0; }
        }
        const pay = Math.min(b.cash, b.w); b.cash -= pay; b.dep -= pay;
      }
      p = p1 * Math.max(0, 1 - s.impact * F / U0);
      let nFail = 0, eqs = [];
      for (const id of ids) {
        const b = B[id];
        b.eq = b.cash + b.units * p - b.dep - b.loan * (1 + s.rate / 100);
        if (b.failed) nFail++; else eqs.push(b.eq);
        if (st < s.steps) { b.nervous = !b.failed && b.eq < NERVOUS_EQ; b.w = b.failed ? 0 : wbase[id][st] + (b.nervous ? NERVOUS_EXTRA : 0); }
      }
      path.push({ step: st, price: p, sold: Q, forced: F, needSold: need, beyond, failed: nFail, medEq: ui.median(eqs), soldShare: (Q + F) / U0 });
    }
    return { B, path, price: p };
  }
  const movesOf = data => { const o = {}; for (const m of data.moves) (o[m.step] = o[m.step] || {})[m.player] = m.data; return o; };
  const privOf = (b, s, price) => ({ eq0: b.eq0, cash: b.cash, units: b.units, price, loan: b.loan, dep: b.dep, eq: b.eq, failed: b.failed, failStep: b.failStep, w: b.w, nervous: b.nervous, sold: b.sold, forcedSold: b.forcedSold,
    cap: s.lolr && !b.failed ? Math.max(0, Math.floor(b.units * s.lend / 100 - b.loan)) : 0 });

  function assign({ roster, settings, seed }) {
    const s = clean(settings), ids = roster.map(p => p.id).sort(), w = shocks(ids, s), priv = {};
    for (const id of ids) priv[id] = { eq0: w[id].eq0, cash: CASH0, units: UNITS0, price: 1, loan: 0, dep: CASH0 + UNITS0 - w[id].eq0, eq: w[id].eq0, failed: false, w: w[id][0], cap: s.lolr ? Math.floor(UNITS0 * s.lend / 100) : 0 };
    return { private: priv, pub: { seed, n: ids.length, path: [{ step: 0, price: 1 }] } };
  }
  function play(S, data, upTo, s) {
    const ids = Object.keys(data.private).sort(), wbase = shocks(ids, s);
    return { ids, wbase, run: simulate(ids, wbase, movesOf(data), s, upTo) };
  }
  function afterStep({ S, data, closedStep }) {
    const s = clean(S.settings), { ids, run } = play(S, data, closedStep, s), priv = {};
    for (const id of ids) priv[id] = privOf(run.B[id], s, run.price);
    return { pub: { path: run.path }, private: priv };
  }
  function resolve({ S, data }) {
    const s = clean(S.settings), { ids, wbase, run } = play(S, data, S.step, s), priv = {};
    const flat = simulate(ids, wbase, movesOf(data), Object.assign({}, s, { impact: 0 }), S.step);
    let failed = 0, failedFlat = 0, solvencyFails = 0;
    for (const id of ids) {
      const b = run.B[id], f = flat.B[id], dead = b.failed || b.eq < 0;
      if (dead) failed++; if (f.failed || f.eq < 0) failedFlat++; if (!b.failed && b.eq < 0) solvencyFails++;
      priv[id] = Object.assign(privOf(b, s, run.price), { dead, eqFlat: f.eq, deadFlat: f.failed || f.eq < 0, w: 0, cap: 0, units: b.units });
    }
    const path = run.path, sold = ui.sum(path.map(x => x.sold || 0)), forced = ui.sum(path.map(x => x.forced || 0)), beyond = ui.sum(path.map(x => x.beyond || 0));
    const preds = data.moves.filter(m => m.step === 1 && Number.isFinite(m.data.predict)).map(m => m.data.predict / 100);
    const eqs = ids.map(id => run.B[id].eq);
    return { private: priv, pub: { path }, result: { n: ids.length, price: run.price, failed, failedFlat, solvencyFails, sold, forced, beyond, soldShare: (sold + forced) / (UNITS0 * ids.length || 1),
      beyondShare: sold + forced ? beyond / (sold + forced) : 0, predict: ui.mean(preds), medEq: ui.median(eqs), impact: s.impact, lolr: s.lolr, loans: ui.sum(ids.map(id => run.B[id].loan)) } };
  }

  /* ---------- screens ---------- */
  const cents = p => (p * 100).toFixed(1) + '¢';
  function chart(S) {
    const s = clean(S.settings);
    const series = [{ points: (S.pub.path || [{ step: 0, price: 1 }]).map(x => [x.step, x.price * 100]), color: 'var(--teal)', dots: true, label: `This round: ${esc(S.label)}` }];
    for (const h of S.history.filter(x => x.roundNo !== S.roundNo && x.pub && x.pub.path && x.result).slice(-2))
      series.push({ points: h.pub.path.map(x => [x.step, x.price * 100]), color: '#9aa5a8', dash: true, label: `Round ${h.roundNo}` });
    const lo = Math.min(...series.flatMap(x => x.points.map(p => p[1])));
    return ui.lines(series, { xLabel: 'Step', yLabel: 'Price of the asset (¢)', xMin: 0, xMax: s.steps, yMin: Math.max(0, Math.floor((lo - 5) / 10) * 10), yMax: 100, xFmt: x => Math.round(x), yFmt: y => Math.round(y) + '¢', xTicks: Array.from({ length: s.steps + 1 }, (_, i) => i), aria: 'The asset price by step' });
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.n);
    if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Final price', 'Share of the asset sold', 'Sold beyond withdrawals', 'Banks failed'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, cents(r.price), pct(r.soldShare), pct(r.beyondShare), `<b>${r.failed} of ${r.n}</b>`]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>Every bank holds the same asset</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    const path = S.pub.path || [], last = path[path.length - 1] || { price: 1 };
    const tiles = ui.tiles([['Price of the asset', cents(last.price), 'hi'], ['Banks failed so far', `${last.failed || 0} of ${S.pub.n}`], ['Sold last step (incl. forced)', last.step ? pct(last.soldShare) + ' of all' : '—'], ['Median equity', last.medEq != null ? money(last.medEq, 2) : '—']]);
    if (S.phase === 'open' || S.phase === 'closed') {
      return `${head}<h2>${S.phase === 'open' ? (S.pending ? 'Selling, repricing…' : `Step ${S.step} of ${s.steps}: withdrawals are in. Sell${s.lolr ? ', borrow,' : ''} or hold?`) : 'The crisis is over'}</h2>${tiles}
        <div class="split"><div><div class="banner warn"><strong>${S.nMoved} of ${S.nPlayers} banks have decided</strong>${s.impact ? `Each 1% of the asset sold lowers the price ${s.impact}%.` : 'Sales do not move the price this round.'} No answer = sell nothing.</div>${ctx.joinLine()}</div><div>${chart(S)}</div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">Final price ${cents(r.price)}${r.predict != null ? ` · the class predicted ${cents(r.predict)}` : ''}</div><div class="lead">${r.failed} of ${r.n} banks failed</div>
      ${r.impact ? `<p class="sub">With the <b>same choices and the same withdrawals</b> but no price impact, <b>${r.failedFlat}</b> would have failed. The difference is what banks did to each other.</p>` : '<p class="sub">Sales did not move the price, so every failure came from the bank\'s own withdrawals and choices.</p>'}
      ${ui.tiles([['Share of the asset sold', pct(r.soldShare)], ['Of that, beyond what withdrawals needed', pct(r.beyondShare)], ['Forced sales (units)', ui.num(r.forced)], [r.lolr ? 'Borrowed from the central bank' : 'Failed only at market prices', r.lolr ? money(r.loans, 0) : `${r.solvencyFails}`]])}</div>
      <div>${chart(S)}</div></div>${comparison(S)}`;
  }
  function sheet(p, s) {
    return ui.table(['Assets', '', 'Liabilities', ''], [
      ['Cash', money(p.cash, 2), 'Deposits', money(p.dep, 2)],
      [`Asset: ${ui.num(p.units)} units × ${cents(p.price)}`, money(p.units * p.price, 2), s.lolr ? 'Central bank loan' : '', s.lolr ? money(p.loan, 2) : ''],
      ['', '', '<b>Equity</b>', `<b>${money(p.eq, 2)}</b>`]]);
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {};
    if (S.phase === 'instructions') return `<h2>Get ready</h2><p class="sub">You start with $${CASH0} cash and ${UNITS0} units of the asset at $1.00. Your equity appears when the round opens.</p>`;
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Selling, repricing…</h2>' + sheet(p, s);
      if (p.failed) return `<h2>✖ Your bank failed</h2><p class="sub">It could not pay its depositors in step ${p.failStep}; its remaining units were sold off.</p>`;
      const mine = me.moves[String(S.step)], needU = Math.max(0, Math.ceil((p.w - p.cash) / p.price));
      const pred = S.step === 1 ? `<div class="field"><label for="fPred">Predict: the asset's price at the end, in cents</label><input id="fPred" type="number" min="0" max="100" inputmode="numeric" value="${mine && mine.predict != null ? mine.predict : ''}"></div>` : '';
      return `<h2>Step ${S.step} of ${s.steps}</h2>
        <div class="banner"><strong>Withdrawals this step</strong><span class="bigpay">${money(p.w, 0)}</span>${p.nervous ? `Your equity fell below $${NERVOUS_EQ}, so more depositors are leaving.` : `You hold ${money(p.cash, 2)} of cash.`}</div>
        ${sheet(p, s)}${pred}
        <div class="row"><div class="field"><label for="fSell">Units to sell (0–${p.units})</label><input id="fSell" type="number" min="0" max="${p.units}" inputmode="numeric" value="${mine ? mine.sell : ''}"></div>
        ${s.lolr ? `<div class="field"><label for="fBorrow">Borrow (up to ${money(p.cap, 0)})</label><input id="fBorrow" type="number" min="0" max="${p.cap}" inputmode="numeric" value="${mine && mine.borrow != null ? mine.borrow : ''}"></div>` : ''}
        <button class="btn primary" id="fSend">Submit</button></div>
        <div class="actions"><button class="btn secondary" data-sell="0">Sell none</button><button class="btn secondary" data-sell="${Math.min(p.units, needU)}">Sell enough to pay (${Math.min(p.units, needU)} at today's price)</button><button class="btn secondary" data-sell="${Math.min(p.units, needU + 20)}">Sell 20 more than that</button></div>
        <p class="msg good" id="receipt">${mine ? `You are selling ${mine.sell} units${mine.borrow ? ` and borrowing ${money(mine.borrow, 0)}` : ''}. You can change it until the step ends.` : ''}</p>`;
    }
    if (S.phase === 'closed') return '<h2>The crisis is over</h2>' + sheet(p, s);
    return `<h2>${p.dead ? '✖ Your bank failed' : '✔ Your bank survived'}</h2><div class="bigpay">${money(p.eq, 2)}</div><p class="sub">equity at the final price of ${cents(p.price)} (started at ${money(p.eq0, 0)}). You sold ${p.sold} units${p.forcedSold ? ` and ${p.forcedSold} more were sold for you at a discount` : ''}.</p>
      ${s.impact ? `<p class="note">With the same choices and no price impact: equity ${money(p.eqFlat, 2)}${p.deadFlat ? ', failed' : ''}.</p>` : ''}`;
  }
  function wireStudent(root, ctx) {
    const send = sell => {
      const d = { sell: Math.max(0, Math.round(Number(sell))) }, pr = root.querySelector('#fPred'), bo = root.querySelector('#fBorrow');
      if (pr) { if (pr.value === '') return ctx.say('Enter your price prediction first.'); d.predict = Math.max(0, Math.min(100, Math.round(Number(pr.value)))); }
      if (bo && bo.value !== '') d.borrow = Math.max(0, Math.round(Number(bo.value)));
      ctx.submit(d);
    };
    root.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => send(b.dataset.sell));
    const b = root.querySelector('#fSend'); if (b) b.onclick = () => { const v = root.querySelector('#fSell').value; if (v === '') return ctx.say('Enter how many units to sell (0 is fine).'); send(v); };
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>Step ${S.step} · ${S.nMoved} of ${S.nPlayers} decided</strong>No answer = sell nothing (a shortfall is then sold at the forced-sale discount).</div>` : ''; }
  /* Simulated banks: most sell what withdrawals need; some sell extra early, more so after the price falls. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || p.failed || st.me.moves[String(st.step)]) return null;
    const s = clean(st.settings), u = rand(), need = Math.max(0, Math.ceil((p.w - p.cash) / p.price));
    let sell = u < 0.55 ? need : u < 0.85 ? need + 10 + Math.floor(rand() * 15) : 0;
    const d = { sell: Math.min(p.units, sell) };
    if (s.lolr && rand() < 0.7) { d.borrow = Math.min(p.cap, Math.max(0, Math.ceil(p.w - p.cash))); d.sell = rand() < 0.7 ? 0 : Math.min(p.units, 5); }
    if (st.step === 1) d.predict = Math.floor(70 + rand() * 30);
    return { submit: d };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id];
      return { round: h.roundNo, label: h.label, impact: h.settings.impact, lolr: h.settings.lolr ? 1 : 0, display_name: p.name,
        choices: d.moves.filter(m => m.player === p.id).map(m => `${m.step}:${m.data.sell}${m.data.borrow ? '+' + m.data.borrow : ''}`).join(' '),
        predict: (d.moves.find(m => m.player === p.id && m.step === 1) || { data: {} }).data.predict ?? '', sold: x.sold ?? '', forced: x.forcedSold ?? '', equity: x.eq != null ? x.eq.toFixed(2) : '', failed: x.dead ? 1 : 0, equity_no_impact: x.eqFlat != null ? x.eqFlat.toFixed(2) : '' }; });
  }
  const game = { id: 'firesale', title: 'Fire Sale', tagline: 'Every bank holds the same asset. When one sells, everyone\'s balance sheet gets marked down.',
    fields, presets, buildSettings, rules, steps, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    openLabel: 'Open step 1', stepLabel: S => `End step ${S.step}; sell and reprice`, closeLabel: S => S.step >= steps(S.settings) ? 'End the last step' : 'End the crisis now', model: { simulate, shocks } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
