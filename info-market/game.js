/* Information Market on the shared classroom toolkit. Rules: README.md.
   A borrower will either repay (a claim pays $100) or default (it pays $0), equally likely.
   Students get private, noisy clues, start with $100 of cash and one claim, and trade in a call
   market: each submits one order to buy or sell one claim at a limit price, and every trade
   happens at one clearing price. After the first market, a public signal arrives (a rating
   change) and the class trades again. The reveal shows the outcome, every clue, and what the
   pooled clues implied.
   The outcome is kept from the students' devices: it is drawn from the instructor's private
   session secret, so only the instructor's browser can compute the clues and the outcome. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, whole, pct } = ui;
  const CASH0 = 100, FACE = 100;

  const fields = [
    { id: 'share', label: 'Students who get a clue (%)', type: 'number', min: 0, max: 100 },
    { id: 'acc', label: 'Clue accuracy (%)', type: 'number', min: 50, max: 100 },
    { id: 'pub', label: 'Public signal before the second market', type: 'checkbox' },
    { id: 'pubAcc', label: 'Public signal accuracy (%)', type: 'number', min: 50, max: 100 }
  ];
  const presets = [
    { id: 'weak', label: 'Everyone gets a weak clue', note: 'Every student gets a clue that is right 65% of the time. Then a rating change (right 70% of the time) and a second market.', values: { share: 100, acc: 65, pub: true, pubAcc: 70 } },
    { id: 'insiders', label: 'A new borrower: a few insiders', note: 'A new borrower. Only 1 in 5 students gets a clue, but it is right 90% of the time. The rest know nothing. Same rating change and second market.', values: { share: 20, acc: 90, pub: true, pubAcc: 70 } },
    { id: 'none', label: 'A new borrower: no clues', note: 'No one has private information, only the rating change before the second market.', values: { share: 0, acc: 65, pub: true, pubAcc: 70 } }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { share: n(v.share, 100, 0, 100), acc: n(v.acc, 65, 50, 100), pub: v.pub !== false, pubAcc: n(v.pubAcc, 70, 50, 100) }; };
  function buildSettings(v) {
    const s = clean(v);
    s.input = { '*': { required: ['belief', 'side'], fields: { belief: { type: 'int', label: 'Your probability', min: 0, max: 100 }, side: { type: 'choice', in: ['buy', 'sell', 'none'] }, price: { type: 'int', label: 'Your price', min: 0, max: FACE, optional: true } } } };
    return s;
  }
  const steps = () => 2;
  function rules(s) {
    s = clean(s);
    return `<ul class="rules">
      <li>A borrower will either <b>repay</b> or <b>default</b>, equally likely. A <b>claim</b> pays $${FACE} if it repays and $0 if it defaults.</li>
      <li>You start with <b>$${CASH0} cash and one claim</b>. ${s.share >= 100 ? 'Each of you gets' : s.share > 0 ? `${s.share}% of you get` : 'No one gets'} a private <b>clue</b>${s.share > 0 ? ` that is right ${s.acc}% of the time` : ''}.</li>
      <li>Trade in two markets. In each, enter your probability that the borrower repays, then one order: <b>buy</b> one claim at up to a price, <b>sell</b> one at no less than a price, or sit out.</li>
      <li>Every trade happens at <b>one clearing price</b>: the price where the most trades can happen.${s.pub ? ` Before the second market, a rating change is announced (right ${s.pubAcc}% of the time).` : ''}</li>
      <li>At the end your claims pay off. Your score: cash + claims × payoff, compared with doing nothing.</li></ul>`;
  }

  /* ---------- the model ---------- */
  const hostSecret = () => { try { return (JSON.parse(localStorage.getItem('cls-host-infomarket')) || {}).hostSecret || 'local'; } catch { return 'local'; } };
  function world(S, ids, s) {
    const r = ui.rng(ui.hash(hostSecret() + ':' + S.code + ':' + S.roundNo + ':' + (S.pub.seed || 0)));
    const repay = r() < 0.5, clues = {};
    for (const id of ui.shuffle(ids, r)) clues[id] = r() * 100 < s.share ? ((r() * 100 < s.acc) === repay ? 'good' : 'bad') : null;
    const pubSig = s.pub ? ((r() * 100 < s.pubAcc) === repay ? 'up' : 'down') : null;
    return { repay, clues, pubSig };
  }
  /* Call market: the price that maximizes trades (midpoint of the best range), one claim each. */
  function clear(orders, rand) {
    const bids = orders.filter(o => o.side === 'buy'), asks = orders.filter(o => o.side === 'sell');
    let best = 0, lo = null, hi = null;
    for (let p = 0; p <= FACE; p++) {
      const q = Math.min(bids.filter(b => b.price >= p).length, asks.filter(a => a.price <= p).length);
      if (q > best) { best = q; lo = p; hi = p; } else if (q === best && q > 0) hi = p;
    }
    const bestBid = bids.length ? Math.max(...bids.map(b => b.price)) : null, bestAsk = asks.length ? Math.min(...asks.map(a => a.price)) : null;
    const quote = bestBid != null && bestAsk != null ? Math.round((bestBid + bestAsk) / 2) : bestAsk ?? bestBid;   // with no trade: where the book stood
    if (!best) return { price: null, q: 0, buyers: [], sellers: [], nBid: bids.length, nAsk: asks.length, bestBid, bestAsk, quote };
    const price = Math.round((lo + hi) / 2);
    const B = ui.shuffle(bids, rand).sort((a, b) => b.price - a.price).filter(b => b.price >= price).slice(0, best);
    const A = ui.shuffle(asks, rand).sort((a, b) => a.price - b.price).filter(a => a.price <= price).slice(0, best);
    return { price, q: best, buyers: B.map(b => b.id), sellers: A.map(a => a.id), nBid: bids.length, nAsk: asks.length, bestBid, bestAsk, quote: price };
  }
  function market(S, data, step, priv) {
    const orders = [];
    for (const m of data.moves) {
      if (m.step !== step || !priv[m.player]) continue;
      const d = m.data, h = priv[m.player], price = Number.isFinite(d.price) ? d.price : null;
      if (price == null || d.side === 'none') continue;
      if (d.side === 'buy' && h.cash >= price) orders.push({ id: m.player, side: 'buy', price });
      if (d.side === 'sell' && h.claims >= 1) orders.push({ id: m.player, side: 'sell', price });
    }
    const c = clear(orders, ui.rng(ui.hash(S.code + ':' + S.roundNo + ':' + step)));
    for (const id of c.buyers) { priv[id].cash -= c.price; priv[id].claims += 1; priv[id]['t' + step] = 'bought'; }
    for (const id of c.sellers) { priv[id].cash += c.price; priv[id].claims -= 1; priv[id]['t' + step] = 'sold'; }
    const beliefs = data.moves.filter(m => m.step === step && priv[m.player]).map(m => m.data.belief / 100);
    return { price: c.price, q: c.q, nBid: c.nBid, nAsk: c.nAsk, bestBid: c.bestBid, bestAsk: c.bestAsk, quote: c.quote, belief: ui.mean(beliefs), nIn: beliefs.length };
  }
  const pooled = (clues, s) => {   // what all the clues together imply, from a 50/50 start
    const v = Object.values(clues), g = v.filter(x => x === 'good').length, b = v.filter(x => x === 'bad').length;
    if (s.acc >= 100) return g ? 1 : b ? 0 : 0.5;
    return 1 / (1 + Math.pow((100 - s.acc) / s.acc, g - b));
  };

  function assign({ S, roster, settings, seed }) {
    const s = clean(settings), ids = roster.map(p => p.id), w = world(Object.assign({}, S, { pub: { seed } }), ids, s), priv = {};
    for (const id of ids) priv[id] = { cash: CASH0, claims: 1, clue: w.clues[id] };
    return { private: priv, pub: { seed, n: ids.length } };
  }
  function holdings(data) { const p = {}; for (const id in data.private) p[id] = { cash: data.private[id].cash, claims: data.private[id].claims }; return p; }
  function afterStep({ S, data, closedStep }) {
    const s = clean(S.settings), priv = holdings(data), m1 = market(S, data, closedStep, priv), w = world(S, Object.keys(data.private), s);
    for (const id in priv) priv[id].t1 = priv[id].t1 || 'none';
    return { private: priv, pub: { m1, pubSig: w.pubSig } };
  }
  function resolve({ S, data }) {
    const s = clean(S.settings), ids = Object.keys(data.private), w = world(S, ids, s), priv = holdings(data);
    const early = S.step < 2, m1 = early ? market(S, data, 1, priv) : S.pub.m1, m2 = early ? null : market(S, data, 2, priv);   // closed after market 1: clear it, skip market 2
    const pay = w.repay ? FACE : 0, out = {}, gains = [];
    for (const id of ids) {
      const value = priv[id].cash + priv[id].claims * pay, gain = value - (CASH0 + pay);
      out[id] = { cash: priv[id].cash, claims: priv[id].claims, value, gain, t1: priv[id].t1 || data.private[id].t1 || 'none', t2: priv[id].t2 || 'none' }; gains.push(gain);
    }
    const nClue = Object.values(w.clues).filter(Boolean).length, nRight = Object.values(w.clues).filter(c => c && (c === 'good') === w.repay).length;
    const traders = ids.filter(id => out[id].t1 !== 'none' || out[id].t2 !== 'none').length;
    return { private: out, pub: { m1, m2, pubSig: w.pubSig }, result: { repay: w.repay, m1, m2, pubSig: w.pubSig, n: ids.length, nClue, nRight, pooled: pooled(w.clues, s),
      nGood: Object.values(w.clues).filter(c => c === 'good').length, nBad: Object.values(w.clues).filter(c => c === 'bad').length, traders, bestGain: Math.max(...gains), worstGain: Math.min(...gains) } };
  }

  /* ---------- screens ---------- */
  /* A market's price; with no trade, where the orders stood (best offer to sell / best bid). */
  const dollars = m => !m ? '—' : m.price != null ? '$' + m.price : m.bestAsk != null && m.bestBid == null ? `no trade (sellers asked $${m.bestAsk}+)` : m.bestBid != null && m.bestAsk == null ? `no trade (buyers bid up to $${m.bestBid})` : m.quote != null ? `no trade (bid $${m.bestBid}, ask $${m.bestAsk})` : 'no orders';
  const level = (m, d) => m ? (m.price ?? m.quote ?? d) : d;
  const sigText = g => g === 'up' ? 'The rating agency <b>upgrades</b> the borrower.' : 'The rating agency <b>downgrades</b> the borrower.';
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.n);
    if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Clues', 'Market 1 price', 'Market 2 price', 'What the clues implied', 'Outcome'],
      done.map(h => { const r = h.result, s = clean(h.settings); return [`${h.roundNo}. ${esc(h.label)}`, r.nClue ? `${r.nClue}, right ${s.acc}%` : 'none', dollars(r.m1), dollars(r.m2), '$' + Math.round(r.pooled * 100), r.repay ? '<b>Repaid ($100)</b>' : '<b>Defaulted ($0)</b>']; }));
  }
  function marketLine(m, label) {
    if (!m) return '';
    return `<div class="banner"><strong>${label}: ${dollars(m)}</strong>${m.q} claim${m.q === 1 ? '' : 's'} traded · ${m.nBid} buy orders, ${m.nAsk} sell orders · average probability ${pct(m.belief)}</div>`;
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>What does a price know?</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    const m1 = S.pub.m1;
    if (S.phase === 'open' || S.phase === 'closed') {
      return `${head}<h2>${S.phase === 'closed' ? 'Trading is over' : S.pending ? 'Clearing the market…' : S.step === 1 ? 'Market 1: trade on what you know' : 'Market 2: trade again'}</h2>
        <div class="split"><div><div class="banner warn"><strong style="font-size:1.3em">${S.nMoved} of ${S.nPlayers} in</strong>Enter your probability and one order on your phone.</div>${ctx.joinLine()}</div>
        <div>${m1 ? marketLine(m1, 'Market 1 price') : `<p class="sub">A claim pays $${FACE} if the borrower repays. Before anyone knows anything, it is worth $50 on average.</p>`}${S.step === 2 && S.pub.pubSig ? `<div class="banner warn"><strong>News</strong>${sigText(S.pub.pubSig)}</div>` : ''}</div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    const p1 = level(r.m1, 50), pts = [[0, 50], [1, p1], [2, level(r.m2, p1)]];
    const chart = ui.lines([{ points: pts, color: 'var(--teal)', dots: true, label: 'Market price (or where orders stood)' }, { points: [[0, r.pooled * 100], [2, r.pooled * 100]], color: '#9d3c35', dash: true, label: 'What all the clues together implied' }, { points: [[0, r.repay ? 100 : 0], [2, r.repay ? 100 : 0]], color: '#152f39', label: 'What the claim paid' }],
      { xLabel: '', yLabel: 'Dollars per claim', xMin: 0, xMax: 2, yMin: 0, yMax: 100, xTicks: [0, 1, 2], xFmt: x => ['Start', 'Market 1', 'Market 2'][Math.round(x)], yFmt: y => '$' + Math.round(y), aria: 'Prices against the pooled clues and the outcome' });
    return `${head}<div class="split"><div><div class="label">The borrower</div><div class="lead">${r.repay ? 'Repaid: $100' : 'Defaulted: $0'}</div>
      <p class="sub">${r.nClue ? `${r.nClue} of ${r.n} students had a clue; ${r.nGood} said repay, ${r.nBad} said default. ${r.nClue - r.nRight} clue${r.nClue - r.nRight === 1 ? ' was' : 's were'} wrong. Together they implied <b>$${Math.round(r.pooled * 100)}</b>.` : 'No one had a private clue.'}</p>
      ${ui.table(['', 'Price', 'Traded', 'Average probability'], [r.m1, r.m2].map((m, i) => m ? [`Market ${i + 1}${i === 1 && r.pubSig ? (r.pubSig === 'up' ? ' (after an upgrade)' : ' (after a downgrade)') : ''}`, `<b>${dollars(m)}</b>`, m.q, pct(m.belief)] : null).filter(Boolean))}
      <p class="note">${r.traders} of ${r.n} traded at least once. Gains ranged from ${whole(r.worstGain)} to ${whole(r.bestGain)}.${[r.m1, r.m2].some(m => m && m.price == null) ? ' Where a market shows no trade, the bid and ask are quotes, not a price anyone paid.' : ''}</p>
      <p class="note">Three different numbers: the <b>price</b> is what traders paid; the <b>pooled clues</b> are what all the private information implied, assuming clues are independent and everyone knows how accurate they are; the <b>outcome</b> is one draw. A good probability can still be followed by a surprising outcome, so judge prices over many borrowers.</p></div><div>${chart}</div></div>${comparison(S)}`;
  }
  const clueText = c => c === 'good' ? '📈 <b>Your clue: the borrower\'s sales rose.</b> That points to repaying.' : c === 'bad' ? '📉 <b>Your clue: the borrower\'s sales fell.</b> That points to default.' : 'You have <b>no clue</b> this round.';
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {};
    if (S.phase === 'instructions') { const a = s.acc / 100, two = a * a / (a * a + (1 - a) * (1 - a));
      return `<h2>Get ready</h2>${ui.brief(`$${CASH0} of cash and one claim that pays $${FACE} if the borrower repays, $0 if not.${s.share > 0 ? ' Maybe a private clue.' : ''}`, 'in each of two markets: your probability that the borrower repays, then one order to buy, sell, or sit out.', 'one clearing price for everyone; then the borrower\'s outcome decides what claims pay.')}
      <details open><summary>Worked examples</summary><p class="note" style="margin:6px 0 0"><b>Updating:</b> you start at 50/50. A clue that is right ${s.acc}% of the time says "repay": now ${s.acc}%. A second, independent clue that also says "repay": about ${Math.round(two * 100)}%. One "repay" and one "default": back to 50%.<br>
      <b>Orders:</b> "Buy, paying at most $60" means you buy one claim if the clearing price is $60 or less, and you pay the clearing price, not $60. "Sell, for at least $40" means you sell if the price is $40 or more. If no buy order meets a sell order, nothing trades.</p></details>`; }
    const book = ui.tiles([['Cash', '$' + p.cash], ['Claims', p.claims]], 'two');
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Clearing the market…</h2>' + book;
      const mine = me.moves[String(S.step)], m1 = S.pub.m1;
      const side = mine ? mine.side : '';
      const last = S.step === 2 ? `${m1 ? `<p class="note">Market 1: <b>${dollars(m1)}</b> (${m1.q} traded). You ${p.t1 === 'bought' ? 'bought a claim' : p.t1 === 'sold' ? 'sold a claim' : 'did not trade'}.</p>` : ''}${S.pub.pubSig ? `<div class="banner warn"><strong>News</strong>${sigText(S.pub.pubSig)}</div>` : ''}` : '';
      return `<h2>Market ${S.step} of 2</h2><div class="banner">${clueText(p.clue)}${s.share > 0 && p.clue ? ` Clues are right ${s.acc}% of the time.` : ''}</div>${book}${last}
        <div class="field"><label for="iBel">Your probability that the borrower repays (%)</label><input id="iBel" type="number" min="0" max="100" inputmode="numeric" value="${mine ? mine.belief : ''}"></div>
        <h3>Your order</h3><div class="row"><div class="field"><label for="iSide">Order</label><select id="iSide"><option value="buy" ${side === 'buy' ? 'selected' : ''}>Buy one claim, paying at most…</option><option value="sell" ${side === 'sell' ? 'selected' : ''} ${p.claims < 1 ? 'disabled' : ''}>Sell one claim, for at least…</option><option value="none" ${side === 'none' ? 'selected' : ''}>Sit out</option></select></div>
        <div class="field"><label for="iPrice">Price ($0–$${FACE})</label><input id="iPrice" type="number" min="0" max="${FACE}" inputmode="numeric" value="${mine && mine.price != null ? mine.price : ''}"></div><button class="btn primary" id="iSend">Submit</button></div>
        <p class="msg good" id="receipt">${mine ? (mine.side === 'none' ? 'You are sitting out.' : `Your order: ${mine.side} one claim at ${mine.side === 'buy' ? 'up to' : 'at least'} $${mine.price}.`) + ' You can change it until the market closes.' : ''}</p>`;
    }
    if (S.phase === 'closed') return '<h2>Trading is over</h2>' + book;
    const h = S.history.find(x => x.roundNo === S.roundNo), r = h && h.result;
    return `<h2>The borrower ${r && r.repay ? 'repaid' : 'defaulted'}</h2><div class="bigpay">${(p.gain >= 0 ? '+' : '−') + whole(Math.abs(p.gain)).replace('−', '')}</div>
      <p class="sub">compared with not trading. You end with $${p.cash} and ${p.claims} claim${p.claims === 1 ? '' : 's'} paying $${r && r.repay ? FACE : 0} each.</p>`;
  }
  function wireStudent(root, ctx) {
    const b = root.querySelector('#iSend'); if (!b) return;
    b.onclick = () => {
      const bel = root.querySelector('#iBel').value, side = root.querySelector('#iSide').value, pr = root.querySelector('#iPrice').value;
      if (bel === '') return ctx.say('Enter your probability first.');
      const d = { belief: Math.max(0, Math.min(100, Math.round(Number(bel)))), side };
      if (side !== 'none') { if (pr === '') return ctx.say('Enter a price for your order.'); d.price = Math.max(0, Math.min(FACE, Math.round(Number(pr)))); }
      ctx.submit(d);
    };
  }
  function renderInstructor(S) {
    if (S.phase === 'open') return `<div class="banner"><strong>Market ${S.step} · ${S.nMoved} of ${S.nPlayers} in</strong>${S.step === 1 ? 'Ending market 1 clears it and announces the rating change.' : 'Close, then Reveal shows the outcome and every clue.'}</div>`;
    return '';
  }
  /* Simulated traders: a belief from their own clue, blended with the last price and the news. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const s = clean(st.settings);
    let b = p.clue === 'good' ? s.acc : p.clue === 'bad' ? 100 - s.acc : 50;
    if (st.step === 2) { const m1 = st.pub.m1; if (m1 && m1.price != null) b = (2 * b + m1.price) / 3; if (st.pub.pubSig) b += (st.pub.pubSig === 'up' ? 1 : -1) * (s.pubAcc - 50) * 0.4; }
    b = Math.max(1, Math.min(99, Math.round(b + (rand() - 0.5) * 16)));
    const d = { belief: b, side: 'none' };
    if (b > 52) { d.side = 'buy'; d.price = Math.max(0, b - Math.floor(rand() * 8)); }
    else if (b < 48 && p.claims > 0) { d.side = 'sell'; d.price = Math.min(FACE, b + Math.floor(rand() * 8)); }
    return { submit: d };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id], m = st => (d.moves.find(y => y.player === p.id && y.step === st) || {}).data || {};
      return { round: h.roundNo, label: h.label, outcome: h.result.repay ? 'repaid' : 'defaulted', display_name: p.name, clue: x.clue || '', belief1: m(1).belief ?? '', order1: m(1).side ? `${m(1).side} ${m(1).price ?? ''}` : '', belief2: m(2).belief ?? '', order2: m(2).side ? `${m(2).side} ${m(2).price ?? ''}` : '', cash: x.cash, claims: x.claims, gain: x.gain ?? '' }; });
  }
  function debrief(S, hh) {
    const r = hh.result;
    return {
      explain: `The clues together implied $${Math.round(r.pooled * 100)}. Market 1: ${dollars(r.m1)}. Market 2: ${dollars(r.m2)}. The borrower ${r.repay ? 'repaid' : 'defaulted'}. Did the price end up closer to the pooled clues than the average trader's probability? Keep three numbers apart: the price, what the clues implied, and the outcome.`,
      transfer: 'Credit spreads and credit-default-swap prices pool what many investors know about a borrower. A thinly traded bond can go days with no trades, only quotes. What can you learn from those quotes, and what can you not?',
      check: { q: 'You start at 50/50 on whether a borrower repays. One clue that is right 65% of the time says "repay." Then a second, independent clue, also right 65% of the time, says "default." What should your probability of repayment be now?',
        options: [['a', '50%'], ['b', '65%'], ['c', '35%'], ['d', 'About 42%']], answer: 'a',
        why: 'Each clue tilts the odds by 65 to 35 in its direction. Two clues of equal accuracy pointing opposite ways cancel, so you are back to 50%. Two clues that both say "repay" would put you near 78%.',
        trap: 'trusting the most recent clue, or averaging probabilities in some other way. Independent clues of equal accuracy cancel exactly.' }
    };
  }

  const game = { id: 'infomarket', title: 'Information Market', tagline: 'Each of you knows a little. Does the price end up knowing more than anyone?',
    fields, presets, buildSettings, rules, steps, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    debrief, nonresponse: 'no probability and no order: the student sits out this market.',
    compare: { metric: 'how close the market 2 price comes to what the clues implied', note: 'Each round is a new borrower with new clues and a new outcome, so compare how well prices tracked the information, not whether one borrower repaid.' },
    openLabel: 'Open market 1', stepLabel: () => 'Clear market 1; announce the news', closeLabel: S => S.step >= 2 ? 'Close market 2' : 'End trading now', model: { clear, pooled, world } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
