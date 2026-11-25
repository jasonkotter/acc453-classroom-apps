/* Payment Gridlock on the shared classroom toolkit. Rules: README.md.
   Every student is a bank with a settlement balance and payments of $100 owed to other banks;
   every bank is owed the same number. Each hour a bank chooses how many of its waiting payments
   to send. Gross settlement: payments settle one at a time in random order, and a bank that
   sends more than it holds borrows intraday credit from the central bank, paying a fee on its
   peak overdraft each hour. Netting: payments sent in an hour are netted, so only the net
   position must be covered. Payments left waiting cost a delay fee each hour, and payments not
   sent by the end of the day miss the deadline. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, whole, pct } = ui;
  const PAY = 100;

  const fields = [
    { id: 'mode', label: 'Settlement', type: 'select', options: [['gross', 'Gross (one payment at a time)'], ['net', 'Netting (net positions each hour)']] },
    { id: 'hours', label: 'Hours in the day', type: 'number', min: 2, max: 6 },
    { id: 'owe', label: 'Payments each bank owes', type: 'number', min: 1, max: 6 },
    { id: 'bal', label: 'Starting balance ($)', type: 'number', min: 0, max: 1000, step: 50 },
    { id: 'odRate', label: 'Credit fee (% of peak overdraft, per hour)', type: 'number', min: 0, max: 50 },
    { id: 'delay', label: 'Delay cost ($ per waiting payment, per hour)', type: 'number', min: 0, max: 50 },
    { id: 'miss', label: 'Missed-deadline cost ($ per payment)', type: 'number', min: 0, max: 200 },
    { id: 'seed', label: 'Network (same number = same obligations)', type: 'number', min: 1, max: 999 }
  ];
  const base = { hours: 4, owe: 3, bal: 100, odRate: 10, delay: 5, miss: 30, seed: 1 };
  const presets = [
    { id: 'gross', label: 'Gross settlement, costly credit', note: 'Each payment needs the money now. Sending more than you hold costs 10% of your peak overdraft each hour; waiting costs $5 a payment an hour.', values: Object.assign({ mode: 'gross' }, base) },
    { id: 'net', label: 'Same payments, netted each hour', note: 'The same obligations and balances. Payments sent in an hour are netted: you need money only for what you owe beyond what you receive.', values: Object.assign({ mode: 'net' }, base) },
    { id: 'free', label: 'Gross, free daylight credit', note: 'Back to gross settlement, but the central bank lends intraday for free (the credit fee is 0).', values: Object.assign({ mode: 'gross' }, base, { odRate: 0 }) }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { mode: v.mode === 'net' ? 'net' : 'gross', hours: Math.round(n(v.hours, 4, 2, 6)), owe: Math.round(n(v.owe, 3, 1, 6)), bal: n(v.bal, 100, 0, 1000), odRate: n(v.odRate, 10, 0, 50), delay: n(v.delay, 5, 0, 50), miss: n(v.miss, 30, 0, 200), seed: Math.round(n(v.seed, 1, 1, 999)) }; };
  function buildSettings(v) {
    const s = clean(v), send = { type: 'int', label: 'Payments to send', min: 0, maxPriv: 'nPend' };
    s.input = { '1': { required: ['send', 'predict'], fields: { send, predict: { type: 'int', label: 'Your prediction', min: 0, max: 100 } } }, '*': { required: ['send'], fields: { send } } };
    return s;
  }
  const steps = s => clean(s).hours;

  function rules(s) {
    s = clean(s);
    return `<ul class="rules">
      <li>You are a bank. You start with a <b>${whole(s.bal)} balance</b> at the central bank and owe <b>${s.owe} payments of ${whole(PAY)}</b> to other banks. Other banks owe you ${s.owe} payments too.</li>
      <li>The day has ${s.hours} hours. Each hour, choose how many of your waiting payments to <b>send</b>.</li>
      <li>${s.mode === 'gross'
        ? `<b>Gross settlement:</b> payments sent this hour settle one at a time, in random order. If you send more than you hold, the central bank lends you the difference${s.odRate ? `: you pay <b>${s.odRate}% of your largest overdraft</b> in each hour` : ' <b>for free</b>'}.`
        : `<b>Netting:</b> payments sent this hour are netted. You need money only for what you send beyond what you receive in the same hour${s.odRate ? `; a net overdraft at the end of the hour costs ${s.odRate}% of it` : ''}.`}</li>
      <li>Every payment still waiting at the end of an hour costs <b>${whole(s.delay)}</b> (your customers are waiting). A payment not sent by the end of the day costs <b>${whole(s.miss)}</b>.</li>
      <li>Your score is your total cost. Lower is better. In hour 1, also predict what share of all payments will be done by the end of hour ${Math.min(2, s.hours)}.</li></ul>`;
  }

  /* ---------- the model ---------- */
  /* The network: banks in a shuffled ring; bank j's k-th payment goes d_k places along, so every
     bank owes and is owed exactly `owe` payments, to and from different banks. */
  function network(ids, s) {
    const rng = ui.rng(s.seed * 7919 + ids.length), order = ui.shuffle(ids, rng), n = order.length, owe = {};
    const offsets = ui.shuffle(Array.from({ length: Math.max(0, n - 1) }, (_, i) => i + 1), rng).slice(0, Math.min(s.owe, n - 1));
    order.forEach((id, j) => { owe[id] = offsets.map(d => order[(j + d) % n]); });
    return owe;
  }
  function hour(priv, sends, s, rand) {
    const ids = Object.keys(priv), start = {}, low = {}, pays = [];
    for (const id of ids) {
      const p = priv[id], k = Math.max(0, Math.min(p.owe.length, Math.round(sends[id] || 0)));
      start[id] = p.bal; low[id] = p.bal;
      for (const to of p.owe.splice(0, k)) pays.push([id, to]);
      p.sentNow = k; p.recvNow = 0;
    }
    if (s.mode === 'gross') {
      for (const [from, to] of ui.shuffle(pays, rand)) { priv[from].bal -= PAY; low[from] = Math.min(low[from], priv[from].bal); if (priv[to]) { priv[to].bal += PAY; priv[to].recvNow++; } }
    } else {
      for (const [from, to] of pays) { priv[from].bal -= PAY; if (priv[to]) { priv[to].bal += PAY; priv[to].recvNow++; } }
      for (const id of ids) low[id] = Math.min(start[id], priv[id].bal);
    }
    const t = { sent: pays.length, credit: 0, fees: 0, delay: 0, waiting: 0, idle: 0 };
    for (const id of ids) {
      const p = priv[id], od = Math.max(0, -low[id]), fee = od * s.odRate / 100, wait = p.owe.length;
      p.fee = (p.fee || 0) + fee; p.delayCost = (p.delayCost || 0) + wait * s.delay; p.sent = (p.sent || 0) + p.sentNow; p.recv = (p.recv || 0) + p.recvNow; p.nPend = wait;
      p.lastFee = fee; p.peak = Math.max(p.peak || 0, od);
      t.credit += od; t.fees += fee; t.delay += wait * s.delay; t.waiting += wait; if (wait > 0 && p.bal > 0) t.idle += p.bal;
    }
    return t;
  }
  const cost = (p, s) => (p.fee || 0) + (p.delayCost || 0) + (p.nPend || 0) * s.miss * (p.final ? 1 : 0);

  function assign({ roster, settings, seed }) {
    const s = clean(settings), ids = roster.map(p => p.id).sort(), owe = network(ids, s), priv = {};
    for (const id of ids) priv[id] = { bal: s.bal, owe: owe[id], nPend: owe[id].length, sent: 0, recv: 0, fee: 0, delayCost: 0 };
    const total = ui.sum(ids.map(id => owe[id].length));
    return { private: priv, pub: { seed, n: ids.length, total, hist: [] } };
  }
  function runHour(S, data, st) {
    const s = clean(S.settings), priv = JSON.parse(JSON.stringify(data.private)), sends = {};
    for (const m of data.moves) if (m.step === st) sends[m.player] = m.data.send;
    const t = hour(priv, sends, s, ui.rng(ui.hash(S.pub.seed + ':' + st)));
    const prev = S.pub.hist[S.pub.hist.length - 1] || { done: 0, fees: 0, delay: 0, credit: 0 };
    const h = { hour: st, sent: t.sent, done: prev.done + t.sent, waiting: t.waiting, credit: t.credit, idle: t.idle, fees: prev.fees + t.fees, delay: prev.delay + t.delay, peakCredit: Math.max(prev.peakCredit || 0, t.credit) };
    return { priv, hist: S.pub.hist.concat([h]) };
  }
  function afterStep({ S, data, closedStep }) { const r = runHour(S, data, closedStep); return { pub: { hist: r.hist }, private: r.priv }; }
  function resolve({ S, data }) {
    const s = clean(S.settings), r = runHour(S, data, S.step), T = S.pub.total || 1, priv = {};
    for (const id in r.priv) { r.priv[id].final = true; priv[id] = Object.assign(r.priv[id], { cost: cost(r.priv[id], s), missed: r.priv[id].nPend, nPend: 0 }); }
    const at = k => { const h = r.hist[Math.min(k, r.hist.length) - 1]; return h ? h.done / T : 0; };
    const preds = data.moves.filter(m => m.step === 1 && Number.isFinite(m.data.predict)).map(m => m.data.predict / 100);
    const costs = Object.values(priv).map(p => p.cost), last = r.hist[r.hist.length - 1];
    return { private: priv, pub: { hist: r.hist }, result: { mode: s.mode, odRate: s.odRate, T, hours: r.hist.length, done1: at(1), done2: at(2), doneEnd: last.done / T, missed: T - last.done,
      fees: last.fees, delay: last.delay, missCost: (T - last.done) * s.miss, total: ui.sum(costs), medCost: ui.median(costs), peakCredit: last.peakCredit, predict: ui.mean(preds), predHour: Math.min(2, s.hours) } };
  }

  /* ---------- screens ---------- */
  const modeName = s => s.mode === 'gross' ? (s.odRate ? 'Gross, costly credit' : 'Gross, free credit') : 'Netting';
  function chart(S) {
    const s = clean(S.settings), T = S.pub.total || 1;
    const series = [{ points: [[0, 0]].concat((S.pub.hist || []).map(h => [h.hour, h.done / T * 100])), color: 'var(--teal)', dots: true, label: `This round: ${modeName(s)}` }];
    for (const h of S.history.filter(x => x.roundNo !== S.roundNo && x.pub && x.pub.hist && x.pub.total).slice(-2))
      series.push({ points: [[0, 0]].concat(h.pub.hist.map(x => [x.hour, x.done / h.pub.total * 100])), color: '#9aa5a8', dash: true, label: `Round ${h.roundNo}: ${modeName(clean(h.settings))}` });
    return ui.lines(series, { xLabel: 'Hour', yLabel: 'Payments done (%)', xMin: 0, xMax: s.hours, yMin: 0, yMax: 100, xFmt: x => Math.round(x), yFmt: y => Math.round(y) + '%', xTicks: Array.from({ length: s.hours + 1 }, (_, i) => i), aria: 'Share of payments completed by hour' });
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.T);
    if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Done by hour 1', 'By hour 2', 'By the end', 'Peak credit used', 'Total cost'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, pct(r.done1), pct(r.done2), `<b>${pct(r.doneEnd)}</b>`, whole(r.peakCredit), whole(r.total)]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>Move the money</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    const T = S.pub.total || 1, hist = S.pub.hist || [], last = hist[hist.length - 1];
    const tiles = ui.tiles([['Payments done', `${last ? last.done : 0} of ${T}`, 'hi'], ['Waiting', last ? last.waiting : T], ['Credit used last hour (sum of each bank\'s peak)', whole(last ? last.credit : 0)], ['Idle money at the end of last hour, at banks with payments waiting', whole(last ? last.idle : 0)]]);
    if (S.phase === 'open' || S.phase === 'closed') {
      return `${head}<h2>${S.phase === 'open' ? (S.pending ? 'Settling…' : `Hour ${S.step} of ${s.hours}: send or hold?`) : 'The day is over'}</h2>${tiles}
        <div class="split"><div><div class="banner warn"><strong>${S.nMoved} of ${S.nPlayers} banks have decided</strong>${modeName(s)}. No answer = hold everything this hour.</div>${ctx.joinLine()}</div><div>${chart(S)}</div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">${modeName(s)}</div><div class="lead">${pct(r.done2)}</div>
      <p class="sub">of payments done by hour ${r.predHour}${r.predict != null ? ` (the class predicted ${pct(r.predict)})` : ''}. By the end of the day: ${pct(r.doneEnd)}${r.missed ? `; <b>${r.missed} missed the deadline</b>` : ''}.</p>
      ${ui.tiles([['Peak intraday credit', whole(r.peakCredit)], ['Credit fees', whole(r.fees)], ['Delay costs', whole(r.delay)], ['Missed-deadline costs', whole(r.missCost)]])}
      <p class="note">Every bank was owed exactly as much as it owed. The money was there; the question was who would send first.</p></div>
      <div>${chart(S)}</div></div>${comparison(S)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {};
    if (S.phase === 'instructions') return `<h2>Get ready</h2>${ui.brief(`a ${whole(s.bal)} balance and ${s.owe} payments of ${whole(PAY)} to send. Other banks owe you ${s.owe} payments too.`, `each hour, how many of your waiting payments to send.${S.step <= 1 ? ' In hour 1, also a prediction.' : ''}`, s.mode === 'gross' ? `payments settle one at a time. Going below zero means borrowing from the central bank${s.odRate ? ` at ${s.odRate}% of your largest overdraft that hour` : ' for free'}. Waiting costs ${whole(s.delay)} a payment an hour.` : `payments sent in the same hour are netted. Waiting costs ${whole(s.delay)} a payment an hour.`)}
      <details open><summary>Worked example: three banks in a circle</summary><p class="note" style="margin:6px 0 0">A owes B $100, B owes C $100, C owes A $100, and each starts with $0. If everyone waits for money to arrive, nothing moves and each pays the delay cost. If A sends first, it goes $100 below zero${s.mode === 'gross' && s.odRate ? ` (a ${whole(PAY * s.odRate / 100)} credit fee)` : ''}; B receives $100 and can pay C; C can then pay A, which brings A back to zero. One bank going first moved all three payments.</p></details>`;
    const book = ui.tiles([['Your balance', whole(p.bal)], ['Payments waiting', p.nPend ?? 0], ['Received so far', `${p.recv || 0} of ${s.owe}`], ['Your costs so far', whole((p.fee || 0) + (p.delayCost || 0))]]);
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Settling the hour…</h2>' + book;
      const mine = me.moves[String(S.step)], n = p.nPend || 0;
      const lastLine = S.step > 1 ? `<p class="note">Last hour you sent ${p.sentNow || 0} and received ${p.recvNow || 0}${p.lastFee ? `; credit fee ${whole(p.lastFee)}` : ''}.</p>` : '';
      const pred = S.step === 1 ? `<div class="field"><label for="gPred">Predict: % of all payments done by the end of hour ${Math.min(2, s.hours)}</label><input id="gPred" type="number" min="0" max="100" inputmode="numeric" value="${mine && mine.predict != null ? mine.predict : ''}"></div>` : '';
      const btns = n > 0 ? Array.from({ length: n + 1 }, (_, k) => `<button class="btn ${mine && mine.send === k ? 'primary' : 'secondary'}" data-send="${k}">${k === 0 ? 'Hold all' : k === n ? `Send all ${n}` : `Send ${k}`}</button>`).join('') : '';
      return `<h2>Hour ${S.step} of ${s.hours}</h2>${book}${lastLine}${pred}
        ${n > 0 ? `<h3>How many payments do you send this hour?</h3><div class="actions">${btns}</div>` : '<p class="sub">All your payments are sent. Wait for the day to end.</p>'}
        <p class="msg good" id="receipt">${mine ? `You are sending ${mine.send}. You can change it until the hour ends.` : ''}</p>`;
    }
    if (S.phase === 'closed') return '<h2>The day is over</h2>' + book;
    return `<h2>Your day</h2><div class="bigpay">${whole(p.cost)}</div><p class="sub">total cost: credit fees ${whole(p.fee)}, delay ${whole(p.delayCost)}${p.missed ? `, missed deadline ${whole(p.missed * s.miss)} (${p.missed} payment${p.missed === 1 ? '' : 's'})` : ''}. You received ${p.recv} of ${s.owe} payments owed to you.</p>`;
  }
  function wireStudent(root, ctx) {
    root.querySelectorAll('[data-send]').forEach(b => b.onclick = () => {
      const d = { send: Number(b.dataset.send) }, pr = root.querySelector('#gPred');
      if (pr) { if (pr.value === '') return ctx.say('Enter your prediction first.'); d.predict = Math.max(0, Math.min(100, Math.round(Number(pr.value)))); }
      ctx.submit(d);
    });
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>Hour ${S.step} · ${S.nMoved} of ${S.nPlayers} decided</strong>No answer = hold everything this hour.</div>` : ''; }
  /* Simulated banks: under costly gross settlement most send only what their balance covers;
     with netting or free credit most send everything. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)] || !p.nPend) return null;
    const s = clean(st.settings), n = p.nPend, u = rand();
    let k = (s.mode === 'net' || s.odRate === 0) ? (u < 0.85 ? n : Math.ceil(n / 2)) : (u < 0.65 ? Math.min(n, Math.max(0, Math.floor(p.bal / PAY))) : u < 0.85 ? n : 0);
    const d = { send: k }; if (st.step === 1) d.predict = Math.floor(30 + rand() * 60);
    return { submit: d };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id];
      return { round: h.roundNo, label: h.label, mode: h.settings.mode, credit_fee_pct: h.settings.odRate, display_name: p.name, sends: d.moves.filter(m => m.player === p.id).map(m => `${m.step}:${m.data.send}`).join(' '),
        predict: (d.moves.find(m => m.player === p.id && m.step === 1) || { data: {} }).data.predict ?? '', received: x.recv, missed: x.missed ?? '', credit_fees: (x.fee || 0).toFixed(2), delay: x.delayCost, total_cost: x.cost != null ? x.cost.toFixed(2) : '' }; });
  }
  function debrief(S, hh) {
    const r = hh.result, s = clean(hh.settings);
    return {
      explain: `${pct(r.done2)} of payments were done by hour ${r.predHour}${r.predict != null ? ` (the class predicted ${pct(r.predict)})` : ''} and ${pct(r.doneEnd)} by the end of the day. Peak intraday credit was ${whole(r.peakCredit)}. Every bank was owed exactly what it owed, so explain how one bank's waiting made the next bank wait${s.mode === 'gross' && s.odRate ? ', and why the credit fee made waiting look sensible to each bank' : ''}.`,
      transfer: s.mode === 'net' ? 'Netting needed far less money during the day. What happens if one bank fails before the end-of-hour settlement: whose payments unwind, and who is left short? Why does the Fed\'s own system, Fedwire, settle each payment in full as it goes?'
        : 'The Fed lends intraday credit to banks and charges a fee for large overdrafts. In March 2020 payments surged and banks hoarded cash. What could a central bank do to keep payments moving, and what risk would it take on?',
      check: { q: 'Three banks each start with $0. A owes B $100, B owes C $100, and C owes A $100. Payments settle one at a time. If A sends first by borrowing $100 of intraday credit, how much credit does the system need to make all three payments?',
        options: [['a', '$100: A\'s, and only until C pays A'], ['b', '$300: one overdraft for each bank'], ['c', '$0: the payments cannot settle without money'], ['d', 'They cannot all be made']], answer: 'a',
        why: 'Once A\'s payment lands, B can pay C, and C can pay A, which repays A\'s overdraft. $100 of credit settles $300 of payments. If everyone waits for someone else, nothing moves: gridlock. With netting, each bank\'s net position is zero, so no money is needed at all.',
        trap: 'thinking each payment needs its own money. The same balance can settle a chain of payments if someone goes first.' }
    };
  }

  const game = { id: 'gridlock', title: 'Payment Gridlock', tagline: 'Every bank owes as much as it is owed. Will the money move, or will everyone wait for someone else to pay first?',
    fields, presets, buildSettings, rules, steps, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    debrief, nonresponse: 'the bank holds all its payments this hour; they keep waiting and the delay cost applies.',
    compare: { metric: 'the share of payments done by hour 2', note: 'Every round uses the same network of obligations and the same starting balances; only the settlement rule or the credit fee changes. Students have also learned from earlier rounds.' },
    openLabel: 'Open hour 1', stepLabel: S => `End hour ${S.step}; settle`, closeLabel: S => S.step >= steps(S.settings) ? 'End the last hour' : 'End the day now', model: { network, hour } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
