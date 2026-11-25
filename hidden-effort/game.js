/* Hidden Effort: the moral-hazard round after Lemons Market (Feb 9, Ch. 6). Rules: README.md.
   Each round the class splits into lenders and borrowers, paired at random. A borrower needs
   $100 for a project that pays $160 if it succeeds and nothing if it fails. The lender sets the
   interest rate; the borrower sees it and then chooses, hidden from the lender, to work (costs
   the borrower $10; the project succeeds 90% of the time) or slack (free; 50%), or to turn the
   loan down. A borrower repays only if the project succeeds. Treatments: a lender may pay $5 to
   monitor (a slacking borrower is caught and the loan is called back), or the borrower pledges
   $30 of collateral that the lender keeps on a failure. Each pair's luck is one draw, so the
   project's success depends on the choice, not on a fresh coin. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, pct } = ui;
  const LOAN = 100, PAYOFF = 160, EFFORT = 10, P_WORK = 0.9, P_SLACK = 0.5, MAXRATE = 60;
  const fields = [
    { id: 'monitor', label: 'Lenders may monitor', type: 'checkbox' },
    { id: 'monCost', label: 'Monitoring cost ($)', type: 'number', min: 0, max: 30 },
    { id: 'collateral', label: 'Borrower\'s collateral ($)', type: 'number', min: 0, max: 100, step: 5 }
  ];
  const base = { monitor: false, monCost: 5, collateral: 0 };
  const presets = [
    { id: 'hidden', label: 'Hidden effort', note: 'The lender sets the rate; only the borrower knows whether they worked.', values: base },
    { id: 'hidden2', label: 'Hidden effort, new partners', note: 'The same market. Lenders have now seen which rates got effort.', values: base },
    { id: 'monitor', label: 'Lenders can monitor', note: 'A lender may pay $5 to watch the borrower. A borrower caught slacking has the loan called back.', values: Object.assign({}, base, { monitor: true }) },
    { id: 'collateral', label: 'Borrowers post collateral', note: 'Each borrower pledges $30, which the lender keeps if the project fails.', values: Object.assign({}, base, { collateral: 30 }) }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { monitor: !!v.monitor, monCost: n(v.monCost, 5, 0, 30), collateral: n(v.collateral, 0, 0, 100) }; };
  function buildSettings(v) {
    const s = clean(v), f1 = { guess: { type: 'int', label: 'Your guess', min: 0, max: 100 }, rate: { type: 'int', label: 'Interest rate', min: 0, max: MAXRATE, optional: true } };
    if (s.monitor) f1.monitor = { type: 'bool', optional: true };
    s.input = { '1': { required: ['guess'], fields: f1 }, '2': { role: 'borrower', required: ['choice'], fields: { choice: { type: 'choice', in: ['work', 'slack', 'decline'] } } } };
    return s;
  }
  const steps = () => 2;

  /* ---------- the model ---------- */
  /* Payoffs for one loan, given the rate, the choice, monitoring, and the pair's luck draw u in [0, 1). */
  function outcome(s, rate, choice, monitored, u) {
    const R = LOAN * (1 + rate / 100), C = s.collateral, mc = monitored ? s.monCost : 0;
    if (choice === 'decline' || rate == null) return { lender: -mc, borrower: 0, expL: -mc, expB: 0, success: null, called: false };
    if (choice === 'slack' && monitored) return { lender: -mc, borrower: 0, expL: -mc, expB: 0, success: null, called: true };
    const p = choice === 'work' ? P_WORK : P_SLACK, e = choice === 'work' ? EFFORT : 0, ok = u < p;
    const lenderIf = w => (w ? R : Math.min(C, R)) - LOAN - mc, borrowerIf = w => (w ? PAYOFF - R : -C) - e;
    return { lender: lenderIf(ok), borrower: borrowerIf(ok), expL: p * lenderIf(true) + (1 - p) * lenderIf(false), expB: p * borrowerIf(true) + (1 - p) * borrowerIf(false), success: ok, called: false };
  }
  /* The highest rate at which working pays a borrower at least as well as slacking. A monitored
     borrower cannot slack (slacking = $0, as declining), so for one the comparison is with $0. */
  function workCap(s, monitored) {
    const C = s.collateral, R = monitored ? PAYOFF - (EFFORT + (1 - P_WORK) * C) / P_WORK : PAYOFF + C - EFFORT / (P_WORK - P_SLACK);
    return Math.max(0, Math.min(MAXRATE, Math.floor((R / LOAN - 1) * 100 + 1e-9)));
  }
  const luck = (seed, id) => ui.rng((seed ^ ui.hash(id)) >>> 0)();

  function assign({ roster, rng, seed }) {
    const ids = ui.shuffle(roster.map(p => p.id), rng), priv = {}, half = Math.floor(ids.length / 2);
    for (let i = 0; i < half; i++) { priv[ids[i]] = { role: 'lender', partner: ids[half + i] }; priv[ids[half + i]] = { role: 'borrower', partner: ids[i] }; }
    if (ids.length % 2) priv[ids[ids.length - 1]] = { role: 'spare' };
    return { private: priv, pub: { pairs: half, seed } };
  }
  const movesAt = (data, step) => { const o = {}; for (const m of data.moves) if (m.step === step) o[m.player] = m.data; return o; };
  function afterStep({ S, data, closedStep }) {
    const s = clean(S.settings), mv = movesAt(data, closedStep), out = {};
    if (closedStep !== 1) return { private: out };
    for (const [id, p] of Object.entries(data.private)) {
      if (p.role !== 'lender') continue;
      const m = mv[id] || {}, rate = Number.isFinite(m.rate) ? m.rate : null, mon = s.monitor && rate != null && !!m.monitor;
      out[id] = { offered: rate, monitored: mon };
      out[p.partner] = { rate, monitored: mon };
    }
    return { private: out };
  }
  const BINS = [[0, 15], [16, 25], [26, 35], [36, 45], [46, 60]];
  function resolve({ S, data }) {
    const s = clean(S.settings), P = data.private, g1 = movesAt(data, 1), last = movesAt(data, 2), priv = {}, seed = S.pub.seed || 1;
    const bins = BINS.map(() => ({ work: 0, slack: 0, called: 0, decline: 0 })), rates = [], lenderGuess = [], borrowerGuess = [];
    let loans = 0, slack = 0, work = 0, offered = 0, monitored = 0, sumL = 0, sumB = 0, surplus = 0;
    for (const [id, p] of Object.entries(P)) {
      if (g1[id] && Number.isFinite(g1[id].guess)) (p.role === 'lender' ? lenderGuess : borrowerGuess).push(g1[id].guess);
      if (p.role !== 'lender') continue;
      const b = P[p.partner], rate = p.offered ?? b.rate ?? null, mon = !!(p.monitored ?? b.monitored);
      const ch = rate == null ? 'none' : (last[p.partner] && last[p.partner].choice) || 'decline';
      const o = outcome(s, rate, ch === 'none' ? 'decline' : ch, mon, luck(seed, p.partner));
      if (rate != null) { offered++; rates.push(rate); if (mon) monitored++; }
      if (ch === 'work' || ch === 'slack') {
        loans++; if (ch === 'work') work++; else slack++;
        const bin = bins[BINS.findIndex(x => rate >= x[0] && rate <= x[1])];
        if (o.called) bin.called++; else bin[ch]++;
      } else if (rate != null) bins[BINS.findIndex(x => rate >= x[0] && rate <= x[1])].decline++;
      sumL += o.expL; sumB += o.expB; surplus += o.expL + o.expB;
      priv[id] = { rate, monitored: mon, choice: ch, gain: o.lender, exp: o.expL, success: o.success, called: o.called };
      priv[p.partner] = { rate, monitored: mon, choice: ch, gain: o.borrower, exp: o.expB, success: o.success, called: o.called };
    }
    const pairs = S.pub.pairs || 0, best = P_WORK * PAYOFF - EFFORT - LOAN;
    return { private: priv, result: { pairs, offered, loans, work, slack, monitored, bins, avgRate: ui.mean(rates), lenderGuess: ui.mean(lenderGuess), borrowerGuess: ui.mean(borrowerGuess),
      slackShare: loans ? slack / loans : null, avgL: pairs ? sumL / pairs : null, avgB: pairs ? sumB / pairs : null, surplusShare: pairs ? surplus / (pairs * best) : null,
      cap: workCap(s, false), capMon: s.monitor ? workCap(s, true) : null, collateral: s.collateral, monitor: s.monitor } };
  }

  /* ---------- screens ---------- */
  const m0 = x => ui.money(x, 0), m2 = x => ui.money(x, 2);
  function rules(s) {
    s = clean(s);
    return `<ul class="rules"><li>Half of you are <b>lenders</b>, half <b>borrowers</b>, paired at random. A borrower needs <b>$${LOAN}</b> for a project that pays <b>$${PAYOFF}</b> if it succeeds and <b>$0</b> if it fails.</li>
      <li>The lender sets the <b>interest rate</b> (0–${MAXRATE}%)${s.monitor ? ` and may pay <b>$${s.monCost} to monitor</b>` : ''}. The borrower sees the terms, then chooses, <b>hidden from the lender</b>:
        <b>work</b> (costs the borrower $${EFFORT}; succeeds ${P_WORK * 100}% of the time), <b>slack</b> (free; succeeds ${P_SLACK * 100}%), or <b>decline</b> the loan.</li>
      <li>If the project succeeds, the borrower repays $${LOAN} plus interest and keeps the rest. If it fails, the borrower repays nothing${s.collateral ? ` and <b>loses $${s.collateral} of collateral</b> to the lender` : ''}.</li>
      ${s.monitor ? '<li>A monitored borrower who slacks is caught: the loan is called back before the project starts, and both gain nothing beyond the monitoring cost.</li>' : ''}
      <li>Before the terms are set, lenders guess what share of borrowers will slack; borrowers guess the average rate. No rate = no loan; no answer from a borrower = loan declined.</li></ul>`;
  }
  function rateChart(r) {
    const C = { work: 'var(--teal)', slack: '#eb6834', called: '#9b5de5', decline: '#b7c6c2' };
    return ui.bars(r.bins.map((b, i) => ({ label: `${BINS[i][0]}–${BINS[i][1]}%`, mark: r.cap < MAXRATE && r.cap >= BINS[i][0] && r.cap <= BINS[i][1] ? `slacking pays above ${r.cap}%` : '',
      parts: ['work', 'slack', 'called', 'decline'].map(k => ({ n: b[k], color: C[k], title: `${b[k]} ${k}` })) })), { height: 160, aria: 'Borrowers\' choices by the interest rate charged' }) +
      `<div class="legend"><span><i class="sw" style="background:${C.work}"></i>Worked</span><span><i class="sw" style="background:${C.slack}"></i>Slacked</span>${r.monitor ? `<span><i class="sw" style="background:${C.called}"></i>Caught slacking</span>` : ''}<span><i class="sw" style="background:${C.decline}"></i>Declined</span><span>By the rate the lender charged</span></div>`;
  }
  function theory(r) {
    return r.collateral ? `With $${r.collateral} at stake, working beats slacking at ${r.cap >= MAXRATE ? 'every allowed rate' : `rates up to ${r.cap}%`}.`
      : r.monitor ? `Unmonitored, working beats slacking only up to ${r.cap}%; a monitored borrower should work up to ${r.capMon}%.`
      : `Working beats slacking for a borrower only at rates up to <b>${r.cap}%</b>. Above that, a higher rate makes slacking pay.`;
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.pairs != null); if (!done.length) return '';
    return '<h3>Round by round</h3>' + ui.table(['Round', 'Average rate', 'Loans taken', 'Borrowers who slacked', 'Lender gain (expected, avg.)', 'Value created'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, r.avgRate != null ? r.avgRate.toFixed(0) + '%' : '—', `${r.loans} of ${r.pairs}`, `<b>${pct(r.slackShare)}</b>`, m2(r.avgL), pct(r.surplusShare)]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>Lend to a borrower you can't watch</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const what = S.phase === 'closed' ? 'Results in a moment.' : S.pending ? 'Sending the terms to borrowers…' : S.step === 1 ? `Lenders: set your rate${s.monitor ? ' and decide whether to monitor' : ''}. Everyone: make your guess.` : 'Borrowers: work, slack, or decline?';
      return `${head}<h2>${what}</h2>${ui.tiles([['Pairs', S.pub.pairs], ['Answered this step', `${S.nMoved}`, 'hi']], 'two')}${ctx.joinLine()}${comparison(S)}`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">Borrowers who slacked</div><div class="lead">${pct(r.slackShare)}</div>
      <p class="sub">of the ${r.loans} loans taken. Lenders guessed <b>${r.lenderGuess != null ? r.lenderGuess.toFixed(0) + '%' : '—'}</b>; borrowers guessed an average rate of ${r.borrowerGuess != null ? r.borrowerGuess.toFixed(0) + '%' : '—'} (it was ${r.avgRate != null ? r.avgRate.toFixed(0) + '%' : '—'}).</p>
      ${ui.tiles([['Lender gain, expected', m2(r.avgL)], ['Borrower gain, expected', m2(r.avgB)], ['Value created', pct(r.surplusShare)], [r.monitor ? 'Lenders who monitored' : 'Loans offered', r.monitor ? `${r.monitored} of ${r.offered}` : `${r.offered} of ${r.pairs}`]])}
      <p class="note">${theory(r)} If every borrower worked, each loan would create $${(P_WORK * PAYOFF - EFFORT - LOAN).toFixed(0)}.</p></div>
      <div>${rateChart(r)}</div></div>${comparison(S)}`;
  }
  function payoffLines(s, rate, mon) {
    const R = LOAN * (1 + rate / 100);
    return ui.table(['If you…', 'Project succeeds', 'Project fails'], [
      [`<b>work</b> (${P_WORK * 100}% success)`, m0(PAYOFF - R - EFFORT), m0(-s.collateral - EFFORT)],
      mon ? ['<b>slack</b>', 'caught: loan called, $0', ''] : [`<b>slack</b> (${P_SLACK * 100}% success)`, m0(PAYOFF - R), m0(-s.collateral)],
      ['<b>decline</b>', '$0', '$0']]);
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {};
    if (S.phase === 'instructions') return '<h2>Get ready</h2><p class="sub">You will be a lender or a borrower; your role appears when the round opens.</p>';
    if (p.role === 'spare') return '<h2>You are the watcher this round</h2><p class="sub">The class has an odd number, so you sit this one out. Watch the screen: which rates get effort?</p>';
    const mine = me.moves[String(S.step)], lender = p.role === 'lender';
    const who = lender ? '<div class="banner"><strong>You are a lender.</strong>You lend $100. You will not see whether your borrower works.</div>'
      : `<div class="banner"><strong>You are a borrower.</strong>You need $${LOAN} for a project that pays $${PAYOFF} if it succeeds, $0 if it fails.${s.collateral ? ` You pledge $${s.collateral} of collateral.` : ''}</div>`;
    if (S.phase === 'open') {
      if (S.pending) return who + '<h2>Sending the terms…</h2>';
      if (S.step === 1) {
        const guess = `<div class="field"><label for="hGuess">${lender ? 'Guess: what % of borrowers will slack?' : 'Guess: the average rate lenders will charge (%)'}</label><input id="hGuess" type="number" min="0" max="100" inputmode="numeric" value="${mine && mine.guess != null ? mine.guess : ''}"></div>`;
        if (!lender) return who + `<p class="sub">Your lender is setting the terms.</p><div class="row">${guess}<button class="btn primary" id="hSend">Submit</button></div><p class="msg good" id="receipt">${mine ? 'Guess in.' : ''}</p>`;
        return who + `<p class="note">Your borrower repays $100 plus interest if the project succeeds: ${P_WORK * 100}% of the time if they work, ${P_SLACK * 100}% if they slack. If it fails you get ${s.collateral ? `their $${s.collateral} of collateral` : 'nothing'}.</p>
          <div class="row"><div class="field"><label for="hRate">Interest rate (0–${MAXRATE}%)</label><input id="hRate" type="number" min="0" max="${MAXRATE}" inputmode="numeric" value="${mine && mine.rate != null ? mine.rate : ''}"></div>${guess}</div>
          ${s.monitor ? `<label class="check"><input type="checkbox" id="hMon" ${mine && mine.monitor ? 'checked' : ''}> Pay $${s.monCost} to monitor my borrower</label>` : ''}
          <button class="btn primary" id="hSend">Submit</button><p class="msg good" id="receipt">${mine && mine.rate != null ? `Terms in: ${mine.rate}%${mine.monitor ? ', monitored' : ''}. You can change them until the step ends.` : ''}</p>`;
      }
      if (lender) return who + `<p class="sub">You offered ${p.offered != null ? p.offered + '%' : 'no loan'}${p.monitored ? ' and are monitoring' : ''}. Your borrower is deciding.</p>`;
      if (p.rate == null) return who + '<div class="banner warn"><strong>Your lender offered no loan.</strong>Nothing to decide this round.</div>';
      return who + `<h3>Your lender offers ${p.rate}%${p.monitored ? ' and is <b>monitoring you</b>' : ''}</h3><p class="sub">You repay ${m0(LOAN * (1 + p.rate / 100))} if the project succeeds. Your gain:</p>${payoffLines(s, p.rate, p.monitored)}
        <div class="choices">${['work', 'slack', 'decline'].map(c => `<button class="choice" data-c="${c}" aria-pressed="${!!mine && mine.choice === c}"><b>${c[0].toUpperCase() + c.slice(1)}</b></button>`).join('')}</div>
        <p class="msg good" id="receipt">${mine ? `You chose to ${mine.choice}. Your lender will not see it.` : ''}</p>`;
    }
    if (S.phase === 'closed') return who + '<p class="sub">Waiting for the results.</p>';
    const what = p.choice === 'none' ? 'No loan was offered' : p.choice === 'decline' ? 'The loan was declined' : p.called ? 'Caught slacking: the loan was called back'
      : `${lender ? 'Your borrower' : 'You'} ${p.choice === 'work' ? 'worked' : 'slacked'}, and the project ${p.success ? 'succeeded' : 'failed'}`;
    return `<h2>${what}</h2><div class="bigpay">${ui.money(p.gain)}</div><p class="sub">your gain this round (expected, before luck: ${m2(p.exp)}).</p>`;
  }
  function wireStudent(root, ctx) {
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => ctx.submit({ choice: b.dataset.c }));
    const b = root.querySelector('#hSend'); if (!b) return;
    b.onclick = () => {
      const g = root.querySelector('#hGuess').value, r = root.querySelector('#hRate'), mon = root.querySelector('#hMon');
      if (r && r.value === '') return ctx.say('Enter an interest rate.');
      if (g === '') return ctx.say('Enter your guess.');
      const d = { guess: Math.max(0, Math.min(100, Math.round(Number(g)))) };
      if (r) d.rate = Math.max(0, Math.min(MAXRATE, Math.round(Number(r.value))));
      if (mon) d.monitor = mon.checked;
      ctx.submit(d);
    };
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>Step ${S.step}: ${S.step === 1 ? 'lenders set terms' : 'borrowers choose'}</strong>${S.nMoved} answered · ${S.pub.pairs} pairs</div>` : ''; }
  /* Simulated students: lenders spread their rates (narrower after a round); most borrowers pick the better expected payoff. */
  function sim(st, rand) {
    const s = clean(st.settings), p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    if (st.step === 1) {
      if (p.role === 'lender') { const seen = st.history.some(h => h.result && h.result.pairs != null && h.roundNo !== st.roundNo);
        const d = { rate: Math.round(seen ? 20 + rand() * 25 : 8 + rand() * 50), guess: Math.round(10 + rand() * 40) };
        if (s.monitor) d.monitor = d.rate > 30 ? rand() < 0.8 : rand() < 0.3; return { submit: d }; }
      if (p.role === 'borrower') return { submit: { guess: Math.round(15 + rand() * 30) } };
      return null;
    }
    if (p.role !== 'borrower' || p.rate == null) return null;
    const ev = c => outcome(s, p.rate, c, p.monitored, 0.5).expB;
    const best = ['work', 'slack', 'decline'].reduce((a, c) => ev(c) > ev(a) + 1e-9 ? c : a, 'decline');
    return { submit: { choice: rand() < 0.8 ? best : rand() < 0.5 ? 'slack' : 'work' } };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id];
      return { round: h.roundNo, label: h.label, display_name: p.name, role: x.role, rate: x.rate ?? x.offered ?? '', monitored: x.monitored ? 1 : 0, choice: x.choice ?? '',
        success: x.success == null ? '' : x.success ? 1 : 0, gain: x.gain ?? '', expected_gain: x.exp != null ? x.exp.toFixed(2) : '',
        guess: (d.moves.find(m => m.player === p.id && m.step === 1) || { data: {} }).data.guess ?? '' }; });
  }
  const game = { id: 'hidden-effort', title: 'Hidden Effort', tagline: 'Lend $100 to a classmate whose effort you cannot see. What does the interest rate do to their choice?',
    fields, presets, buildSettings, steps, rules, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    openLabel: 'Open: lenders set terms', stepLabel: () => 'End terms; send them to borrowers', closeLabel: () => 'Close the round', model: { outcome, workCap } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
