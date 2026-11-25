/* Loan Officer on the shared classroom toolkit (Feb 18, Ch. 7). Rules: README.md.
   Every student runs a bank with $100 of one-year loans, $90 of deposits at 2%, and $10 of equity.
   Each year the bank chooses the share of its loans made to risky borrowers (10% interest) rather
   than safe ones (5%, 1% default), and sets its allowance: the share of its loans it expects to
   lose. The default rate on risky loans is set by the whole class's lending, by a published rule:
     risky default rate = base + boom × (last year's class risky share − 30%) / 10
                               − refi × (this year's class risky share − 30%) / 10   (at least 1%)
   Easy credit this year lets weak borrowers refinance, so fewer default now; last year's easy
   credit shows up as defaults this year. Losses are 60% of a defaulted loan. After the last
   year every bank's book rolls over once more, unchanged, so the last year's lending is tested
   too. A bank whose equity falls below zero fails. The reveal shows each bank's four Ch. 7
   ratios, the class's allowances against its charge-offs, and the share that would have been
   best for the class if every bank had chosen it. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, money, pct } = ui;
  const SAFE_RATE = 5, SAFE_DEF = 1, RISKY_RATE = 10, LGD = 0.6, DEP = 90, DEP_RATE = 2, NORM = 30, BASE = 5;

  const fields = [
    { id: 'years', label: 'Years of lending', type: 'number', min: 2, max: 5 },
    { id: 'boom', label: 'Boom effect (points of default per 10 points of last year\'s class risky share above 30%)', type: 'number', min: 0, max: 8, step: 0.5 },
    { id: 'refi', label: 'Refinancing effect (points per 10 points of this year\'s share above 30%)', type: 'number', min: 0, max: 3, step: 0.5 },
    { id: 'cap', label: 'Regulator\'s cap on the risky share (%; 100 = no cap)', type: 'number', min: 10, max: 100, step: 10 },
    { id: 'recYear', label: 'Recession in year (0 = none)', type: 'number', min: 0, max: 6 },
    { id: 'recSize', label: 'Recession adds to the risky default rate (points)', type: 'number', min: 0, max: 15 },
    { id: 'eq0', label: 'Starting equity ($)', type: 'number', min: 4, max: 20 }
  ];
  const base = { years: 4, boom: 4, refi: 1, cap: 100, recYear: 0, recSize: 6, eq0: 10 };
  const presets = [
    { id: 'cycle', label: 'Lending moves the economy', note: 'Four years. The class\'s risky lending sets the risky default rate by the published rule.', values: base },
    { id: 'cap', label: 'A regulator caps risky lending at 40%', note: 'The same economy and rule, but no bank may put more than 40% of its loans into risky borrowers.', values: Object.assign({}, base, { cap: 40 }) },
    { id: 'recession', label: 'A recession arrives in year 3', note: 'As round 1, plus a recession in year 3 that adds 6 points to the risky default rate. Banks learn it when year 3 opens.', values: Object.assign({}, base, { recYear: 3 }) }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { years: Math.round(n(v.years, 4, 2, 5)), boom: n(v.boom, 4, 0, 8), refi: n(v.refi, 1, 0, 3), cap: Math.round(n(v.cap, 100, 10, 100)), recYear: Math.round(n(v.recYear, 0, 0, 6)), recSize: n(v.recSize, 6, 0, 15), eq0: n(v.eq0, 10, 4, 20) }; };
  function buildSettings(v) {
    const s = clean(v);
    s.input = { '*': { required: ['risky', 'allow'], fields: {
      risky: { type: 'int', label: 'Risky share of your loans (%)', min: 0, max: s.cap },
      allow: { type: 'num', label: 'Your allowance (% of loans)', min: 0, max: 40 } } } };
    return s;
  }
  const steps = s => clean(s).years;

  /* ---------- the model ---------- */
  const baseFor = (t, s) => BASE + (t === s.recYear ? s.recSize : 0);
  const defRate = (t, Rprev, Rnow, s) => Math.max(1, baseFor(t, s) + s.boom * (Rprev - NORM) / 10 - s.refi * (Rnow - NORM) / 10);
  /* One bank's year, per $100 of loans: income, loans that stopped paying, and net charge-offs. */
  function year(r, D) {
    const w = r / 100, noncur = (1 - w) * SAFE_DEF + w * D, nco = LGD * noncur;
    const interest = (1 - w) * SAFE_RATE + w * RISKY_RATE;
    return { interest, noncur, nco, income: interest - nco - DEP * DEP_RATE / 100 };
  }
  const riskyNet = D => RISKY_RATE - LGD * D, safeNet = SAFE_RATE - LGD * SAFE_DEF;
  /* Play years 1..upTo. moves[t][id] = {risky, allow}. No answer = last year's choices (year 1: 30% and 3%).
     With roll = true, a last year (upTo + 1) rolls every surviving bank's book over unchanged. */
  function simulate(ids, moves, s, upTo, roll) {
    const B = {}, path = [];
    for (const id of ids) B[id] = { eq: s.eq0, r: Math.min(NORM, s.cap), a: 3, failed: false, failYear: null, hist: [] };
    let Rprev = NORM;
    const last = roll ? upTo + 1 : upTo;
    for (let t = 1; t <= last; t++) {
      const act = ids.filter(id => !B[id].failed), rolled = t > upTo, mv = moves[t] || {};
      if (!act.length) break;
      for (const id of act) {
        const b = B[id], m = rolled ? null : mv[id];
        if (m && Number.isFinite(m.risky)) b.r = Math.max(0, Math.min(s.cap, Math.round(m.risky)));
        if (m && Number.isFinite(m.allow)) b.a = Math.max(0, Math.min(40, m.allow));
        b.answered = !!m || rolled;
      }
      const Rnow = ui.mean(act.map(id => B[id].r)), D = defRate(t, Rprev, Rnow, s);
      let fails = 0, allowSum = 0, ncoSum = 0, eqs = [];
      for (const id of act) {
        const b = B[id], y = year(b.r, D);
        b.eq += y.income;
        allowSum += b.a; ncoSum += y.nco;
        b.hist.push({ t, r: b.r, a: b.a, D, noncur: y.noncur, nco: y.nco, income: y.income, eq: b.eq, rolled });
        if (b.eq < 0) { b.failed = true; b.failYear = t; fails++; }
      }
      for (const id of ids) if (!B[id].failed) eqs.push(B[id].eq);
      path.push({ t, rolled, R: Rnow, D, base: baseFor(t, s), recession: t === s.recYear, allow: allowSum / act.length, nco: ncoSum / act.length,
        failed: ids.filter(id => B[id].failed).length, newFails: fails, medEq: ui.median(eqs), n: act.length,
        noAnswer: rolled ? 0 : act.filter(id => !mv[id]).length });
      Rprev = Rnow;
    }
    return { B, path };
  }
  /* The share that, chosen by every bank in every year, leaves the class with the most equity. */
  function bestUniform(s, upTo) {
    let best = null;
    for (let R = 0; R <= s.cap; R += 10) {
      const mv = {}; for (let t = 1; t <= upTo; t++) mv[t] = { x: { risky: R, allow: 0 } };
      const run = simulate(['x'], mv, s, upTo, true), eq = run.B.x.eq;
      if (!best || eq > best.eq + 1e-9) best = { R, eq, failed: run.B.x.failed };
    }
    return best;
  }
  const movesOf = data => { const o = {}; for (const m of data.moves) (o[m.step] = o[m.step] || {})[m.player] = m.data; return o; };
  const privOf = b => ({ eq: b.eq, r: b.r, a: b.a, failed: b.failed, failYear: b.failYear, last: b.hist[b.hist.length - 1] || null });

  function assign({ roster, settings, seed }) {
    const s = clean(settings), priv = {};
    for (const p of roster) priv[p.id] = { eq: s.eq0, r: Math.min(NORM, s.cap), a: 3, failed: false, last: null };
    return { private: priv, pub: { seed, n: roster.length, path: [] } };
  }
  function afterStep({ S, data, closedStep }) {
    const s = clean(S.settings), ids = Object.keys(data.private).sort(), run = simulate(ids, movesOf(data), s, closedStep, false), priv = {};
    for (const id of ids) priv[id] = privOf(run.B[id]);
    return { pub: { path: run.path }, private: priv };
  }
  function resolve({ S, data }) {
    const s = clean(S.settings), ids = Object.keys(data.private).sort(), run = simulate(ids, movesOf(data), s, S.step, true), priv = {};
    const best = bestUniform(s, S.step);
    for (const id of ids) priv[id] = Object.assign(privOf(run.B[id]), { hist: run.B[id].hist, best });
    const eqs = ids.map(id => run.B[id].eq), played = run.path.filter(x => !x.rolled);
    return { private: priv, pub: { path: run.path }, result: { n: ids.length, years: S.step, failed: ids.filter(id => run.B[id].failed).length,
      meanEq: ui.mean(eqs), meanR: ui.mean(played.map(x => x.R)), peakD: Math.max(...run.path.map(x => x.D)), best, cap: s.cap, recYear: s.recYear,
      underReserved: run.path.filter(x => x.nco > x.allow + 0.5).length } };
  }

  /* ---------- screens ---------- */
  const p1 = x => x == null || !isFinite(x) ? '—' : x.toFixed(1) + '%';
  const yearName = x => x.rolled ? 'Roll-over' : `Year ${x.t}`;
  function rules(s) {
    return `<ul class="rules">
      <li>You run a bank: <b>$100 of one-year loans</b>, funded by $${DEP} of deposits at ${DEP_RATE}% and <b>$${s.eq0} of equity</b>. Each year you choose what share of your loans goes to <b>risky borrowers</b>${s.cap < 100 ? ` (the regulator caps it at <b>${s.cap}%</b>)` : ''}.</li>
      <li><b>Safe loans</b> pay ${SAFE_RATE}% and ${SAFE_DEF}% of them default. <b>Risky loans</b> pay ${RISKY_RATE}%; how many default depends on <b>everyone's</b> lending. A default loses ${LGD * 100}% of the loan.</li>
      <li><b>The rule:</b> risky default rate = ${BASE}%${s.boom ? ` <b>+ ${s.boom}</b> points for every 10 points that <b>last year's</b> class-average risky share was above ${NORM}%` : ''}${s.refi ? ` <b>− ${s.refi}</b> for every 10 points that <b>this year's</b> is above ${NORM}%` : ''} (never below 1%). Easy credit lets weak borrowers refinance now and default later.</li>
      <li>Also set your <b>allowance</b>: the share of your loans you expect to charge off this year. It is an estimate: it does not change your losses or your equity, and it is compared with what you actually charge off. After the last year, every bank's loans <b>roll over once more</b> unchanged. Equity below zero: <b>your bank fails</b>.</li>
      <li class="note">The default rule is built for this game, with its one-year lag chosen to show a credit cycle; it is not an estimate of real default rates.</li></ul>`;
  }
  function chart(S, s) {
    const path = S.pub.path || [];
    if (!path.length) return '<p class="note">The chart starts after year 1.</p>';
    const xMax = Math.max(s.years + 1, ...path.map(x => x.t));
    const series = [{ points: path.map(x => [x.t, x.R]), color: 'var(--teal)', dots: true, label: 'Class risky share (%)' },
      { points: path.map(x => [x.t, x.D]), color: '#eb6834', dots: true, label: 'Risky default rate (%)' }];
    const yMax = Math.max(40, Math.ceil(Math.max(...path.map(x => Math.max(x.R, x.D))) / 20) * 20);
    return ui.lines(series, { xLabel: 'Year', yLabel: 'Percent', xMin: 1, xMax, yMin: 0, yMax, xTicks: Array.from({ length: xMax }, (_, i) => i + 1),
      yTicks: Array.from({ length: yMax / 20 + 1 }, (_, i) => i * 20), xFmt: x => Math.round(x), yFmt: y => Math.round(y), aria: 'Class risky share and the risky default rate by year' });
  }
  function yearTable(path) {
    return ui.table(['Year', 'Class risky share', 'Risky default rate', 'Avg. allowance', 'Avg. net charge-offs', 'Banks failed'],
      path.map(x => [yearName(x) + (x.recession ? ' · recession' : ''), p1(x.R), `<b>${p1(x.D)}</b>`, p1(x.allow), p1(x.nco), `${x.failed}`]));
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.n);
    if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Avg. risky share', 'Peak default rate', 'Banks failed', 'Avg. final equity'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, p1(r.meanR), p1(r.peakD), `<b>${r.failed} of ${r.n}</b>`, money(r.meanEq, 2)]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`, path = S.pub.path || [], last = path[path.length - 1];
    if (S.phase === 'instructions') return `${head}<h2>Every bank's loans, one economy</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const tiles = ui.tiles([['Year', S.phase === 'open' ? `${S.step} of ${s.years}` : 'done', 'hi'], ['Last year: class risky share', last ? p1(last.R) : '—'],
        ['Last year: risky default rate', last ? p1(last.D) : '—'], ['Banks failed', `${last ? last.failed : 0} of ${S.pub.n}`]]);
      const rec = S.phase === 'open' && S.step === s.recYear ? `<div class="banner bad"><strong>A recession arrives this year</strong>It adds ${s.recSize} points to the risky default rate.</div>` : '';
      return `${head}<h2>${S.phase === 'open' ? (S.pending ? 'Counting the year\'s losses…' : `Year ${S.step}: set your risky share and your allowance`) : 'Lending is over; the loans roll over once more'}</h2>${tiles}${rec}
        <div class="split"><div><div class="banner warn"><strong>${S.nMoved} of ${S.nPlayers} banks have decided</strong>No answer = last year's choices (year 1: ${Math.min(NORM, s.cap)}% risky, 3% allowance).</div>${ctx.joinLine()}</div><div>${chart(S, s)}</div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result, b = r.best;
    return `${head}<div class="split"><div><div class="lead">${r.failed} of ${r.n} banks failed</div>
      <p class="sub">The class put <b>${p1(r.meanR)}</b> of its loans into risky borrowers on average, and the risky default rate peaked at <b>${p1(r.peakD)}</b>.
      If every bank had chosen <b>${b.R}%</b> every year, every bank would have ended with <b>${money(b.eq, 2)}</b>; the average bank here ended with <b>${money(r.meanEq, 2)}</b>.</p>
      ${r.underReserved ? `<p class="note">In ${r.underReserved} year${r.underReserved > 1 ? 's' : ''} the average bank charged off more than half a point beyond its allowance.</p>` : ''}${comparison(S)}</div>
      <div>${chart(S, s)}${yearTable(path)}</div></div>`;
  }
  function ratios(x) {
    return ui.table(['Ratio', 'Your bank'], [
      ['Delinquency (non-current ÷ loans)', p1(x.noncur)], ['Net charge-offs ÷ loans (60% of non-current)', p1(x.nco)],
      ['Loan loss reserve (allowance ÷ loans)', p1(x.a)], ['NPL coverage (allowance ÷ non-current)', pct(x.noncur ? x.a / x.noncur : null)]]) +
      '<p class="note" style="margin-top:4px">Simplified: here every loan that stops paying defaults in the same year. Real delinquency counts loans 30 or more days late, and some of them recover. Real allowances under CECL cover expected losses over a loan\'s whole life, not one year.</p>';
  }
  function lastYear(p) {
    const x = p.last; if (!x) return '';
    return `<h3>${yearName(x)}: risky default rate ${p1(x.D)}</h3><p class="sub">You lent ${x.r}% risky. Income ${money(x.income, 2)}; equity now <b>${money(x.eq, 2)}</b>.</p>${ratios(x)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {}, path = S.pub.path || [], last = path[path.length - 1];
    if (S.phase === 'instructions') { const y = year(NORM, BASE);
      return `<h2>Get ready</h2>${ui.brief(`a bank with $100 of loans, $${DEP} of deposits, and $${s.eq0} of equity.`, `each year, the risky share of your loans${s.cap < 100 ? ` (at most ${s.cap}%)` : ''} and your allowance: the share of loans you expect to charge off.`, 'the class\'s lending sets the risky default rate by the published rule; your equity grows with income and shrinks with losses.')}
      <details open><summary>Worked example: one year</summary><p class="note" style="margin:6px 0 0">Lend ${NORM}% risky when risky loans default at ${BASE}%. Loans that stop paying: 70% × ${SAFE_DEF}% + 30% × ${BASE}% = ${p1(y.noncur)} of loans. You lose ${LGD * 100}% of those: net charge-offs ${p1(y.nco)}. Interest earned: 70% × ${SAFE_RATE}% + 30% × ${RISKY_RATE}% = ${p1(y.interest)}. Less $${(DEP * DEP_RATE / 100).toFixed(2)} of deposit interest, income is ${money(y.income, 2)}, so equity goes from ${money(s.eq0, 2)} to ${money(s.eq0 + y.income, 2)}. An allowance of about ${p1(y.nco)} would have matched the losses.</p></details>`; }
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Counting the year\'s losses…</h2>';
      if (p.failed) return `<h2>✖ Your bank failed</h2><p class="sub">Its equity fell below zero in year ${p.failYear}.</p>${lastYear(p)}`;
      const mine = me.moves[String(S.step)], D = last ? last.D : BASE;
      return `<h2>Year ${S.step} of ${s.years}</h2>
        ${S.step === s.recYear ? `<div class="banner bad"><strong>A recession arrives this year</strong>It adds ${s.recSize} points to the risky default rate.</div>` : ''}
        <div class="banner"><strong>Your equity</strong><span class="bigpay">${money(p.eq, 2)}</span>${last ? `Last year the class lent ${p1(last.R)} risky, and ${p1(last.D)} of risky loans defaulted.` : `Risky loans default at ${BASE}% when the class lends ${NORM}% risky two years running.`}</div>
        <p class="note">At a ${p1(D)} default rate a risky loan earns ${p1(riskyNet(D))} after losses; a safe one earns ${p1(safeNet)}. This year's rate depends on what the class does now and did last year.</p>
        <div class="row"><div class="field"><label for="fRisky">Risky share of your loans (0–${s.cap}%)</label><input id="fRisky" type="number" min="0" max="${s.cap}" step="10" inputmode="numeric" value="${mine ? mine.risky : ''}"></div>
        <div class="field"><label for="fAllow">Allowance: % of loans you expect to charge off</label><input id="fAllow" type="number" min="0" max="40" step="0.1" inputmode="decimal" value="${mine ? mine.allow : ''}"></div>
        <button class="btn primary" id="fSend">Submit</button></div>
        <p class="msg good" id="receipt">${mine ? `You are lending ${mine.risky}% risky with a ${mine.allow}% allowance. You can change it until the year ends.` : ''}</p>${lastYear(p)}`;
    }
    if (S.phase === 'closed') return `<h2>Lending is over</h2><p class="sub">Your loans roll over once more at ${p.r}% risky.</p>${lastYear(p)}`;
    const hist = p.hist || [], best = p.best;
    return `<h2>${p.failed ? `✖ Your bank failed in year ${p.failYear}` : '✔ Your bank survived'}</h2><div class="bigpay">${money(p.eq, 2)}</div>
      <p class="sub">final equity (you started with ${money(s.eq0, 0)}).${best ? ` If every bank had lent ${best.R}% risky every year, each would have ended with ${money(best.eq, 2)}.` : ''}</p>
      ${ui.table(['Year', 'Risky', 'Default rate', 'Allowance', 'Charge-offs', 'Equity'], hist.map(x => [yearName(x), x.r + '%', p1(x.D), p1(x.a), p1(x.nco), money(x.eq, 2)]))}`;
  }
  function wireStudent(root, ctx) {
    const b = root.querySelector('#fSend'); if (!b) return;
    b.onclick = () => {
      const r = root.querySelector('#fRisky').value, a = root.querySelector('#fAllow').value;
      if (r === '') return ctx.say('Enter your risky share (0 is fine).');
      if (a === '') return ctx.say('Enter your allowance: the % of your loans you expect to charge off.');
      ctx.submit({ risky: Math.round(Number(r)), allow: Math.round(Number(a) * 10) / 10 });
    };
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>Year ${S.step} · ${S.nMoved} of ${S.nPlayers} decided</strong>No answer = last year's choices.</div>` : ''; }
  /* Simulated banks: some chase yield, some follow last year's default rate, a few stay cautious. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || p.failed || st.me.moves[String(st.step)]) return null;
    const s = clean(st.settings), path = st.pub.path || [], last = path[path.length - 1], D = last ? last.D : BASE, u = rand();
    let r = u < 0.35 ? s.cap : u < 0.8 ? (riskyNet(D) > safeNet ? p.r + 20 : p.r - 30) : 20;
    r = Math.max(0, Math.min(s.cap, Math.round(r / 10) * 10));
    const a = Math.max(0, Math.round((LGD * ((1 - r / 100) * SAFE_DEF + r / 100 * D) + (rand() - 0.5) * 2) * 10) / 10);
    return { submit: { risky: r, allow: a } };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id];
      return { round: h.roundNo, label: h.label, cap: h.settings.cap, rec_year: h.settings.recYear, display_name: p.name,
        choices: d.moves.filter(m => m.player === p.id).sort((a, b) => a.step - b.step).map(m => `${m.step}:${m.data.risky}/${m.data.allow}`).join(' '),
        final_equity: x.eq != null ? x.eq.toFixed(2) : '', failed: x.failed ? 1 : 0, fail_year: x.failYear ?? '' }; });
  }
  function debrief(S, hh) {
    const r = hh.result, s = clean(hh.settings), b = r.best;
    const extra = s.cap < 100 ? ` The cap held risky lending to ${s.cap}%. Who gained from it, who lost, and what does it leave out?` : s.recYear ? ` The recession hit in year ${s.recYear}. Which banks survived it, and what did they do in the years before?` : '';
    return {
      explain: `The class lent ${p1(r.meanR)} of its loans to risky borrowers on average; the risky default rate peaked at ${p1(r.peakD)}, and ${r.failed} of ${r.n} banks failed. Had every bank lent ${b.R}% every year, each would have ended with ${money(b.eq, 2)}. Use the year table: which year's lending showed up in which year's defaults? Why did each bank lend more than was good for the class?${extra}`,
      transfer: 'Before 2008 many banks\' allowances were low while they made riskier mortgages, because recent charge-offs were low. Using the lag in this game, explain why an allowance based on recent losses can be smallest just before losses arrive. Who benefits when banks lend in a boom, and who pays later?',
      check: { q: 'A bank has $100 of loans: 70% safe loans that default at 1%, and 30% risky loans that default at 5%. It loses 60% of a defaulted loan. What are its net charge-offs, as a share of loans?',
        options: [['a', 'About 1.3%'], ['b', '2.2%'], ['c', '5%'], ['d', '3%']], answer: 'a',
        why: 'Loans that stop paying: 0.7 × 1% + 0.3 × 5% = 2.2%. Losing 60% of each: 0.6 × 2.2% = 1.32%. An allowance near 1.3% matches those losses. Setting a bigger allowance would not change the losses; it only sets more aside for them.',
        trap: 'confusing loans that stop paying (2.2%) with the losses on them (1.3%), or thinking a bigger allowance reduces losses.' }
    };
  }

  const game = { id: 'loanofficer', title: 'Loan Officer', tagline: 'Every bank chooses how much to lend to risky borrowers. Together, the class sets the default rate.',
    fields, presets, buildSettings, rules, steps, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    debrief, nonresponse: 'the bank repeats last year\'s choices (year 1: 30% risky and a 3% allowance).',
    compare: { metric: 'the number of banks that fail', note: 'Every round uses the same rule and the same starting balance sheets, and the cap and recession rounds each change one thing. Banks have also learned from earlier rounds.' },
    openLabel: 'Open year 1', stepLabel: S => `End year ${S.step}; count losses`, closeLabel: S => S.step >= steps(S.settings) ? 'End the last year' : 'End lending now', model: { simulate, defRate, year, bestUniform } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
