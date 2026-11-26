/* Bond Desk on the shared classroom toolkit (Feb 23, after 08.1–08.3). Spec:
   classroom/specs/bond-desk.md. Everyone values the same 3-year note ($1,000 face, 5% annual
   coupon) at a private required return, then bids for one note. A fixed number of notes is
   sold above a minimum price; every winner pays the highest losing eligible bid (the minimum
   if no eligible bid loses). Winners score PV at their own required return minus the price.
   Step 1: PV and a price prediction. Step 2: the bid. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, money, whole } = ui;
  const FACE = 1000, CPN = 50, YEARS = 3, CASH = 1100;
  const ORDER = [3.0, 7.0, 5.0, 4.0, 6.0, 3.5, 6.5, 4.5, 5.5];   // spreads the nine levels; same as the paper kit

  const pv = y => { let v = 0; for (let t = 1; t <= YEARS; t++) v += (t === YEARS ? CPN + FACE : CPN) / Math.pow(1 + y, t); return v; };
  const ytm = price => { let lo = -0.5, hi = 1; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (pv(m) > price) lo = m; else hi = m; } return (lo + hi) / 2; };
  const pctY = y => (y * 100).toFixed(y * 1000 % 5 === 0 ? 1 : 2) + '%';
  const cents = x => money(x, 2);

  const fields = [
    { id: 'shift', label: 'Required returns raised by (points)', type: 'number', min: 0, max: 3, step: 0.5 },
    { id: 'sharePct', label: 'Notes for sale (% of students)', type: 'number', min: 5, max: 90, step: 5 },
    { id: 'minPrice', label: 'Minimum price ($)', type: 'number', min: 800, max: 1050 }
  ];
  const presets = [
    { id: 'base', label: 'Baseline', note: 'Required returns from 3.0% to 7.0%. Notes for 40% of the class; none sold below $950.', values: { shift: 0, sharePct: 40, minPrice: 950 } },
    { id: 'up', label: 'Every required return one point higher', note: 'The same students and ranks, each required return one point higher (4.0% to 8.0%). Same notes and minimum. Ask for a prediction of the new price first.', values: { shift: 1, sharePct: 40, minPrice: 950 } }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { shift: Math.round(n(v.shift, 0, 0, 3) * 2) / 2, sharePct: n(v.sharePct, 40, 5, 90), minPrice: Math.round(n(v.minPrice, 950, 800, 1050)) }; };
  function buildSettings(v) {
    const s = clean(v);
    s.input = {
      '1': { fields: { pv: { type: 'int', label: 'Your PV', min: 0, max: 2000, optional: true }, predict: { type: 'int', label: 'Your prediction', min: 0, max: 2000, optional: true } } },
      '2': { fields: { bid: { type: 'int', label: 'Your bid', min: s.minPrice, maxPriv: 'cash', optional: true } } }
    };
    return s;
  }
  const steps = () => 2;
  const notesFor = (n, s) => Math.max(1, Math.round(clean(s).sharePct / 100 * n));

  /* Clearing: eligible bids ranked high to low, ties by a seeded priority; the top Q win and
     pay the larger of the minimum and the highest losing eligible bid. */
  function clear(bids, Q, minPrice) {
    const el = bids.filter(b => b.bid != null && b.bid >= minPrice).sort((a, b) => b.bid - a.bid || a.prio - b.prio);
    const winners = el.slice(0, Q), price = el.length > Q ? Math.max(minPrice, el[Q].bid) : minPrice;
    return { winners: new Set(winners.map(b => b.id)), price, sold: winners.length, eligible: el, firstOut: el[Q] || null };
  }

  /* ---------- instructor side ---------- */
  function assign({ S, settings, roster, seed }) {
    const s = clean(settings), prev = {};
    for (const h of S.history) if (h.result && h.result.levels) Object.assign(prev, h.result.levels);
    const count = {}; ORDER.forEach(l => count[l] = 0);
    for (const p of roster) if (prev[p.id] != null) count[prev[p.id]]++;
    const fresh = roster.filter(p => prev[p.id] == null).sort((a, b) => ui.hash(S.code + ':' + a.id) - ui.hash(S.code + ':' + b.id));
    const levels = {};
    for (const p of roster) if (prev[p.id] != null) levels[p.id] = prev[p.id];
    for (const p of fresh) {   // fill the least-used level, in the spread order
      const l = ORDER.reduce((best, x) => count[x] < count[best] ? x : best, ORDER[0]);
      levels[p.id] = l; count[l]++;
    }
    const priv = {};
    for (const p of roster) priv[p.id] = { cash: CASH, req: (levels[p.id] + s.shift) / 100 };
    return { private: priv, pub: { Q: notesFor(roster.length, s), n: roster.length, seed, levels } };
  }
  /* After step 1, each phone gets the correct PV and whether its answer was within $1. */
  function afterStep({ data, closedStep }) {
    if (closedStep !== 1) return {};
    const last = {}; for (const m of data.moves) if (m.step === 1) last[m.player] = m.data;
    const priv = {};
    for (const id in data.private) { const v = pv(data.private[id].req), a = last[id] && last[id].pv; priv[id] = { pv: v, pvAnswer: a ?? null, pvOk: a != null ? Math.abs(a - v) <= 1 : null }; }
    return { private: priv };
  }
  function resolve({ S, settings, data }) {
    const s = clean(settings), P = data.private, ids = Object.keys(P), step = {}, first = {};
    for (const m of data.moves) { if (m.step === 2) step[m.player] = m.data; if (m.step === 1) first[m.player] = m.data; }
    const bids = ids.map(id => ({ id, bid: step[id] && Number.isInteger(step[id].bid) ? step[id].bid : null, prio: ui.hash(S.pub.seed + ':' + id), pv: pv(P[id].req), req: P[id].req }));
    const c = clear(bids, S.pub.Q, s.minPrice), priv = {};
    let over = 0, missed = 0, pvRight = 0, pvAns = 0;
    for (const b of bids) {
      const won = c.winners.has(b.id), score = won ? b.pv - c.price : 0;
      if (won && b.bid > Math.ceil(b.pv)) over++;
      if (!won && b.pv > c.price && b.pv >= s.minPrice) missed++;
      const a = first[b.id] && first[b.id].pv; if (a != null) { pvAns++; if (Math.abs(a - b.pv) <= 1) pvRight++; }
      priv[b.id] = { won, paid: won ? c.price : 0, bid: b.bid, score, pv: b.pv, pvAnswer: a ?? null, pvOk: a != null ? Math.abs(a - b.pv) <= 1 : null };
    }
    const preds = ids.map(id => first[id] && first[id].predict).filter(x => Number.isFinite(x));
    const scores = bids.filter(b => c.winners.has(b.id)).map(b => b.pv - c.price);
    return {
      private: priv,
      result: { n: ids.length, Q: S.pub.Q, minPrice: s.minPrice, shift: s.shift, price: c.price, sold: c.sold, nBids: bids.filter(b => b.bid != null).length, nEligible: c.eligible.length,
        yield: ytm(c.price), firstOut: c.firstOut ? { bid: c.firstOut.bid, req: c.firstOut.req } : null,
        bidsSorted: c.eligible.map(b => b.bid), pvSorted: bids.map(b => b.pv).sort((x, y) => y - x),
        predMedian: ui.median(preds), nPred: preds.length, pvRight, pvAns, over, missed, scoreMedian: ui.median(scores), levels: S.pub.levels }
    };
  }

  /* ---------- screens ---------- */
  function rules(s) {
    s = clean(s);
    return `<ul class="rules"><li>Everyone values <b>the same note</b>: 3 years, $1,000 face value, a 5% coupon paid once a year. It pays $50, $50, and $1,050.</li>
      <li>Your phone gives you a private <b>required return</b>: what your money earns in its next-best use${s.shift ? ` (one ${s.shift === 1 ? 'point' : s.shift + ' points'} higher than in the baseline)` : ''}. It differs from person to person; the note's payments do not.</li>
      <li>Step 1: work out the note's <b>present value (PV)</b> at your required return, and predict the price. Step 2: bid.</li>
      <li>The issuer sells notes to about <b>${s.sharePct}%</b> of the class, and none below <b>$${s.minPrice}</b>. One note per person.</li>
      <li><b>The highest bids win. Every winner pays one price:</b> the highest bid that lost, or $${s.minPrice} if no bid loses. Ties at the cutoff go to a random order drawn when the round opens.</li>
      <li>A winner scores <b>PV to them − the price</b>. Everyone else scores 0. You have $${CASH.toLocaleString()} in cash, and cash you keep keeps its value.</li></ul>`;
  }
  const formula = '<p class="formula" style="font-size:1.05em">PV = 50/(1+y) + 50/(1+y)² + 1,050/(1+y)³</p>';
  function example(s) {
    s = clean(s);
    const ys = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5].map(y => (y + s.shift) / 100), vals = ys.map(y => Math.round(pv(y)));
    const el = vals.filter(v => v >= s.minPrice), price = el.length > 4 ? Math.max(s.minPrice, el[4]) : s.minPrice;
    return `<details open><summary>Worked example: ten bidders, four notes</summary><p class="note" style="margin:6px 0 0">Required returns from ${pctY(ys[0])} to ${pctY(ys[9])}, and everyone bids their PV: ${vals.map(v => '$' + v.toLocaleString()).join(', ')}. ${vals.length - el.length ? `${vals.length - el.length} of them are below the $${s.minPrice} minimum and should not bid. ` : ''}The four highest win, and each pays <b>${whole(price)}</b>, the highest bid that lost. The first winner scores ${whole(vals[0] - price)}.</p></details>`;
  }
  function demandChart(r) {
    if (!r.bidsSorted.length && !r.pvSorted.length) return '<p class="note">No bids.</p>';
    const n = Math.max(r.pvSorted.length, 1), lo = 900, hi = 1100, clip = v => Math.max(lo, Math.min(hi, v));
    const series = [
      { label: 'What the note is worth to each student (PV), highest first', color: '#9bb0aa', dash: true, points: r.pvSorted.map((v, i) => [i + 1, clip(v)]) },
      { label: 'Bids, highest first', color: 'var(--teal)', dots: true, points: r.bidsSorted.map((v, i) => [i + 1, clip(v)]) },
      { label: 'Price', color: '#eb6834', points: [[0.5, r.price], [n + 0.5, r.price]] }
    ];
    return ui.lines(series, { xLabel: 'Notes (bids ranked from highest)', yLabel: 'Dollars', yMin: lo, yMax: hi, xMin: 0.5, xMax: n + 0.5, vline: r.Q + 0.5, yFmt: v => '$' + Math.round(v), xFmt: v => Math.round(v),
      xTicks: [1, Math.round(n / 4), Math.round(n / 2), Math.round(3 * n / 4), n].filter((x, i, a) => x >= 1 && a.indexOf(x) === i), yTicks: [900, 950, 1000, 1050, 1100],
      aria: `Bids ranked from highest. ${r.Q} notes for sale; the price was ${whole(r.price)}.` }) + `<p class="note">The dashed vertical line marks the ${r.Q} notes for sale. Bids below $900 or above $1,100 are drawn at the edge.</p>`;
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.price != null); if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Required returns', 'Notes', 'Price', 'Market yield', 'Median prediction'], done.map(h => { const r = h.result;
      return [`${h.roundNo}. ${esc(h.label)}`, `${(3 + r.shift).toFixed(1)}% to ${(7 + r.shift).toFixed(1)}%`, `${r.sold} of ${r.Q}`, `<b>${whole(r.price)}</b>`, pctY(r.yield), r.predMedian != null ? whole(r.predMedian) : '—']; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>What is the note worth to you, and what will it sell for?</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div><h3 style="margin-top:0">The note</h3>${ui.table(['Year 1', 'Year 2', 'Year 3'], [['$50', '$50', '$1,050']])}${formula}${comparison(S)}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const st = S.phase === 'closed' ? 'Bidding is closed. Results in a moment.' : S.pending ? 'Checking PVs…' : S.step === 1 ? 'Step 1: work out the PV at your required return, and predict the price.' : 'Step 2: your phone now shows your correct PV. Bid, or choose no bid.';
      return `${head}<h2>${S.step === 1 ? 'Value the note' : 'Bid for a note'}</h2>
        ${ui.tiles([['Answers this step', `${S.nMoved} of ${S.nPlayers}`, 'hi'], ['Notes for sale', S.pub.Q], ['Minimum price', whole(s.minPrice)], ['Bidders', S.pub.n]])}
        <div class="banner ${S.phase === 'open' ? 'warn' : ''}"><strong style="font-size:1.3em">${st}</strong>Every winner pays the highest bid that lost.</div>
        ${S.step === 1 && S.phase === 'open' ? formula : ''}${ctx.joinLine()}${comparison(S)}`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head + '<p>Waiting for results.</p>';
    const r = h.result;
    return `${head}<div class="split"><div>
        <div class="label">The price</div><div class="lead">${whole(r.price)}</div>
        <p class="sub">A market yield of <b>${pctY(r.yield)}</b>. ${r.firstOut ? `The first bidder left out bid ${whole(r.firstOut.bid)} with a required return of ${pctY(r.firstOut.req)}.` : r.nEligible <= r.Q ? `Fewer eligible bids than notes, so every bidder won at the $${r.minPrice} minimum.` : ''}</p>
        ${ui.tiles([['Notes sold', `${r.sold} of ${r.Q}`], ['Class median prediction', r.predMedian != null ? whole(r.predMedian) : '—'], ['PV answers within $1', `${r.pvRight} of ${r.pvAns}`], ['Winners who bid above their PV', r.over], ['Missed a note worth more than the price', r.missed], ['Median winner\'s score', r.scoreMedian != null ? cents(r.scoreMedian) : '—']])}
      </div><div><h3 style="margin-top:0">The class's bids: a demand curve</h3>${demandChart(r)}</div></div>${comparison(S)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), rn = S.roundNo, p = me.priv[rn] || {}, m1 = me.moves['1'] || {}, m2 = me.moves['2'];
    if (S.phase === 'instructions') return `<h2>Get ready</h2>${ui.brief(`$${CASH.toLocaleString()} and a private required return, shown when the round opens.`, 'first what the note is worth to you (its PV) and a price prediction; then whether to bid for it, and how much.', `the highest bids win, and every winner pays the same price: the highest bid that lost, or $${s.minPrice} if none loses. A winner scores PV − price.`)}${example(s)}`;
    const card = `<div class="banner"><strong>Your required return</strong><span class="bigpay">${pctY(p.req)}</span><span class="note">Cash: $${CASH.toLocaleString()}. Cash you keep keeps its value. One note per person.</span></div>`;
    if (S.phase === 'open' && S.pending) return '<h2>Checking PVs…</h2>';
    if (S.phase === 'open' && S.step === 1) {
      const got = me.moves['1'] ? `Received${m1.pv != null ? `: PV ${whole(m1.pv)}` : ''}${m1.predict != null ? `, prediction ${whole(m1.predict)}` : ''}. You can change it until the step ends.` : '';
      return `<h2>Step 1: what is the note worth to you?</h2>${card}${ui.table(['Year 1', 'Year 2', 'Year 3'], [['$50', '$50', '$1,050']])}${formula}
        <p class="note">Use your required return as y. A calculator is fine. Round to the nearest dollar.</p>
        <div class="row"><div class="field"><label for="pvInput">PV at ${pctY(p.req)} ($)</label><input id="pvInput" type="number" min="0" max="2000" step="1" inputmode="numeric" value="${m1.pv ?? ''}"></div>
        <div class="field"><label for="predInput">Your prediction: the price the notes sell for ($)</label><input id="predInput" type="number" min="0" max="2000" step="1" inputmode="numeric" value="${m1.predict ?? ''}"></div></div>
        <div class="actions"><button class="btn primary" id="s1Btn">Send</button></div><p class="msg good" id="receipt">${got}</p>`;
    }
    if (S.phase === 'open') {
      const chk = p.pv != null ? `<div class="banner ${p.pvOk === false ? 'warn' : ''}"><strong>Your PV at ${pctY(p.req)}: ${cents(p.pv)}</strong>${p.pvAnswer == null ? 'You did not enter one.' : p.pvOk ? `Your answer, ${whole(p.pvAnswer)}, was right.` : `Your answer was ${whole(p.pvAnswer)}.`}</div>` : '';
      const below = p.pv != null && p.pv < s.minPrice ? `<p class="sub">The note is worth less to you than the $${s.minPrice} minimum, so a bid could only lose you points.</p>` : '';
      const got = m2 ? (m2.bid != null ? `Your bid of <b>${whole(m2.bid)}</b> is in.` : 'You chose <b>no bid</b>.') + ' You can change it until bidding closes.' : '';
      return `<h2>Step 2: bid</h2>${card}${chk}${below}
        <div class="field"><label for="bidInput">Your bid (whole dollars, $${s.minPrice} to $${CASH.toLocaleString()})</label><input id="bidInput" type="number" min="${s.minPrice}" max="${CASH}" step="1" inputmode="numeric" value="${m2 && m2.bid != null ? m2.bid : ''}"></div>
        <div class="actions"><button class="btn primary" id="bidBtn">Submit bid</button><button class="btn secondary" id="noBidBtn">No bid</button></div>
        <p class="msg good" id="receipt">${got}</p>`;
    }
    if (S.phase === 'closed') return `<h2>Bidding is closed</h2>${card}<p class="sub">${m2 && m2.bid != null ? 'Your bid: ' + whole(m2.bid) : 'You did not bid.'} Waiting for the reveal.</p>`;
    const h = S.history.find(x => x.roundNo === rn); if (!h) return '<p>Waiting for results.</p>';
    const r = h.result;
    return `<h2>Your result</h2><div class="bigpay">${p.won ? `Score ${cents(p.score)}` : 'No note this round'}</div>
      <p class="sub">${p.won ? `You bid ${whole(p.bid)} and paid the price, <b>${whole(r.price)}</b>, for a note worth ${cents(p.pv)} to you.${p.score < 0 ? ' You paid more than it was worth to you.' : ''}` : p.bid != null ? `You bid ${whole(p.bid)}; the price was ${whole(r.price)}.${p.pv > r.price ? ` The note was worth ${cents(p.pv)} to you, so winning would have scored ${cents(p.pv - r.price)}.` : ''}` : `You did not bid.${p.pv > r.price ? ` At ${whole(r.price)}, a note worth ${cents(p.pv)} to you would have scored ${cents(p.pv - r.price)}.` : ''}`}</p>
      ${ui.table(['', ''], [['Price', `<b>${whole(r.price)}</b>`], ['Market yield', pctY(r.yield)], ['Your required return', pctY(p.req)], ['Your PV', cents(p.pv)], ...(m1.predict != null ? [['Your prediction', whole(m1.predict)]] : [])])}`;
  }
  function wireStudent(root, ctx) {
    const num = id => { const el = root.querySelector('#' + id); return el && el.value.trim() !== '' ? Math.round(Number(el.value)) : null; };
    const s1 = root.querySelector('#s1Btn'); if (s1) s1.onclick = () => ctx.submit({ pv: num('pvInput'), predict: num('predInput') });
    const b = root.querySelector('#bidBtn'); if (b) b.onclick = () => { const v = num('bidInput'); if (v == null) return ctx.say('Enter a bid, or tap No bid.'); ctx.submit({ bid: v }); };
    const nb = root.querySelector('#noBidBtn'); if (nb) nb.onclick = () => ctx.submit({ bid: null });
  }
  function renderInstructor(S) {
    const h = S.history.find(x => x.roundNo === S.roundNo);
    if (h && (S.phase === 'revealed' || S.phase === 'debrief')) return `<div class="banner"><strong>Price ${whole(h.result.price)} · yield ${pctY(h.result.yield)}</strong>${h.result.sold} of ${h.result.Q} notes sold · ${h.result.nBids} bids</div>`;
    if (S.phase === 'open') return `<div class="banner"><strong>Step ${S.step}: ${S.nMoved} of ${S.nPlayers} answered</strong>${S.pub.Q} notes · minimum ${whole(clean(S.settings).minPrice)}</div>`;
    return '';
  }

  /* Simulated students: most compute the PV correctly; most bid a little below it, some bid it, a few overbid. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const s = clean(st.settings), v = pv(p.req);
    if (st.step === 1) {
      const last = st.history[st.history.length - 1], guess = last && last.result ? last.result.price - 27 * (s.shift - last.result.shift) : 1000;
      return { submit: { pv: rand() < 0.8 ? Math.round(v) : Math.round(v + (rand() - 0.5) * 80), predict: Math.round(guess + (rand() - 0.5) * 60) } };
    }
    if (v < s.minPrice || rand() < 0.05) return { submit: { bid: null } };
    const u = rand(), bid = u < 0.65 ? v - 5 - 25 * rand() : u < 0.9 ? v : v + 5 + 20 * rand();
    return { submit: { bid: Math.max(s.minPrice, Math.min(CASH, Math.round(bid))) } };
  }
  function exportRows(h, d) {
    const last = {}; for (const m of d.moves) (last[m.player] = last[m.player] || {})[m.step] = m.data;
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id], a = last[p.id] || {};
      return { round: h.roundNo, label: h.label, shift: h.result.shift, notes: h.result.Q, price: h.result.price, market_yield: h.result.yield.toFixed(5), display_name: p.name,
        required_return: x.req, pv: x.pv != null ? x.pv.toFixed(2) : '', pv_answer: a[1] && a[1].pv != null ? a[1].pv : '', prediction: a[1] && a[1].predict != null ? a[1].predict : '',
        bid: a[2] && a[2].bid != null ? a[2].bid : '', won: !!x.won, score: x.score != null ? x.score.toFixed(2) : '' }; });
  }

  /* ---------- debrief ---------- */
  const CHECK = { q: 'A 3-year note pays $50, $50, and $1,050. Your required return is 6%. The note sells for $1,000. Should you buy it?',
    options: [['a', 'No: its PV to you is $973.27, below the price'], ['b', 'Yes: it pays a 5% coupon, so $1,000 is fair'], ['c', 'Yes: a higher price means a higher yield'], ['d', 'It depends on what the other bidders do']], answer: 'a',
    why: 'Discounting $50, $50, and $1,050 at 6% gives $973.27. Paying $1,000 means earning about 5%, less than the 6% your money earns elsewhere. Others\' bids set the price, but whether a purchase at that price is worth it depends only on your own PV.',
    trap: 'thinking a higher price means a higher yield. A higher price for the same payments means a lower yield.' };
  function debrief(S, hh) {
    const r = hh.result, prev = S.history.filter(x => x.result && x.roundNo < hh.roundNo).pop();
    const change = prev ? ` In round ${prev.roundNo} the price was ${whole(prev.result.price)}; it moved ${whole(r.price - prev.result.price)} (${((r.price / prev.result.price - 1) * 100).toFixed(1)}%) when required returns rose ${(r.shift - prev.result.shift).toFixed(1)} points.` : '';
    return {
      explain: `The price was ${whole(r.price)}, a market yield of ${pctY(r.yield)}.${r.firstOut ? ` The first bidder left out had a required return of ${pctY(r.firstOut.req)}.` : ''}${change} Whose required return set the price? A winner with a ${(3 + r.shift).toFixed(1)}% required return valued the note at ${cents(pv(0.03 + r.shift / 100))}: where does their score come from?`,
      transfer: 'A pension fund needs 4%, and a bank\'s next-best use of the money earns 6%. The note sells at $1,000. Who buys? If deposit rates rise, what happens to the bank\'s required return, and to what it will pay for the note?',
      next: prev ? '' : 'Suppose every required return in the room rises by one point. Will the price rise or fall, and by about how much?',
      check: CHECK
    };
  }

  const game = { id: 'bond-desk', title: 'Bond Desk', tagline: 'Everyone values the same note at a different required return. What is it worth to you, and what will it sell for?',
    fields, presets, buildSettings, steps, rules, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows, debrief,
    nonresponse: 'step 1: no PV or prediction is recorded; step 2: no bid (no note, score 0).',
    compare: { metric: 'the price and the market yield', note: 'Each student keeps the same rank of required return; with a one-point rise every PV falls. Students have also seen round 1, so differences in bidding are suggestive.' },
    stepLabel: () => 'End step 1: show each phone its PV', closeLabel: S => S.step < 2 ? 'End the round now' : 'Close bidding', openLabel: 'Open step 1',
    model: { pv, ytm, clear } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
