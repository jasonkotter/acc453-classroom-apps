/* Inflation Auction on the shared classroom toolkit. Rules: SPEC.md. Model: model.js. */
(function () {
  'use strict';
  const A = window.AuctionModel, ui = window.Classroom.ui, { esc, money, whole, pct } = ui;

  const fields = [
    { id: 'base', label: 'Smallest budget ($)', type: 'number', min: 1, max: 100 },
    { id: 'moneyMult', label: 'Money multiplier (× each budget)', type: 'select', options: [['1', '1× (baseline)'], ['2', '2× (double)'], ['3', '3× (triple)']] },
    { id: 'cansPct', label: 'Cans (% of bidders)', type: 'number', min: 1, max: 100 },
    { id: 'predict', label: 'Ask for a price prediction first', type: 'checkbox' }
  ];
  const presets = [
    { id: 'base', label: 'Baseline', note: 'Budgets from $2 up, cans for 10% of the class. Played cold: no prediction.', values: { base: 2, moneyMult: '1', cansPct: 10, predict: false } },
    { id: 'money', label: 'Double the money', note: 'Every budget doubles; the same share of cans. Students predict the price first.', values: { base: 2, moneyMult: '2', cansPct: 10, predict: true } },
    { id: 'both', label: 'Double the cans too', note: 'Budgets stay doubled and the cans double as well: money and output grow together.', values: { base: 2, moneyMult: '2', cansPct: 20, predict: true } },
    { id: 'goods', label: 'More cans, baseline money (optional)', note: 'Back to baseline budgets with twice the cans: output grows, money does not.', values: { base: 2, moneyMult: '1', cansPct: 20, predict: true } }
  ];

  function buildSettings(v) {
    const s = A.clean(v);
    s.input = { '*': { fields: {
      bid: { type: 'int', label: 'Your bid', min: 1, maxPriv: 'cash', optional: true },
      predict: s.predict ? { type: 'int', label: 'Your prediction', min: 0, max: 100000, optional: true } : undefined
    } } };
    if (!s.predict) delete s.input['*'].fields.predict;
    return s;
  }

  function rules(s, S) {
    s = A.clean(s);
    const out = [
      `Money falls from the sky: each of you gets a private cash budget${s.moneyMult > 1 ? `, ${s.moneyMult} times what you had in the baseline` : ''}. A few of you get a lot and most get a little, from ${money(s.base * s.moneyMult)} up. No one can earn more.`,
      'There is one good, a can of Diet Coke, and cans go to about ' + s.cansPct + '% of the class.',
      'Cash is good only for buying a can. <b>Any cash you do not spend is worth nothing</b> when the round ends.',
      'Bid a whole number of dollars, at least $1 and no more than your cash. No loans, no credit.',
      'Bids are sealed: no one sees them until the reveal. You can change yours until bidding closes.',
      '<b>The highest bids win.</b> Every winner pays the same market price: the highest bid that did not win. A tie at the cutoff is broken by a random order drawn when the round opens.',
      'No bid means no can, and you keep cash that is worth nothing.'
    ];
    if (s.predict) out.unshift('<b>First, predict the market price</b> for this round.');
    return '<ul class="rules">' + out.map(x => `<li>${x}</li>`).join('') + '</ul>';
  }

  /* ---------- instructor side ---------- */
  function assign({ S, settings, roster, seed }) {
    const s = A.clean(settings), priv = {}, b = A.budgets(roster.map(p => p.id), S.code, s.base, s.moneyMult);
    let M = 0;
    for (const p of roster) { priv[p.id] = { cash: b[p.id] }; M += b[p.id]; }
    return { private: priv, pub: { cans: A.cansFor(roster.length, s.cansPct), M, n: roster.length, seed } };
  }
  function resolve({ S, settings, data }) {
    const s = A.clean(settings), pub = S.pub, last = {};
    for (const m of data.moves) if (m.step === 1) last[m.player] = m.data;
    const ids = Object.keys(data.private);
    const bids = ids.map(id => ({ id, bid: last[id] && Number.isInteger(last[id].bid) ? last[id].bid : null, prio: A.hash(pub.seed + ':' + id) }));
    const c = A.clear(bids, pub.cans);
    const priv = {};
    for (const b of bids) priv[b.id] = { won: c.winners.has(b.id), paid: c.winners.has(b.id) ? c.price : 0, bid: b.bid };
    const live = bids.filter(b => b.bid != null), max = Math.max(1, ...live.map(b => b.bid));
    const w = Math.max(1, Math.ceil(max / 14)), hist = [];
    for (let lo = 1; lo <= max; lo += w) hist.push({ lo, hi: lo + w - 1, won: 0, lost: 0 });
    for (const b of live) { const k = hist[Math.floor((b.bid - 1) / w)]; if (c.winners.has(b.id)) k.won++; else k.lost++; }
    const preds = ids.map(id => last[id] && last[id].predict).filter(x => Number.isFinite(x));
    const spend = c.price != null ? c.price * c.sold : 0;
    const cashes = ids.map(id => data.private[id].cash);
    return {
      private: priv,
      result: { n: ids.length, cans: pub.cans, sold: c.sold, price: c.price, nBids: c.nBids, M: pub.M, spend, V: pub.M ? spend / pub.M : null,
        hist, cutoffBid: c.cutoffBid, cashMedian: ui.median(cashes),
        pred: preds.length ? { n: preds.length, median: ui.median(preds), mean: ui.mean(preds), close: c.price ? preds.filter(x => Math.abs(x - c.price) <= Math.max(1, 0.2 * c.price)).length : 0 } : null }
    };
  }

  /* ---------- shared pieces ---------- */
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.price != null);
    if (!done.length) return '';
    const p0 = done[0].result.price;
    return `<h3>Round comparison: M × V = P × Y</h3>` + ui.table(
      ['Round', 'Money in the room (M)', 'Cans sold (Y)', 'Price (P)', 'Spending (P × Y)', 'Spent ÷ money (V)', 'Price vs round 1'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, whole(r.M), r.sold, `<b>${money(r.price)}</b>`, whole(r.spend), r.V != null ? r.V.toFixed(2) : '—', p0 ? (r.price / p0).toFixed(2) + '×' : '—']; }));
  }
  function histogram(r) {
    const bins = r.hist.map(b => ({ label: b.lo === b.hi ? '$' + b.lo : `$${b.lo}–${b.hi}`, mark: r.price >= b.lo && r.price <= b.hi ? '▲ price' : '',
      parts: [{ n: b.won, color: 'var(--teal)', title: `${b.won} winning bids` }, { n: b.lost, color: '#b7c6c2', title: `${b.lost} bids that did not win` }] }));
    return ui.bars(bins, { aria: `Bids by amount. ${r.sold} winning bids; the market price was ${money(r.price)}.` }) +
      `<div class="legend"><span><i class="sw" style="background:var(--teal)"></i>Won a can</span><span><i class="sw" style="background:#b7c6c2"></i>Did not win</span><span>Bar height: number of bids</span></div>`;
  }

  /* ---------- projector ---------- */
  function renderProjector(S, ctx) {
    const s = A.clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions')
      return `${head}<h2>One can, many bidders: what will it sell for?</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S) || '<p class="sub">Results from each round will collect here for comparison.</p>'}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed')
      return `${head}<h2>${S.phase === 'open' ? 'Bidding is open' : 'Bidding is closed'}</h2>
        ${ui.tiles([['Bids in', `${S.nMoved} of ${S.nPlayers}`, 'hi'], ['Cans for sale (Y)', S.pub.cans], ['Money in the room (M)', whole(S.pub.M)], ['Bidders', S.pub.n]])}
        <div class="banner ${S.phase === 'open' ? 'warn' : ''}"><strong style="font-size:1.3em">${S.phase === 'open' ? (s.predict ? 'Predict the price, then bid on your phone.' : 'Bid on your phone.') : 'Results in a moment.'}</strong>Bids are sealed. Every winner pays the highest losing bid.</div>
        ${ctx.joinLine()}${comparison(S)}`;
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head + '<p>Waiting for results.</p>';
    const r = h.result;
    const pred = r.pred ? `<p class="sub">The class predicted ${money(r.pred.median)} (median of ${r.pred.n}); ${r.pred.close} came within 20%.</p>` : '';
    return `${head}<div class="split"><div>
        <div class="label">The market price</div><div class="lead">${r.price != null ? money(r.price) : 'No sale'}</div>${pred}
        ${ui.tiles([['Cans sold (Y)', `${r.sold} of ${r.cans}`], ['Money in the room (M)', whole(r.M)], ['Spending (P × Y)', whole(r.spend)], ['Bids', `${r.nBids} of ${r.n}`]])}
        <p class="note">Half the class started with ${money(r.cashMedian)} or less. Unspent cash, ${whole(r.M - r.spend)}, is now worth nothing.</p>
      </div><div><h3 style="margin-top:0">Every bid</h3>${histogram(r)}</div></div>${comparison(S)}`;
  }

  /* ---------- student ---------- */
  function renderStudent(S, me, ctx) {
    const s = A.clean(S.settings), rn = S.roundNo, priv = me.priv[rn] || {}, mv = me.moves['1'];
    if (S.phase === 'instructions') return `<h2>Get ready</h2><p class="sub">Read the rules. Your cash appears when bidding opens.</p>`;
    if (S.phase === 'open') {
      const got = mv ? (mv.bid != null ? `Your bid of <b>${money(mv.bid)}</b> is in.` : 'You chose <b>no bid</b>.') + (mv.predict != null ? ` Your prediction: ${money(mv.predict)}.` : '') + ' You can change it until bidding closes.' : '';
      return `<h2>Place your sealed bid</h2>
        <div class="banner"><strong>Your cash this round</strong><span class="bigpay">${money(priv.cash)}</span><span class="note">${S.pub.cans} cans for ${S.pub.n} bidders. Cash you do not spend is worth nothing after the round.</span></div>
        ${s.predict ? `<div class="field" style="margin:12px 0"><label for="predictInput">Your prediction: what will the market price be?</label><input id="predictInput" type="number" min="0" step="1" inputmode="numeric" placeholder="$" value="${mv && mv.predict != null ? mv.predict : ''}"></div>` : ''}
        <div class="field"><label for="bidInput">Your bid (whole dollars, $1 to ${money(priv.cash)})</label><input id="bidInput" type="number" min="1" max="${priv.cash}" step="1" inputmode="numeric" value="${mv && mv.bid != null ? mv.bid : ''}"></div>
        <div class="actions"><button class="btn primary" id="bidBtn">Submit bid</button><button class="btn secondary" id="noBidBtn">No bid</button></div>
        <p class="msg good" id="receipt">${got}</p>`;
    }
    if (S.phase === 'closed') return `<h2>Bidding is closed</h2><div class="banner"><strong>${mv && mv.bid != null ? 'Your bid: ' + money(mv.bid) : 'You did not bid'}</strong>Waiting for the instructor to reveal the results.</div>`;
    const h = S.history.find(x => x.roundNo === rn); if (!h) return '<p>Waiting for results.</p>';
    const r = h.result;
    return `<h2>Your result</h2><div class="bigpay">${priv.won ? 'You won a can' : 'No can this round'}</div>
      <p class="sub">${priv.won ? `You bid ${money(priv.bid)} and paid the market price, <b>${money(r.price)}</b>. The rest of your cash is now worth nothing.` : priv.bid != null ? `You bid ${money(priv.bid)}; the winning bids were ${money(r.cutoffBid)} or more.` : 'You did not bid.'}</p>
      ${ui.table(['', ''], [['Market price', `<b>${money(r.price)}</b>`], ['Your cash', money(priv.cash)], ...(mv && mv.predict != null ? [['Your prediction', money(mv.predict)]] : []), ['Cans sold', `${r.sold} to ${r.n} students`]])}`;
  }
  function wireStudent(root, ctx) {
    const bid = root.querySelector('#bidBtn'); if (!bid) return;
    const read = () => { const p = root.querySelector('#predictInput'); const v = p && p.value.trim() !== '' ? Math.round(Number(p.value)) : null; return v; };
    bid.onclick = () => {
      const v = root.querySelector('#bidInput').value.trim();
      if (v === '') return ctx.say('Enter a bid, or tap No bid.');
      const data = { bid: Number(v) }; const p = read(); if (root.querySelector('#predictInput')) data.predict = p;
      ctx.submit(data);
    };
    root.querySelector('#noBidBtn').onclick = () => { const data = { bid: null }; if (root.querySelector('#predictInput')) data.predict = read(); ctx.submit(data); };
  }

  function renderInstructor(S) {
    const h = S.history.find(x => x.roundNo === S.roundNo);
    if (h && (S.phase === 'revealed' || S.phase === 'debrief')) return `<div class="banner"><strong>Price ${money(h.result.price)} · ${h.result.sold} cans</strong>M ${whole(h.result.M)} · spending ${whole(h.result.spend)}</div>`;
    if (S.phase === 'open') return `<div class="banner"><strong>${S.nMoved} of ${S.nPlayers} bids in</strong>${S.pub.cans} cans · M ${whole(S.pub.M)}</div>`;
    return '';
  }

  /* Simulated students bid most of their cash (it is worthless otherwise) and predict from the last round. */
  function sim(st, rand) {
    const rn = st.roundNo, priv = st.me.priv[rn]; if (!priv || st.me.moves['1']) return null;
    const s = A.clean(st.settings), data = {};
    if (rand() < 0.07) data.bid = null; else data.bid = Math.max(1, Math.min(priv.cash, Math.round(priv.cash * (0.8 + 0.2 * rand()))));
    if (s.predict) { const last = st.history[st.history.length - 1]; const g = last && last.result.price ? last.result.price * s.moneyMult / A.clean(last.settings).moneyMult * A.clean(last.settings).cansPct / s.cansPct : priv.cash; data.predict = Math.max(1, Math.round(g * (0.6 + 0.8 * rand()))); }
    return { submit: data };
  }

  function exportRows(h, d) {
    const r = h.result, last = {};
    for (const m of d.moves) last[m.player] = m.data;
    return d.players.filter(p => d.private[p.id]).map(p => ({ round: h.roundNo, label: h.label, money_mult: h.settings.moneyMult, cans: r.cans, price: r.price, money_in_room: r.M, display_name: p.name, cash: d.private[p.id].cash, bid: last[p.id] ? last[p.id].bid ?? '' : '', prediction: last[p.id] ? last[p.id].predict ?? '' : '', won: !!d.private[p.id].won, paid: d.private[p.id].paid || 0 }));
  }

  const game = {
    id: 'auction', title: 'Inflation Auction', tagline: 'One good. Limited supply. Sealed bids. See what happens to the price when the money changes, and when the goods do.',
    fields, presets, buildSettings, rules, assign, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    openLabel: 'Open bidding', closeLabel: () => 'Close bidding'
  };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
