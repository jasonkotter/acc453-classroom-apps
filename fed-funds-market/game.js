/* Fed Funds Market on the shared classroom toolkit (Mar 23, after 11.4–11.5).
   Every student is a bank. Some start the day with more reserves than they need (lenders),
   some with less (borrowers). Lenders name the lowest rate they will lend at; borrowers the
   highest rate they will pay. One call market clears them at a single rate. A lender that does
   not lend leaves its reserves at the Fed and earns interest on reserves (IORB); a borrower that
   cannot borrow in the market goes to the discount window and pays the discount rate. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc } = ui;
  const fields = [
    { id: 'iorb', label: 'Interest on reserves, IORB (%)', type: 'number', min: 0, max: 10, step: 0.05 },
    { id: 'dw', label: 'Discount rate (%)', type: 'number', min: 0, max: 10, step: 0.05 },
    { id: 'lenderPct', label: 'Banks with extra reserves (%)', type: 'number', min: 5, max: 95, step: 5 }
  ];
  const presets = [
    { id: 'scarce', label: 'Scarce reserves', note: 'Most banks are short. Before 2008 the Fed kept reserves scarce and steered the rate by changing their supply.', values: { iorb: 4.0, dw: 4.5, lenderPct: 35 } },
    { id: 'ample', label: 'Ample reserves', note: 'Most banks have more than they need, as since 2008. Same IORB and discount rate.', values: { iorb: 4.0, dw: 4.5, lenderPct: 75 } },
    { id: 'raise', label: 'Ample reserves, IORB raised', note: 'The Fed raises IORB and the discount rate by a quarter point. Nothing else changes.', values: { iorb: 4.25, dw: 4.75, lenderPct: 75 } }
  ];
  const clean = v => (v = v || {}, { iorb: Math.max(0, Math.min(10, Number(v.iorb) || 0)), dw: Math.max(0, Math.min(10, Number(v.dw) || 0)), lenderPct: Math.max(5, Math.min(95, Number(v.lenderPct) || 50)) });
  function buildSettings(v) { const s = clean(v); s.input = { '*': { required: ['rate'], fields: { rate: { type: 'num', label: 'Your rate', min: 0, max: 10 } } } }; return s; }
  const pctf = x => x == null ? '—' : x.toFixed(2) + '%';
  function rules(s) {
    s = clean(s);
    return `<ul class="rules"><li>You are a bank. Your phone says whether you start the day with <b>extra reserves</b> (you can lend) or a <b>shortfall</b> (you must borrow), and how much, in millions.</li>
      <li><b>Lenders:</b> name the lowest rate you will lend at. Reserves you do not lend stay at the Fed and earn <b>IORB, ${pctf(s.iorb)}</b>.</li>
      <li><b>Borrowers:</b> name the highest rate you will pay. What you cannot borrow in the market you borrow at the Fed's <b>discount window, ${pctf(s.dw)}</b>.</li>
      <li>All orders clear together at <b>one rate</b> for everyone, where lending meets borrowing. Lenders who asked more, and borrowers who offered less, are left out.</li>
      <li>Profit: a lender earns the market rate minus IORB on what it lends; a borrower saves the discount rate minus the market rate on what it borrows.</li>
      <li class="note">The game assumes every lender can earn IORB and every borrower can use the window at the stated rate, with no stigma and enough collateral. Real markets bend both edges: some lenders cannot earn IORB, and banks are reluctant to be seen at the window.</li></ul>`;
  }

  /* Positions are tied to each student for the whole session, so a treatment that changes only
     the Fed's rates is played with the same reserve positions. A higher share of lenders turns
     the next students in the same order into lenders; everyone keeps their amount. */
  function assign({ S, roster, settings }) {
    const s = clean(settings), key = id => ui.hash(S.code + ':' + id), ids = roster.map(p => p.id).sort((a, b) => key(a) - key(b) || (a < b ? -1 : 1));
    const nL = Math.round(ids.length * s.lenderPct / 100), priv = {};
    ids.forEach((id, i) => { const q = 10 * (1 + ui.hash(S.code + ':q:' + id) % 10); priv[id] = { role: i < nL ? 'lender' : 'borrower', q }; });
    const sup = ui.sum(Object.values(priv).filter(p => p.role === 'lender').map(p => p.q)), need = ui.sum(Object.values(priv).filter(p => p.role === 'borrower').map(p => p.q));
    return { private: priv, pub: { supply: sup, need } };
  }
  /* Uniform-price call market: borrowers by bid (high first), lenders by ask (low first); match
     while bid ≥ ask. */
  function clear(orders) {
    const B = orders.filter(o => o.role === 'borrower' && o.rate != null).map(o => ({ ...o, left: o.q })).sort((a, b) => b.rate - a.rate);
    const L = orders.filter(o => o.role === 'lender' && o.rate != null).map(o => ({ ...o, left: o.q })).sort((a, b) => a.rate - b.rate);
    let i = 0, j = 0, vol = 0, lastB = null, lastL = null; const fill = {};
    while (i < B.length && j < L.length && B[i].rate >= L[j].rate - 1e-9) {
      const x = Math.min(B[i].left, L[j].left); B[i].left -= x; L[j].left -= x; vol += x; lastB = B[i].rate; lastL = L[j].rate;
      fill[B[i].id] = (fill[B[i].id] || 0) + x; fill[L[j].id] = (fill[L[j].id] || 0) + x;
      if (B[i].left <= 1e-9) i++; if (L[j].left <= 1e-9) j++;
    }
    // The rate must also leave no one out who would trade at it: at least the best bid left out,
    // at most the best ask left out. Take the middle of what is left.
    const nb = i < B.length ? B[i].rate : -Infinity, na = j < L.length ? L[j].rate : Infinity;
    const lo = Math.max(lastL, nb), hi = Math.min(lastB, na);
    return { rate: vol ? Math.round((lo + hi) / 2 * 1000) / 1000 : null, vol, fill, B, L };
  }
  function resolve({ S, settings, data }) {
    const s = clean(settings), P = data.private, last = {}; for (const m of data.moves) last[m.player] = m.data;
    const orders = Object.entries(P).map(([id, p]) => ({ id, role: p.role, q: p.q, rate: last[id] ? last[id].rate : null }));
    const c = clear(orders), priv = {};
    let window = 0, parked = 0;
    for (const o of orders) {
      const f = c.fill[o.id] || 0;
      if (o.role === 'lender') { parked += o.q - f; priv[o.id] = { filled: f, gain: f * 1e6 * ((c.rate ?? s.iorb) - s.iorb) / 100 / 360 }; }   // dollars for one night: $M × rate gap ÷ 360
      else { window += o.q - f; priv[o.id] = { filled: f, gain: f * 1e6 * (s.dw - (c.rate ?? s.dw)) / 100 / 360 }; }
    }
    const curve = (arr, asc) => { let x = 0; const pts = []; for (const o of arr) { pts.push([x, o.rate]); x += o.q; pts.push([x, o.rate]); } return pts; };
    return { private: priv, result: { rate: c.rate, vol: c.vol, window, parked, supply: S.pub.supply, need: S.pub.need, iorb: s.iorb, dw: s.dw, demand: curve(c.B), supplyCurve: curve(c.L), orders: orders.filter(o => o.rate != null).length } };
  }

  /* ---------- screens ---------- */
  /* The chart as a table: at a few rates, how much lenders would lend and borrowers would borrow. */
  function curveTable(r) {
    const sup = y => Math.max(0, ...r.supplyCurve.filter(p => p[1] <= y + 1e-9).map(p => p[0])), dem = y => Math.max(0, ...r.demand.filter(p => p[1] >= y - 1e-9).map(p => p[0]));
    const g = r.dw - r.iorb, ys = [r.iorb, r.iorb + g / 4, r.iorb + g / 2, r.iorb + 3 * g / 4, r.dw];
    return `<details><summary>The chart as a table</summary>${ui.table(['At a rate of', 'Lenders would lend ($M)', 'Borrowers would borrow ($M)'], ys.map(y => [pctf(y), sup(y), dem(y)]))}<p class="note" style="margin-top:4px">Unfilled shortfalls go to the discount window ($${r.window}M); unlent reserves stay at the Fed ($${r.parked}M).</p></details>`;
  }
  function chart(r) {
    const xmax = Math.max(r.supply, r.need, 10), lo = Math.min(r.iorb - 0.5, ...r.demand.map(p => p[1]), ...r.supplyCurve.map(p => p[1])), hi = Math.max(r.dw + 0.5, ...r.demand.map(p => p[1]), ...r.supplyCurve.map(p => p[1]));
    const flat = (y, c, label) => ({ points: [[0, y], [xmax, y]], color: c, dash: true, label });
    const ser = [{ points: r.supplyCurve.length ? r.supplyCurve : [[0, r.iorb]], color: '#087d75', label: 'Lenders (supply)' }, { points: r.demand.length ? r.demand : [[0, r.dw]], color: '#2a78d6', label: 'Borrowers (demand)' }, flat(r.dw, '#9d3c35', `Discount rate ${pctf(r.dw)}`), flat(r.iorb, '#d6a13b', `IORB ${pctf(r.iorb)}`)];
    if (r.rate != null) ser.push(flat(r.rate, '#152f39', `Market rate ${pctf(r.rate)}`));
    return ui.lines(ser, { xLabel: 'Reserves traded ($ millions)', yLabel: 'Rate (%)', xMin: 0, xMax: xmax, yMin: Math.floor(lo * 4) / 4, yMax: Math.ceil(hi * 4) / 4, yTicks: Array.from({ length: Math.round((Math.ceil(hi * 4) - Math.floor(lo * 4))) + 1 }, (_, k) => Math.floor(lo * 4) / 4 + k / 4), yFmt: y => y.toFixed(2), xFmt: x => Math.round(x), aria: 'Lenders’ and borrowers’ orders, with the market rate between IORB and the discount rate' });
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.iorb != null); if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Extra reserves vs. shortfalls ($M)', 'IORB', 'Discount rate', 'Market rate', 'Traded', 'At the window'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, `${r.supply} vs. ${r.need}`, pctf(r.iorb), pctf(r.dw), `<b>${pctf(r.rate)}</b>`, '$' + r.vol + 'M', '$' + r.window + 'M']; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>The fed funds market</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') return `${head}<h2>${S.phase === 'open' ? 'Orders are open' : 'Orders are closed'}</h2>
      ${ui.tiles([['Orders in', `${S.nMoved} of ${S.nPlayers}`, 'hi'], ['Extra reserves, all lenders', '$' + S.pub.supply + 'M'], ['Shortfalls, all borrowers', '$' + S.pub.need + 'M'], ['IORB / discount rate', `${pctf(s.iorb)} / ${pctf(s.dw)}`]])}
      ${S.phase === 'open' ? `<div class="banner warn"><strong>Predict while you wait</strong>Will the market rate land near IORB (${pctf(s.iorb)}), near the discount rate (${pctf(s.dw)}), or in between? Use the two totals above to say why.</div>` : ''}${ctx.joinLine()}${comparison(S)}`;
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">The market rate</div><div class="lead">${pctf(r.rate)}</div>
      <p class="sub">${r.rate == null ? 'No trades.' : r.rate - r.iorb < 0.1 * (r.dw - r.iorb) ? 'At the floor: with reserves plentiful, lenders compete down to what the Fed pays them.' : r.dw - r.rate < 0.1 * (r.dw - r.iorb) ? 'At the ceiling: with reserves short, borrowers bid up to the discount rate.' : 'Inside the corridor between IORB and the discount rate.'}</p>
      ${ui.tiles([['Traded', '$' + r.vol + 'M'], ['Borrowed at the window', '$' + r.window + 'M'], ['Left at the Fed', '$' + r.parked + 'M'], ['Orders', r.orders]])}</div>
      <div>${chart(r)}${curveTable(r)}</div></div>${comparison(S)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {}, mine = me.moves['1'];
    if (S.phase === 'instructions') { const a = Math.round((s.iorb + 0.1) * 100) / 100, b = Math.round((s.dw - 0.2) * 100) / 100, g = (x, y) => ui.money(50e6 * (x - y) / 100 / 360, 0);
      return `<h2>Get ready</h2>${ui.brief('a reserve position, shown when orders open: extra reserves you could lend, or a shortfall you must cover tonight.', 'one rate: the lowest you will lend at, or the highest you will pay.', `one rate clears the whole market. If you do not trade, a lender earns IORB (${pctf(s.iorb)}) at the Fed and a borrower pays the discount rate (${pctf(s.dw)}).`)}
      <details open><summary>Worked example: one night, $50 million</summary><p class="note" style="margin:6px 0 0"><b>Lender:</b> lending at ${pctf(a)} instead of leaving it at the Fed at ${pctf(s.iorb)} earns $50M × ${(a - s.iorb).toFixed(2)}% ÷ 360 ≈ ${g(a, s.iorb)} more for the night.<br>
      <b>Borrower:</b> borrowing at ${pctf(b)} instead of at the window at ${pctf(s.dw)} saves $50M × ${(s.dw - b).toFixed(2)}% ÷ 360 ≈ ${g(s.dw, b)}.<br>So no lender should lend below IORB, and no borrower should pay above the discount rate.</p></details>`; }
    const who = p.role === 'lender' ? `<div class="banner"><strong>You have $${p.q} million of extra reserves.</strong>Lend them in the market, or leave them at the Fed at ${pctf(s.iorb)}.</div>` : `<div class="banner warn"><strong>You are $${p.q} million short of reserves.</strong>Borrow in the market, or at the discount window at ${pctf(s.dw)}.</div>`;
    if (S.phase === 'open') return who + `<div class="row"><div class="field"><label for="ffRate">${p.role === 'lender' ? 'Lowest rate you will lend at (%)' : 'Highest rate you will pay (%)'}</label><input id="ffRate" type="number" min="0" max="10" step="0.01" inputmode="decimal" value="${mine ? mine.rate : ''}"></div><button class="btn primary" id="ffSend">Submit</button></div><p class="msg good" id="receipt">${mine ? `Order in at ${pctf(mine.rate)}. You can change it until orders close.` : ''}</p>`;
    if (S.phase === 'closed') return who + '<p class="sub">Waiting for the market to clear.</p>';
    const h = S.history.find(x => x.roundNo === S.roundNo), r = h && h.result;
    return `<h2>The market rate: ${pctf(r.rate)}</h2>${who}<p class="sub">You ${p.role === 'lender' ? `lent $${p.filled || 0}M` : `borrowed $${p.filled || 0}M in the market`}${p.role === 'borrower' && p.q - (p.filled || 0) > 0 ? ` and $${p.q - (p.filled || 0)}M at the window` : ''}.</p><div class="bigpay">${ui.money(p.gain, 0)}</div><p class="note">for the night, ${p.role === "lender" ? "beyond what the Fed would have paid you" : "saved against the discount window"}.</p>`;
  }
  function wireStudent(root, ctx) { const b = root.querySelector('#ffSend'); if (b) b.onclick = () => { const v = root.querySelector('#ffRate').value; if (v === '') return ctx.say('Enter a rate.'); ctx.submit({ rate: Math.round(Number(v) * 100) / 100 }); }; }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>${S.nMoved} of ${S.nPlayers} orders</strong>Extra $${S.pub.supply}M vs. short $${S.pub.need}M</div>` : ''; }
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves['1']) return null;
    const s = clean(st.settings), w = s.dw - s.iorb, u = rand();
    return { submit: { rate: Math.round((p.role === 'lender' ? s.iorb + w * 0.6 * u : s.dw - w * 0.6 * u) * 100) / 100 } };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id], m = d.moves.find(y => y.player === p.id); return { round: h.roundNo, label: h.label, iorb: h.result.iorb, discount_rate: h.result.dw, market_rate: h.result.rate, display_name: p.name, role: x.role, amount_m: x.q, order_rate: m ? m.data.rate : '', filled_m: x.filled || 0, gain: x.gain != null ? x.gain.toFixed(0) : '' }; });
  }
  function debrief(S, hh) {
    const r = hh.result, first = S.history.find(x => x.result && x.result.iorb != null);
    const where = r.rate == null ? 'No trades cleared.' : `The rate landed at ${pctf(r.rate)}, between IORB (${pctf(r.iorb)}) and the discount rate (${pctf(r.dw)}).`;
    const raised = first && r.iorb > first.result.iorb + 1e-9;
    return {
      explain: `${where} $${r.vol}M traded, $${r.window}M went to the discount window, and $${r.parked}M stayed at the Fed. Lenders had $${r.supply}M to spare against $${r.need}M of shortfalls. Explain where the rate landed using each side's outside option.`,
      transfer: 'Since 2021 the effective federal funds rate has usually sat a few hundredths of a point below IORB, not at or above it. Who in the real market cannot earn IORB, and why does that let the rate dip below the "floor"?',
      check: raised
        ? { q: 'Reserves stay ample. The Fed raises IORB and the discount rate by a quarter point and does not change the quantity of reserves. In this model, what happens to the market rate?',
            options: [['a', 'It rises about a quarter point'], ['b', 'It stays put, because reserves did not change'], ['c', 'It falls, because borrowing at the window costs more']], answer: 'a',
            why: 'With reserves ample, the rate sits near the floor. Lenders will not lend below what the Fed pays them, so raising IORB lifts the floor and the market rate with it. That is how the Fed moves rates today without changing reserves.',
            trap: 'thinking the Fed must change the quantity of reserves to move the rate. That was true when reserves were scarce; with ample reserves the administered rates do the work.' }
        : { q: 'IORB is 4.00% and the discount rate 4.50%. A bank with extra reserves is offered 3.90% for an overnight loan. In this model, what should it do?',
            options: [['a', 'Decline: leaving the reserves at the Fed pays 4.00%'], ['b', 'Accept: some interest beats none'], ['c', 'Borrow more at the window and lend that too']], answer: 'a',
            why: 'A lender compares the market rate with its outside option. Reserves left at the Fed earn IORB, so lending at 3.90% would lose 0.10% a year. That outside option is why IORB acts as a floor.',
            trap: 'comparing the market rate with zero instead of with what the bank earns by doing nothing.' }
    };
  }

  const game = { id: 'fed-funds', title: 'Fed Funds Market', tagline: 'Banks trade reserves overnight. Watch where the rate lands when reserves are scarce, when they are ample, and when the Fed moves its administered rates.',
    fields, presets, buildSettings, rules, assign, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows, model: { clear },
    openLabel: 'Open orders', closeLabel: () => 'Close orders', debrief,
    nonresponse: 'no order: a lender leaves its reserves at the Fed earning IORB, and a borrower covers its whole shortfall at the discount window.',
    compare: { metric: 'the market rate', note: 'Each student keeps the same reserve amount all session, and when the share of lenders is unchanged, the same role, so a change in the Fed\'s rates is close to a clean comparison. Students may still bid differently after seeing the last round.' } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
