/* Bond Showdown on the shared classroom toolkit. Rules: README.md.
   Investor round: split $100,000 among cash, a 2-year bond, and a 10-year bond, and predict how
   each bond's price moves if rates rise one point; every portfolio is then repriced under both a
   rise and a fall. Bank round: a bank with $100 of deposits and $10 of equity chooses the same
   split; if rates rise two points, depositors withdraw and bonds may have to be sold at a loss. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, pct } = ui;
  /* Annual-coupon bond price per $100 of face value. */
  const price = (coupon, y, n) => { let p = 0; for (let t = 1; t <= n; t++) p += coupon / Math.pow(1 + y / 100, t); return p + 100 / Math.pow(1 + y / 100, n); };
  const BONDS = { short: { label: '2-year bond', coupon: 4.0, n: 2 }, long: { label: '10-year bond', coupon: 4.5, n: 10 } };
  const CASH_YIELD = 3.0, DEPOSIT_RATE = 2.5;
  const moveOf = (b, dy) => price(b.coupon, b.coupon + dy, b.n) / 100 - 1;   // bonds start at par
  const BUCKETS = [['upbig', 'Rises more than 5%'], ['up', 'Rises 0–5%'], ['flat', 'About unchanged'], ['down', 'Falls 0–5%'], ['downbig', 'Falls more than 5%']];
  const bucketOf = x => x > 0.05 ? 'upbig' : x > 0.0025 ? 'up' : x >= -0.0025 ? 'flat' : x >= -0.05 ? 'down' : 'downbig';

  const fields = [
    { id: 'mode', label: 'Round', type: 'select', options: [['investor', 'Investor'], ['bank', 'Bank']] },
    { id: 'shock', label: 'What rates do', type: 'select', options: [['draw', 'Draw at the reveal (50/50)'], ['rise', 'Rise'], ['other', 'Fall (investor) or hold (bank)']] },
    { id: 'size', label: 'Size of the move (points)', type: 'number', min: 0.25, max: 5, step: 0.25 },
    { id: 'withdraw', label: 'Bank: deposits withdrawn if rates rise (%)', type: 'number', min: 0, max: 100 }
  ];
  const presets = [
    { id: 'investor', label: 'Investor: rates move one point', note: 'Split $100,000; predict the price moves; every portfolio is shown under a rise and a fall.', values: { mode: 'investor', shock: 'draw', size: 1, withdraw: 30 } },
    { id: 'bank', label: 'Bank: reach for yield?', note: 'You run a bank: $100 of deposits, $10 of equity. Long bonds pay more. Rates may rise two points, and then 30% of deposits leave.', values: { mode: 'bank', shock: 'draw', size: 2, withdraw: 30 } }
  ];
  const clean = v => (v = v || {}, { mode: v.mode === 'bank' ? 'bank' : 'investor', shock: ['draw', 'rise', 'other'].includes(v.shock) ? v.shock : 'draw', size: Math.max(0.25, Math.min(5, Number(v.size) || 1)), withdraw: Math.max(0, Math.min(100, Number(v.withdraw) || 0)) });
  function buildSettings(v) {
    const s = clean(v), pc = { type: 'int', min: 0, max: 100 };
    const f = { cash: Object.assign({ label: 'Cash' }, pc), short: Object.assign({ label: 'The 2-year bond' }, pc), long: Object.assign({ label: 'The 10-year bond' }, pc) };
    const req = ['cash', 'short', 'long'];
    if (s.mode === 'investor') { f.p2 = { type: 'choice', label: 'Your 2-year prediction', in: BUCKETS.map(b => b[0]) }; f.p10 = { type: 'choice', label: 'Your 10-year prediction', in: BUCKETS.map(b => b[0]) }; req.push('p2', 'p10'); }
    s.input = { '*': { required: req, sum: { fields: ['cash', 'short', 'long'], equals: 100, label: 'Your three shares' }, fields: f } };
    return s;
  }

  /* ---------- the model ---------- */
  function investor(w, dy) { return (w.short * moveOf(BONDS.short, dy) + w.long * moveOf(BONDS.long, dy)) / 100; }
  /* A bank with $100 deposits and $10 equity: assets $110 split by w (percent). */
  function bank(w, s, rise) {
    const A = { cash: 1.1 * w.cash, short: 1.1 * w.short, long: 1.1 * w.long };
    if (!rise) {   // a quiet year: interest earned less interest paid
      const profit = A.cash * CASH_YIELD / 100 + A.short * BONDS.short.coupon / 100 + A.long * BONDS.long.coupon / 100 - 100 * DEPOSIT_RATE / 100;
      return { failed: false, market: 10 + profit, book: 10 + profit, realized: 0, unrealized: 0, sold: 0 };
    }
    const ps = 1 + moveOf(BONDS.short, s.size), pl = 1 + moveOf(BONDS.long, s.size);
    let need = s.withdraw, realized = 0, sold = 0;
    const take = (k, px) => { const mv = A[k] * px, use = Math.min(need, mv); if (use <= 0) return; const face = use / px; A[k] -= face; need -= use; realized += face * (1 - px); sold += use; };
    take('cash', 1); take('short', ps); take('long', pl);
    const deposits = 100 - (s.withdraw - need), market = A.cash + A.short * ps + A.long * pl - deposits;
    const book = A.cash + A.short + A.long - deposits;   // bonds still held at cost, as in held-to-maturity accounting
    return { failed: need > 1e-9 || market < 0, market, book, realized, unrealized: A.short * (1 - ps) + A.long * (1 - pl), sold, unpaid: need };
  }

  function resolve({ S, settings, data }) {
    const s = clean(settings), last = {}; for (const m of data.moves) last[m.player] = m.data;
    const ids = data.players.filter(p => p.eligibleFrom <= S.roundNo).map(p => p.id).filter(id => last[id]);
    const seed = ui.hash(S.code + ':' + S.roundNo + ':' + Date.now());
    const rise = s.shock === 'rise' ? true : s.shock === 'other' ? false : ui.rng(seed)() < 0.5;
    const priv = {}, rows = [];
    for (const id of ids) {
      const w = last[id];
      if (s.mode === 'investor') {
        const up = investor(w, s.size), down = investor(w, -s.size);
        priv[id] = { up, down, got: rise ? up : down, right2: w.p2 === bucketOf(moveOf(BONDS.short, s.size)), right10: w.p10 === bucketOf(moveOf(BONDS.long, s.size)) };
        rows.push({ long: w.long, up, down, r2: priv[id].right2, r10: priv[id].right10 });
      } else {
        const a = bank(w, s, true), b = bank(w, s, false);
        priv[id] = { rise: a, hold: b, got: rise ? a : b };
        rows.push({ long: w.long, a, b });
      }
    }
    const groups = [[0, 20], [21, 40], [41, 60], [61, 80], [81, 100]].map(([lo, hi]) => {
      const g = rows.filter(r => r.long >= lo && r.long <= hi);
      return s.mode === 'investor'
        ? { lo, hi, n: g.length, up: ui.mean(g.map(r => r.up)), down: ui.mean(g.map(r => r.down)) }
        : { lo, hi, n: g.length, failRise: g.length ? g.filter(r => r.a.failed).length / g.length : null, eqRise: ui.mean(g.map(r => r.a.market)), eqHold: ui.mean(g.map(r => r.b.market)) };
    });
    const res = { mode: s.mode, rise, size: s.size, n: rows.length, groups, avgLong: ui.mean(rows.map(r => r.long)),
      moves: { short: [moveOf(BONDS.short, s.size), moveOf(BONDS.short, -s.size)], long: [moveOf(BONDS.long, s.size), moveOf(BONDS.long, -s.size)] } };
    if (s.mode === 'investor') Object.assign(res, { right2: rows.length ? rows.filter(r => r.r2).length / rows.length : null, right10: rows.length ? rows.filter(r => r.r10).length / rows.length : null, avg: ui.mean(rows.map(r => rise ? r.up : r.down)) });
    else Object.assign(res, { failedRise: rows.filter(r => r.a.failed).length, realized: ui.sum(rows.map(r => r.a.realized)), unrealized: ui.sum(rows.map(r => r.a.unrealized)), bookOkMarketBad: rows.filter(r => r.a.book >= 0 && r.a.market < 0).length });
    return { result: res, private: priv };
  }

  /* ---------- screens ---------- */
  const signed = x => (x >= 0 ? '+' : '−') + (Math.abs(x) * 100).toFixed(1) + '%';
  function rules(s) {
    s = clean(s);
    const bondLine = `The <b>2-year bond</b> pays ${BONDS.short.coupon}% and the <b>10-year bond</b> ${BONDS.long.coupon}% a year; both sell at face value today.`;
    if (s.mode === 'investor') return `<ul class="rules"><li>Split <b>$100,000</b> among cash, the 2-year bond, and the 10-year bond (whole percents that add to 100).</li><li>${bondLine}</li><li>Then rates on both bonds move <b>${s.size} point${s.size === 1 ? '' : 's'}</b>, up or down${s.shock === 'draw' ? ', 50/50' : ''}, and your bonds are repriced at once.</li><li>First, predict how each bond's price moves if rates <b>rise</b> ${s.size} point. Predictions are scored separately.</li></ul>`;
    return `<ul class="rules"><li>You run a bank: <b>$100 of deposits</b> (you pay ${DEPOSIT_RATE}%) and <b>$10 of equity</b>, so $110 to invest.</li><li>Split it among cash (earns ${CASH_YIELD}%), the 2-year bond, and the 10-year bond. ${bondLine}</li>
      <li>If rates hold, you earn a year's interest. If rates <b>rise ${s.size} points</b>${s.shock === 'draw' ? ' (50/50)' : ''}, bond prices fall and <b>${s.withdraw}% of deposits are withdrawn</b>: you pay from cash, then sell 2-year bonds, then 10-year bonds, at today's prices.</li>
      <li>If, at today's prices, your assets are worth less than the deposits you still owe, the rest of your depositors run: <b>your bank fails</b>.</li></ul>`;
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions' || S.phase === 'open' || S.phase === 'closed')
      return `${head}<h2>${s.mode === 'investor' ? 'Build a bond portfolio' : 'Run a bank'}</h2><div class="split"><div>${rules(s)}</div><div>${S.phase === 'open' ? `<div class="banner warn"><strong style="font-size:1.3em">${S.nMoved} of ${S.nPlayers} in</strong>Choose on your phone.</div>` : ''}${ctx.joinLine()}</div></div>`;
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result, m = r.moves;
    if (r.mode === 'investor') {
      return `${head}<div class="split"><div><div class="label">Rates ${r.rise ? 'rose' : 'fell'} ${r.size} point${r.size === 1 ? '' : 's'}</div><div class="lead">${signed(r.avg)}</div><p class="sub">the class's average return. Average share in the 10-year bond: ${Math.round(r.avgLong)}%.</p>
        ${ui.table(['', `If rates rise ${r.size}`, `If rates fall ${r.size}`], [['2-year bond', signed(m.short[0]), signed(m.short[1])], ['10-year bond', `<b>${signed(m.long[0])}</b>`, `<b>${signed(m.long[1])}</b>`]])}
        ${ui.tiles([['Predicted the 2-year right', pct(r.right2)], ['Predicted the 10-year right', pct(r.right10)]], 'two')}</div>
        <div><h3 style="margin-top:0">The same portfolios in two worlds</h3>${ui.table(['10-year share', 'Students', 'Return if rates rise', 'Return if rates fall'], r.groups.filter(g => g.n).map(g => [`${g.lo}–${g.hi}%`, g.n, signed(g.up), signed(g.down)]))}
        <p class="note">Longer bonds swing more both ways: that is duration. Luck chose the world; the portfolio chose how much it mattered.</p></div></div>`;
    }
    return `${head}<div class="split"><div><div class="label">${r.rise ? `Rates rose ${r.size} points and deposits left` : 'Rates held: a quiet year'}</div><div class="lead">${r.rise ? `${r.failedRise} of ${r.n} banks failed` : 'No bank failed'}</div>
      ${r.rise ? `<p class="sub">${r.bookOkMarketBad} of them still looked solvent at cost, the way held-to-maturity bonds are carried. That was SVB.</p>` : `<p class="sub">Had rates risen, ${r.failedRise} of ${r.n} would have failed.</p>`}
      ${ui.tiles([['Losses realized by selling bonds', '$' + r.realized.toFixed(0)], ['Losses on bonds still held', '$' + r.unrealized.toFixed(0)]], 'two')}
      <p class="note">10-year bond: ${signed(m.long[0])} if rates rise ${r.size} points; 2-year bond ${signed(m.short[0])}.</p></div>
      <div><h3 style="margin-top:0">Reaching for yield</h3>${ui.table(['10-year share', 'Banks', 'Failed if rates rise', 'Equity if rates rise', 'Equity if rates hold'], r.groups.filter(g => g.n).map(g => [`${g.lo}–${g.hi}%`, g.n, pct(g.failRise), ui.money(g.eqRise, 2), ui.money(g.eqHold, 2)]))}
      <p class="note">Equity is at today's prices, starting from $10.</p></div></div>`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), mine = me.moves['1'];
    if (S.phase === 'instructions') return '<h2>Get ready</h2><p class="sub">Read the rules. You will split your money three ways.</p>';
    if (S.phase === 'open') {
      const v = k => mine ? mine[k] : { cash: 34, short: 33, long: 33 }[k];
      const sel = (id, cur) => `<select id="${id}">${BUCKETS.map(b => `<option value="${b[0]}" ${cur === b[0] ? 'selected' : ''}>${b[1]}</option>`).join('')}</select>`;
      return `<h2>${s.mode === 'investor' ? 'Your $100,000' : 'Your bank\'s $110'}</h2>
        ${s.mode === 'investor' ? `<h3>If rates rise ${s.size} point, how does each price move?</h3><div class="row"><div class="field"><label for="bP2">2-year bond</label>${sel('bP2', mine && mine.p2 || 'flat')}</div><div class="field"><label for="bP10">10-year bond</label>${sel('bP10', mine && mine.p10 || 'flat')}</div></div><h3>Split it (percent)</h3>` : '<h3>Split it (percent of $110)</h3>'}
        <div class="row"><div class="field"><label for="bCash">Cash</label><input id="bCash" type="number" min="0" max="100" value="${v('cash')}"></div><div class="field"><label for="bShort">2-year</label><input id="bShort" type="number" min="0" max="100" value="${v('short')}"></div><div class="field"><label for="bLong">10-year</label><input id="bLong" type="number" min="0" max="100" value="${v('long')}"></div></div>
        <div class="actions"><button class="btn primary" id="bSend">Submit</button></div><p class="msg good" id="receipt">${mine ? `In: ${mine.cash}% cash, ${mine.short}% 2-year, ${mine.long}% 10-year. You can change it until the round closes.` : ''}</p>`;
    }
    if (S.phase === 'closed') return '<h2>Choices are in</h2><p class="sub">Waiting for rates to move.</p>';
    const p = me.priv[S.roundNo]; if (!p) return '<h2>You did not choose this round.</h2>';
    const h = S.history.find(x => x.roundNo === S.roundNo), r = h && h.result;
    if (r.mode === 'investor') return `<h2>Rates ${r.rise ? 'rose' : 'fell'}</h2><div class="bigpay">${signed(p.got)}</div><p class="sub">on your $100,000 (${ui.whole(100000 * p.got)}). In the other world you would have made ${signed(r.rise ? p.down : p.up)}.</p><p class="note">Predictions: 2-year ${p.right2 ? '✔' : '✖'}, 10-year ${p.right10 ? '✔' : '✖'}.</p>`;
    const g = p.got;
    return `<h2>${g.failed ? '✖ Your bank failed' : '✔ Your bank survived'}</h2><div class="bigpay">${ui.money(g.market, 2)}</div><p class="sub">equity at today's prices (started at $10).${r.rise ? ` Realized losses $${g.realized.toFixed(2)}; losses on bonds you still hold $${g.unrealized.toFixed(2)}.` : ''}</p><p class="note">If rates had ${r.rise ? 'held' : 'risen'}: ${r.rise ? `equity $${p.hold.market.toFixed(2)}` : (p.rise.failed ? 'you would have failed' : `equity $${p.rise.market.toFixed(2)}`)}.</p>`;
  }
  function wireStudent(root, ctx) {
    const b = root.querySelector('#bSend'); if (!b) return;
    b.onclick = () => {
      const n = id => Math.round(Number(root.querySelector(id).value) || 0), d = { cash: n('#bCash'), short: n('#bShort'), long: n('#bLong') };
      if (d.cash + d.short + d.long !== 100) return ctx.say(`Your shares add to ${d.cash + d.short + d.long}%, not 100%.`);
      if (root.querySelector('#bP2')) { d.p2 = root.querySelector('#bP2').value; d.p10 = root.querySelector('#bP10').value; }
      ctx.submit(d);
    };
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>${S.nMoved} of ${S.nPlayers} in</strong>Close when most are in; then Reveal draws the rate move.</div>` : ''; }
  function sim(st, rand) {
    if (st.me.moves['1']) return null;
    const s = clean(st.settings), L = Math.floor(rand() * 101), Sh = Math.floor(rand() * (101 - L)), d = { cash: 100 - L - Sh, short: Sh, long: L };
    if (s.mode === 'investor') { d.p2 = rand() < 0.6 ? 'down' : BUCKETS[Math.floor(rand() * 5)][0]; d.p10 = rand() < 0.5 ? 'downbig' : BUCKETS[Math.floor(rand() * 5)][0]; }
    return { submit: d };
  }
  function exportRows(h, d) {
    return d.players.map(p => { const m = d.moves.find(x => x.player === p.id), x = d.private[p.id]; if (!m) return null;
      return { round: h.roundNo, label: h.label, mode: h.result.mode, rates: h.result.rise ? 'rise' : 'other', display_name: p.name, cash: m.data.cash, short: m.data.short, long: m.data.long, p2: m.data.p2 ?? '', p10: m.data.p10 ?? '',
        result: x ? (h.result.mode === 'investor' ? (x.got * 100).toFixed(2) + '%' : x.got.failed ? 'failed' : x.got.market.toFixed(2)) : '' }; }).filter(Boolean);
  }
  const game = { id: 'bonds', title: 'Bond Showdown', tagline: 'Split your money between cash, short bonds, and long bonds. Then rates move.',
    fields, presets, buildSettings, rules, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    openLabel: 'Open choices', closeLabel: () => 'Close choices', model: { price, moveOf, investor, bank, BONDS } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
