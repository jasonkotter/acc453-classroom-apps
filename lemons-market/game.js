/* Lemons Market on the shared classroom toolkit. Rules: README.md.
   Each round: students are split into sellers and buyers and paired at random. A seller's car
   has one of five qualities, known only to the seller. The buyer offers a price; the seller
   accepts or rejects. With inspection on, sellers may first pay to show the car's quality. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, whole, pct } = ui;
  const GRADES = [['Lemon', 2000], ['Rough', 4000], ['Fair', 6000], ['Good', 8000], ['Peach', 10000]];
  const MULT = 1.5;   // a buyer values every car at 1.5 times what it is worth to its seller

  const fields = [{ id: 'inspect', label: 'Inspection available', type: 'checkbox' }, { id: 'inspectCost', label: 'Inspection cost ($)', type: 'number', min: 0, max: 5000, step: 100 }];
  const presets = [
    { id: 'r1', label: 'Hidden quality, round 1', note: 'Buyers know only that the five qualities are equally likely.', values: { inspect: false, inspectCost: 500 } },
    { id: 'r2', label: 'Hidden quality, round 2', note: 'Same market, new cars and partners. Buyers have now seen what sold last round.', values: { inspect: false, inspectCost: 500 } },
    { id: 'r3', label: 'Hidden quality, round 3', note: 'Watch whether the good cars keep leaving.', values: { inspect: false, inspectCost: 500 } },
    { id: 'insp', label: 'Inspection', note: 'Sellers may pay $500 to have the car inspected; the buyer sees the result.', values: { inspect: true, inspectCost: 500 } }
  ];
  const clean = v => (v = v || {}, { inspect: !!v.inspect, inspectCost: Math.max(0, Math.min(5000, Number(v.inspectCost) || 0)) });
  function buildSettings(v) {
    const s = clean(v), offer = { role: 'buyer', required: ['offer'], fields: { offer: { type: 'int', label: 'Your offer', min: 0, max: 20000 } } },
      accept = { role: 'seller', required: ['accept'], fields: { accept: { type: 'bool' } } };
    s.input = s.inspect ? { '1': { role: 'seller', required: ['inspect'], fields: { inspect: { type: 'bool' } } }, '2': offer, '3': accept } : { '1': offer, '2': accept };
    return s;
  }
  const steps = s => clean(s || {}).inspect ? 3 : 2;
  const stage = (s, step) => s.inspect ? ['inspect', 'offer', 'accept'][step - 1] : ['offer', 'accept'][step - 1];
  function rules(s) {
    s = clean(s);
    return `<ul class="rules"><li>Half of you are <b>sellers</b> of a used car, half are <b>buyers</b>, paired at random.</li>
      <li>Each car is one of five qualities, equally likely: ${GRADES.map(g => `${g[0]} (worth ${whole(g[1])} to its seller)`).join(', ')}.</li>
      <li>A buyer values any car at <b>1.5 times</b> what it is worth to its seller, so every sale could make both better off.</li>
      <li><b>Only the seller knows the car's quality.</b> ${s.inspect ? `A seller may pay ${whole(s.inspectCost)} to have it inspected; the buyer then sees the quality.` : ''}</li>
      <li>The buyer makes one offer; the seller accepts or rejects. Seller's gain: price − value to seller. Buyer's gain: value to buyer − price.</li>
      <li>No offer, or no answer from the seller, means no sale.</li></ul>`;
  }

  function assign({ roster, rng, settings }) {
    const ids = ui.shuffle(roster.map(p => p.id), rng), priv = {}, half = Math.floor(ids.length / 2);
    for (let i = 0; i < half; i++) {
      const sel = ids[i], buy = ids[half + i], g = Math.floor(rng() * 5);
      priv[sel] = { role: 'seller', grade: g, value: GRADES[g][1], partner: buy };
      priv[buy] = { role: 'buyer', partner: sel };
    }
    if (ids.length % 2) priv[ids[ids.length - 1]] = { role: 'spare' };
    return { private: priv, pub: { pairs: half } };
  }
  const movesAt = (data, step) => { const o = {}; for (const m of data.moves) if (m.step === step) o[m.player] = m.data; return o; };
  function afterStep({ S, data, closedStep }) {
    const s = clean(S.settings), st = stage(s, closedStep), mv = movesAt(data, closedStep), out = {};
    for (const [id, p] of Object.entries(data.private)) {
      if (st === 'inspect' && p.role === 'seller') { const yes = !!(mv[id] && mv[id].inspect); out[id] = { inspected: yes }; out[p.partner] = { cert: yes ? p.grade : null }; }
      if (st === 'offer' && p.role === 'buyer') { const o = mv[id] && Number.isFinite(mv[id].offer) ? mv[id].offer : null; out[id] = { offered: o }; out[p.partner] = { offer: o }; }
    }
    return { private: out };
  }
  function resolve({ S, data }) {
    const s = clean(S.settings), P = data.private, last = movesAt(data, S.step), priv = {};
    const byGrade = GRADES.map(() => ({ cars: 0, sold: 0, inspected: 0 })), prices = [];
    let gains = 0, possible = 0, trades = 0, soldValue = 0, offers = 0;
    for (const [id, p] of Object.entries(P)) {
      if (p.role !== 'seller') continue;
      const b = P[p.partner], offer = b.offered ?? p.offer ?? null, acc = !!(last[id] && last[id].accept) && offer != null;
      const cost = p.inspected ? s.inspectCost : 0, g = byGrade[p.grade];
      g.cars++; if (p.inspected) g.inspected++; possible += p.value * (MULT - 1); if (offer != null) offers++;
      if (acc) { g.sold++; trades++; prices.push(offer); soldValue += p.value; gains += p.value * (MULT - 1); }
      priv[id] = { sold: acc, price: acc ? offer : null, gain: (acc ? offer - p.value : 0) - cost };
      priv[p.partner] = { bought: acc, price: acc ? offer : null, gain: acc ? p.value * MULT - offer : 0, grade: acc ? p.grade : null };
    }
    const cost = Object.values(P).filter(p => p.inspected).length * s.inspectCost;
    return { private: priv, result: { pairs: S.pub.pairs, offers, trades, byGrade, avgPrice: ui.mean(prices), avgValueSold: trades ? soldValue / trades : null, gains, possible, inspectCost: cost } };
  }

  /* ---------- screens ---------- */
  function gradeChart(r) {
    return ui.bars(r.byGrade.map((g, i) => ({ label: `${GRADES[i][0]}<br>${whole(GRADES[i][1])}`, parts: [{ n: g.sold, color: 'var(--teal)', title: `${g.sold} sold` }, { n: g.cars - g.sold, color: '#b7c6c2', title: `${g.cars - g.sold} not sold` }] })), { height: 150, aria: 'Cars for sale and cars sold, by quality' }) +
      `<div class="legend"><span><i class="sw" style="background:var(--teal)"></i>Sold</span><span><i class="sw" style="background:#b7c6c2"></i>Not sold</span><span>By quality (value to the seller)</span></div>`;
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.pairs != null); if (!done.length) return '';
    return '<h3>Round by round</h3>' + ui.table(['Round', 'Cars sold', 'Average price', 'Average quality sold (value to seller)', 'Gains from trade realized'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, `${r.trades} of ${r.pairs}`, ui.whole(r.avgPrice), r.avgValueSold ? `<b>${whole(r.avgValueSold)}</b>` : '—', pct((r.gains - r.inspectCost) / Math.max(1, r.possible))]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>A used-car market</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S) || '<p class="sub">The average car is worth $6,000 to its seller and $9,000 to a buyer.</p>'}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const st = S.phase === 'open' ? stage(s, S.step) : null;
      const what = { inspect: 'Sellers: inspect your car or not?', offer: 'Buyers: make your offer.', accept: 'Sellers: accept or reject the offer.' }[st] || 'Results in a moment.';
      return `${head}<h2>${S.pending ? 'Passing the offers along…' : what}</h2>${ui.tiles([['Pairs', S.pub.pairs], ['Answered this step', `${S.nMoved}`, 'hi']], 'two')}${ctx.joinLine()}${comparison(S)}`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">Cars sold</div><div class="lead">${r.trades} of ${r.pairs}</div>
      ${ui.tiles([['Average price', whole(r.avgPrice)], ['Average quality sold', r.avgValueSold ? whole(r.avgValueSold) : '—'], ['Gains from trade realized', pct((r.gains - r.inspectCost) / Math.max(1, r.possible))], ['Offers made', `${r.offers} of ${r.pairs}`]])}
      <p class="note">Every car was worth more to a buyer than to its seller, so every unsold car is a trade that should have happened.</p></div>
      <div>${gradeChart(r)}</div></div>${comparison(S)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {};
    if (S.phase === 'instructions') return '<h2>Get ready</h2><p class="sub">Your role and your car (if you are selling) appear when the market opens.</p>';
    if (p.role === 'spare') return '<h2>You are the market watcher this round</h2><p class="sub">The class has an odd number, so you sit this one out. Watch the screen: what quality of car is selling?</p>';
    const mine = me.moves[String(S.step)], st = S.phase === 'open' && !S.pending ? stage(s, S.step) : null;
    const who = p.role === 'seller' ? `<div class="banner"><strong>You are a seller.</strong>Your car is <b>${GRADES[p.grade][0]}</b>: worth ${whole(p.value)} to you and ${whole(p.value * MULT)} to a buyer. Only you know this.</div>`
      : `<div class="banner"><strong>You are a buyer.</strong>You value a car at 1.5 times its worth to the seller. The seller knows its quality; ${p.cert != null ? `<b>this car was inspected: ${GRADES[p.cert][0]}</b>, worth ${whole(GRADES[p.cert][1] * MULT)} to you.` : p.cert === null && s.inspect && S.step > 1 ? '<b>this seller did not have the car inspected.</b>' : 'you don\'t.'}</div>`;
    if (S.phase === 'open') {
      if (S.pending) return who + '<h2>Passing the offers along…</h2>';
      if (st === 'inspect' && p.role === 'seller') return who + `<h3>Pay ${whole(s.inspectCost)} to have it inspected?</h3><div class="choices"><button class="choice" data-k="inspect" data-v="1" aria-pressed="${!!mine && mine.inspect === true}"><b>Inspect</b><span>The buyer sees the quality.</span></button><button class="choice" data-k="inspect" data-v="0" aria-pressed="${!!mine && mine.inspect === false}"><b>Don't</b><span>Keep the ${whole(s.inspectCost)}.</span></button></div><p class="msg good" id="receipt">${mine ? 'Choice in.' : ''}</p>`;
      if (st === 'offer' && p.role === 'buyer') return who + `<div class="row"><div class="field"><label for="lOffer">Your offer ($)</label><input id="lOffer" type="number" min="0" max="20000" step="100" inputmode="numeric" value="${mine ? mine.offer : ''}"></div><button class="btn primary" id="lSend">Make offer</button></div><p class="msg good" id="receipt">${mine ? `Offer in: ${whole(mine.offer)}. You can change it until the step ends.` : ''}</p>`;
      if (st === 'accept' && p.role === 'seller') return who + (p.offer == null ? '<div class="banner warn"><strong>Your buyer made no offer.</strong>No sale this round.</div>' : `<h3>Your buyer offers ${whole(p.offer)}</h3><div class="choices"><button class="choice" data-k="accept" data-v="1" aria-pressed="${!!mine && mine.accept === true}"><b>Accept</b><span>Gain ${whole(p.offer - p.value)}${p.inspected ? `, less ${whole(s.inspectCost)} inspection` : ''}.</span></button><button class="choice" data-k="accept" data-v="0" aria-pressed="${!!mine && mine.accept === false}"><b>Reject</b><span>Keep the car.</span></button></div><p class="msg good" id="receipt">${mine ? 'Answer in.' : ''}</p>`);
      return who + `<p class="sub">${{ inspect: 'Sellers are deciding whether to inspect.', offer: 'Buyers are making offers.', accept: 'Sellers are deciding.' }[st]}</p>`;
    }
    if (S.phase === 'closed') return who + '<p class="sub">Waiting for the results.</p>';
    return `<h2>${p.role === 'seller' ? (p.sold ? `Sold for ${whole(p.price)}` : 'Not sold') : (p.bought ? `You bought a ${GRADES[p.grade][0]} for ${whole(p.price)}` : 'No car this round')}</h2><div class="bigpay">${ui.money(p.gain)}</div><p class="sub">your gain this round.</p>`;
  }
  function wireStudent(root, ctx) {
    root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => ctx.submit({ [b.dataset.k]: b.dataset.v === '1' }));
    const b = root.querySelector('#lSend'); if (b) b.onclick = () => { const v = root.querySelector('#lOffer').value; if (v === '') return ctx.say('Enter an offer.'); ctx.submit({ offer: Math.round(Number(v)) }); };
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>Step ${S.step}: ${stage(clean(S.settings), S.step)}</strong>${S.nMoved} answered · ${S.pub.pairs} pairs</div>` : ''; }
  function sim(st, rand) {
    const s = clean(st.settings), p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const k = stage(s, st.step), last = st.history.filter(h => h.result && h.result.avgValueSold).slice(-1)[0];
    if (k === 'inspect' && p.role === 'seller') return { submit: { inspect: p.value >= 6000 } };
    if (k === 'offer' && p.role === 'buyer') {
      if (p.cert != null) return { submit: { offer: Math.round(GRADES[p.cert][1] * (1.1 + 0.3 * rand()) / 100) * 100 } };
      const belief = s.inspect ? 3000 : last ? last.result.avgValueSold : 6000;
      return { submit: { offer: Math.round(belief * (0.9 + 0.5 * rand()) / 100) * 100 } };
    }
    if (k === 'accept' && p.role === 'seller' && p.offer != null) return { submit: { accept: p.offer >= p.value } };
    return null;
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id]; return { round: h.roundNo, label: h.label, display_name: p.name, role: x.role, grade: x.grade != null ? GRADES[x.grade][0] : '', inspected: x.inspected ?? '', offer: x.offered ?? x.offer ?? '', sold_or_bought: x.sold ?? x.bought ?? '', price: x.price ?? '', gain: x.gain ?? '' }; });
  }
  const game = { id: 'lemons', title: 'Lemons Market', tagline: 'A used-car market where only sellers know the quality. Watch what happens to the good cars, and what inspection does.',
    fields, presets, buildSettings, steps, rules, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    openLabel: 'Open the market', stepLabel: S => ({ inspect: 'End inspections; on to offers', offer: 'End offers; send them to sellers' })[stage(clean(S.settings), S.step)] || 'Next step', closeLabel: () => 'Close the market' };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
