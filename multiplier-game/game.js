/* Money Multiplier game on the shared classroom toolkit. Rules: SPEC.md.
   Every student is a bank. The Fed's purchase lands as a $1,000 deposit at every bank. In each
   step a bank lends some of its new deposits (up to deposits less required reserves) and keeps
   the rest as reserves. Borrowers keep a share of each loan as cash and spend the rest, which is
   deposited at two other banks, picked at random, as next step's new deposits. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc, whole, pct } = ui;
  const D0 = 1000;

  const fields = [
    { id: 'steps', label: 'Lending steps', type: 'number', min: 2, max: 8 },
    { id: 'rr', label: 'Required reserves (% of deposits)', type: 'number', min: 0, max: 100 },
    { id: 'drain', label: 'Borrowers keep as cash (% of each loan)', type: 'number', min: 0, max: 100 },
    { id: 'loanRate', label: 'Loan interest rate (%)', type: 'number', min: 0, max: 30, step: 0.1 },
    { id: 'lossPct', label: 'Loans not repaid (% of loans)', type: 'number', min: 0, max: 100, step: 0.1 },
    { id: 'iorb', label: 'Interest on reserves (%)', type: 'number', min: 0, max: 30, step: 0.1 }
  ];
  const presets = [
    { id: 'textbook', label: 'Textbook banking', note: 'Loans pay 6% and almost all are repaid (about 4.9% net); reserves pay nothing. Lending beats holding reserves.', values: { steps: 5, rr: 10, drain: 10, loanRate: 6, lossPct: 1, iorb: 0 } },
    { id: 'iorb', label: 'Interest on reserves (one change)', note: 'Only one thing changes: reserves pay 5.4%, as in 2023–24. Loans are the same as round 1 (about 4.9% net), so holding reserves now pays a little more.', values: { steps: 5, rr: 10, drain: 10, loanRate: 6, lossPct: 1, iorb: 5.4 } },
    { id: 'ample', label: 'Interest on reserves and riskier loans (two changes)', note: 'Optional. Two things change at once: reserves pay 4.5%, and 2% of loans are not repaid (about 3.9% net). A comparison with round 1 cannot say which change mattered.', values: { steps: 5, rr: 10, drain: 10, loanRate: 6, lossPct: 2, iorb: 4.5 } }
  ];
  const clean = v => { const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { steps: Math.round(n(v.steps, 5, 2, 8)), rr: n(v.rr, 10, 0, 100), drain: n(v.drain, 10, 0, 100), loanRate: n(v.loanRate, 6, 0, 30), lossPct: n(v.lossPct, 1, 0, 100), iorb: n(v.iorb, 0, 0, 30) }; };
  function buildSettings(v) { const s = clean(v); s.input = { '*': { required: ['lend'], fields: { lend: { type: 'int', label: 'Your loan', min: 0, maxPriv: 'maxLend' } } } }; return s; }
  const netLoan = s => s.loanRate * (1 - s.lossPct / 100) - s.lossPct;   // % earned per $ lent, after losses
  function rules(s) {
    s = clean(s);
    return `<ul class="rules">
      <li>You are a bank. The Fed just bought bonds from the public, and the sellers deposited the proceeds: <b>${whole(D0)} of new deposits at every bank</b>, and ${whole(D0)} of new reserves to go with them (the Fed pays the seller's bank in reserves).</li>
      <li>In each of ${s.steps} steps, decide how much of your <b>new deposits</b> to lend. You must keep ${s.rr}% as required reserves; the rest you can lend or keep as extra reserves.</li>
      <li>A loan creates a deposit for your borrower, who spends it at once, keeping ${s.drain}% of each loan as cash. The rest lands as deposits at other banks, and your reserves go with it to settle the payment. Next step you may receive new deposits, and reserves, from other banks' borrowers.</li>
      <li>Your profit for the year: loans pay ${s.loanRate}%, but ${s.lossPct}% of loans are never repaid (about ${netLoan(s).toFixed(1)}% net); reserves pay ${s.iorb}%.</li>
      <li>If you do not answer in a step, you keep everything as reserves.</li></ul>`;
  }

  /* ---------- the model ---------- */
  // Process one step: priv[id].dep = new deposits this step. lends[id] = amount lent.
  function process(priv, lends, s, rand) {
    const ids = Object.keys(priv), next = Object.fromEntries(ids.map(id => [id, 0]));
    const t = { dep: 0, lent: 0, cash: 0, reqRes: 0, extraRes: 0 };
    for (const id of ids) {
      const p = priv[id], d = p.dep || 0, max = Math.floor(d * (1 - s.rr / 100)), L = Math.max(0, Math.min(max, Math.round(lends[id] || 0)));
      p.loans = (p.loans || 0) + L; p.res = (p.res || 0) + (d - L); p.depTot = (p.depTot || 0) + d; p.lastLend = L;
      t.dep += d; t.lent += L; t.reqRes += d * s.rr / 100; t.extraRes += d - L - d * s.rr / 100;
      const cash = L * s.drain / 100, spend = L - cash; t.cash += cash;
      if (spend > 0 && ids.length > 1) {   // two other banks, picked at random, get half each
        const others = ids.filter(x => x !== id);
        for (let k = 0; k < 2; k++) next[others[Math.floor(rand() * others.length)]] += spend / 2;
      }
    }
    for (const id of ids) { priv[id].dep = Math.round(next[id] * 100) / 100; priv[id].maxLend = Math.floor(priv[id].dep * (1 - s.rr / 100)); }
    return t;
  }
  const income = (p, s) => (p.loans || 0) * netLoan(s) / 100 + (p.res || 0) * s.iorb / 100;

  /* ---------- instructor side ---------- */
  function assign({ roster, seed, settings }) {
    const priv = {}, s = clean(settings);
    for (const p of roster) priv[p.id] = { dep: D0, maxLend: Math.floor(D0 * (1 - s.rr / 100)), loans: 0, res: 0, depTot: 0 };
    return { private: priv, pub: { seed, n: roster.length, B: D0 * roster.length, hist: [] } };
  }
  function step(S, data, st) {
    const s = clean(S.settings), priv = JSON.parse(JSON.stringify(data.private)), lends = {};
    for (const m of data.moves) if (m.step === st) lends[m.player] = m.data.lend;
    const t = process(priv, lends, s, ui.rng(ui.hash(S.pub.seed + ':' + st)));
    const prev = S.pub.hist[S.pub.hist.length - 1] || { D: 0, C: 0, lent: 0, extra: 0, max: 0 };
    const h = { step: st, D: prev.D + t.dep, C: prev.C + t.cash, lent: prev.lent + t.lent, extra: prev.extra + t.extraRes, max: prev.max + t.dep * (1 - s.rr / 100), newDep: t.dep };
    return { priv, hist: S.pub.hist.concat([h]) };
  }
  function afterStep({ S, data, closedStep }) { const r = step(S, data, closedStep); return { pub: { hist: r.hist }, private: r.priv }; }
  function resolve({ S, data }) {
    const s = clean(S.settings), r = step(S, data, S.step), last = r.hist[r.hist.length - 1], B = S.pub.B;
    const lendShare = last.max ? last.lent / last.max : 0, g = lendShare * (1 - s.rr / 100) * (1 - s.drain / 100);
    // With D0 at every bank: deposits D0·Σg^k = D0/(1−g); currency = Σ cash = D0·λ(1−rr)c/(1−g). Multiplier = (D + C) / B.
    const projMult = g < 1 ? (1 + lendShare * (1 - s.rr / 100) * s.drain / 100) / (1 - g) : null;
    const incomes = Object.values(r.priv).map(p => income(p, s));
    const priv = {}; for (const id in r.priv) priv[id] = { income: Math.round(income(r.priv[id], s) * 100) / 100, loans: r.priv[id].loans, res: r.priv[id].res, dep: 0, maxLend: 0 };
    return { private: priv, pub: { hist: r.hist }, result: { B, D: last.D, C: last.C, M: last.D + last.C, mult: (last.D + last.C) / B, lendShare, extra: last.extra, projMult, textbook: 1 / (s.rr / 100), medIncome: ui.median(incomes), steps: r.hist.length } };
  }

  /* ---------- screens ---------- */
  function chart(S) {
    const B = S.pub.B, pts = [[0, 1]].concat((S.pub.hist || []).map(h => [h.step, (h.D + h.C) / B]));
    return ui.lines([{ points: pts, color: 'var(--teal)', dots: true, label: 'Money ÷ base (the multiplier so far)' }, { points: [[0, 1 / (S.settings.rr / 100)], [S.settings.steps, 1 / (S.settings.rr / 100)]], color: '#9d3c35', dash: true, label: `Textbook limit, 1/rr = ${(100 / S.settings.rr).toFixed(1)}` }],
      { xLabel: 'Step', yLabel: 'Multiplier', xMin: 0, xMax: S.settings.steps, yMin: 0, yMax: Math.max(2, 1.1 / (S.settings.rr / 100)), xFmt: x => Math.round(x), yFmt: y => y.toFixed(1), xTicks: Array.from({ length: S.settings.steps + 1 }, (_, i) => i), aria: 'The money multiplier step by step' });
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.B);
    if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Reserves pay', 'Loans pay, net of losses', 'Lent (of what they could)', 'Extra reserves', 'Multiplier observed', 'Extrapolated limit (same lending share forever)'],
      done.map(h => { const r = h.result, s = clean(h.settings); return [`${h.roundNo}. ${esc(h.label)}`, s.iorb + '%', netLoan(s).toFixed(1) + '%', pct(r.lendShare), whole(r.extra), `<b>${r.mult.toFixed(2)}</b>`, r.projMult ? r.projMult.toFixed(1) : '—']; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>You are a bank</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S)}</div></div>`;
    const last = (S.pub.hist || [])[S.pub.hist.length - 1], B = S.pub.B, M = last ? last.D + last.C : B;
    const tiles = ui.tiles([['Base: the Fed\'s purchase', whole(B)], ['Deposits created', whole(last ? last.D : B)], ['Cash held by borrowers', whole(last ? last.C : 0)], ['Money ÷ base', (M / B).toFixed(2), 'hi']]);
    if (S.phase === 'open' || S.phase === 'closed') {
      return `${head}<h2>${S.phase === 'open' ? (S.pending ? 'Moving the deposits…' : `Step ${S.step} of ${s.steps}: decide how much to lend`) : 'Lending is over'}</h2>${tiles}
        <div class="split"><div><div class="banner warn"><strong>${S.nMoved} of ${S.nPlayers} banks have decided</strong>Loans pay about ${netLoan(s).toFixed(1)}% after losses; reserves pay ${s.iorb}%.</div>${last ? `<p class="sub">So far banks lent ${pct(last.lent / Math.max(1, last.max))} of what they could. Extra reserves: ${whole(last.extra)}.</p>` : ''}${ctx.joinLine()}</div><div>${chart(S)}</div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">The multiplier</div><div class="lead">${r.mult.toFixed(2)}</div>
      <p class="sub">observed after ${r.steps} steps: money (deposits + cash) ÷ base. Banks lent ${pct(r.lendShare)} of what they could. <b>Extrapolated:</b> if they kept lending that share forever, it would reach about <b>${r.projMult ? r.projMult.toFixed(1) : '—'}</b>. The textbook 1/rr = ${r.textbook.toFixed(0)} assumes banks lend everything and no one holds cash.</p>
      ${ui.tiles([['Base', whole(r.B)], ['Money (deposits + cash)', whole(r.M)], ['Extra reserves held', whole(r.extra)], ['Median bank profit', ui.money(r.medIncome)]])}</div>
      <div>${chart(S)}</div></div>${comparison(S)}`;
  }
  /* One bank's books: the changes since the Fed's purchase. Deposits received = reserves kept + loans
     made, because each loan's new deposit was spent at once and left with reserves. */
  function tAccount(p) {
    return `<div class="taccount"><div><h4>Assets (changes)</h4><p><span>Reserves</span><span>${whole(p.res || 0)}</span></p><p><span>Loans</span><span>${whole(p.loans || 0)}</span></p></div>
      <div><h4>Liabilities (changes)</h4><p><span>Deposits received</span><span>${whole(p.depTot || 0)}</span></p></div></div>
      <p class="note" style="margin-top:-4px">Each loan you make first appears as a deposit for your borrower. When the borrower spends it, that deposit and the same amount of your reserves move to the seller's bank, so what is left is the loan.</p>`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {};
    if (S.phase === 'instructions') return `<h2>Get ready</h2>${ui.brief(`${whole(D0)} of new deposits from the Fed's purchase, and ${whole(D0)} of new reserves.`, `each step, how much of your new deposits to lend: up to ${100 - s.rr}% of them; the rest stays as reserves.`, 'your loans are spent and deposited at other banks, which may send deposits your way. Your profit counts loan income and interest on reserves.')}
      <details open><summary>Worked example: one step</summary><p class="note" style="margin:6px 0 0">You receive $1,000 of deposits with $1,000 of reserves. You must keep ${whole(D0 * s.rr / 100)}. Lend ${whole(D0 * (1 - s.rr / 100))}: your borrower keeps ${whole(D0 * (1 - s.rr / 100) * s.drain / 100)} as cash and spends ${whole(D0 * (1 - s.rr / 100) * (1 - s.drain / 100))}, which becomes new deposits at other banks. Money in the economy is now $1,000 + ${whole(D0 * (1 - s.rr / 100))} = ${whole(D0 * (2 - s.rr / 100))}, though the base is still $1,000.</p></details>`;
    const book = ui.tiles([['Your loans', whole(p.loans || 0)], ['Your reserves', whole(p.res || 0)]], 'two') + (S.phase === 'open' && S.step === 1 && !(p.loans || p.res) ? '' : tAccount(p));
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Moving the deposits…</h2>' + book;
      const dep = p.dep || 0, max = p.maxLend || 0, mine = me.moves[String(S.step)];
      return `<h2>Step ${S.step} of ${s.steps}</h2>
        <div class="banner"><strong>New deposits this step</strong><span class="bigpay">${whole(dep)}</span>Required reserves: ${whole(dep * s.rr / 100)}. You can lend up to ${whole(max)}.</div>
        <p class="note">Loans earn about ${netLoan(s).toFixed(1)}% after losses; reserves earn ${s.iorb}%.</p>
        ${max > 0 ? `<div class="row"><div class="field"><label for="mLend">Lend ($0 to ${whole(max)})</label><input id="mLend" type="number" min="0" max="${max}" step="1" inputmode="numeric" value="${mine ? mine.lend : ''}"></div><button class="btn primary" id="mSend">Submit</button></div>
        <div class="actions"><button class="btn secondary" data-lend="0">Lend nothing</button><button class="btn secondary" data-lend="${Math.floor(max / 2)}">Lend half</button><button class="btn secondary" data-lend="${max}">Lend the most</button></div>` : '<p class="sub">No new deposits this step. Wait for the next one.</p>'}
        <p class="msg good" id="receipt">${mine ? `You are lending ${whole(mine.lend)}. You can change it until the step ends.` : ''}</p>${book}`;
    }
    if (S.phase === 'closed') return '<h2>Lending is over</h2>' + book;
    return `<h2>Your bank's year</h2><div class="bigpay">${ui.money(p.income)}</div><p class="sub">profit: ${whole(p.loans)} of loans earning about ${netLoan(s).toFixed(1)}%, and ${whole(p.res)} of reserves earning ${s.iorb}%.</p>`;
  }
  function wireStudent(root, ctx) {
    const send = v => ctx.submit({ lend: Math.max(0, Math.round(Number(v))) });
    root.querySelectorAll('[data-lend]').forEach(b => b.onclick = () => send(b.dataset.lend));
    const b = root.querySelector('#mSend'); if (b) b.onclick = () => { const v = root.querySelector('#mLend').value; if (v === '') return ctx.say('Enter an amount.'); send(v); };
  }
  function renderInstructor(S) { return S.phase === 'open' ? `<div class="banner"><strong>Step ${S.step} · ${S.nMoved} of ${S.nPlayers} decided</strong>No answer = keep it all as reserves.</div>` : ''; }
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const s = clean(st.settings), max = p.maxLend > 0 ? p.maxLend : Math.floor((p.dep || 0) * (1 - s.rr / 100)); if (max <= 0) return null;
    const lendMore = netLoan(s) > s.iorb, u = rand();
    return { submit: { lend: lendMore ? (u < 0.8 ? max : Math.floor(max / 2)) : (u < 0.8 ? 0 : Math.floor(max / 3)) } };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => ({ round: h.roundNo, label: h.label, iorb: h.settings.iorb, display_name: p.name, loans: d.private[p.id].loans, reserves: d.private[p.id].res, profit: d.private[p.id].income, lends: d.moves.filter(m => m.player === p.id).map(m => `${m.step}:${m.data.lend}`).join(' ') }));
  }
  const steps = s => clean(s || {}).steps;
  function debrief(S, hh) {
    const r = hh.result, s = clean(hh.settings);
    return {
      explain: `The base was ${whole(r.B)}; after ${r.steps} steps money was ${whole(r.M)}, so the observed multiplier is ${r.mult.toFixed(2)}. Banks lent ${pct(r.lendShare)} of what they could, with loans netting about ${netLoan(s).toFixed(1)}% and reserves paying ${s.iorb}%. Explain the chain from one bank's choice to the class's multiplier, and why it stops short of 1/rr = ${r.textbook.toFixed(0)}.`,
      transfer: 'In 2008–14 the Fed more than quadrupled the monetary base, yet broad money grew far less, and the money multiplier fell from about 9 to under 3. Using this game, what were banks choosing to do? Since 2020 the U.S. reserve requirement has been zero. What limits bank lending now, if not reserves?',
      check: { q: 'The required reserve ratio is 10%, the public holds no cash, and banks lend every dollar of excess reserves. The Fed buys $1,000 of bonds from the public. What is the most that deposits can rise, and what is the condition?',
        options: [['a', '$10,000, if banks keep lending all their excess reserves and no one holds cash'], ['b', '$10,000, always, because the multiplier is 1/rr'], ['c', '$1,000: only the seller\'s deposit'], ['d', '$100,000']], answer: 'a',
        why: 'The first deposit is $1,000 and each round is 90% of the last: $1,000 ÷ 0.10 = $10,000. That is a ceiling that needs every bank to lend every spare dollar and no one to hold cash. In the game, banks chose to hold reserves when reserves paid more, and borrowers kept cash, so money grew far less.',
        trap: 'treating 1/rr as a law. It is a limit under conditions; in practice banks lend when it pays, given loan demand, capital, and funding costs.' }
    };
  }
  const game = { id: 'multiplier', title: 'Money Multiplier', tagline: 'Every student is a bank. Lend out deposits and watch the money supply grow, or hold reserves and watch it stall.',
    fields, presets, buildSettings, rules, steps, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows, debrief,
    nonresponse: 'the bank lends nothing this step and keeps all its new deposits as reserves.',
    compare: { metric: 'the multiplier after the last step', note: 'Every bank starts with the same $1,000 each round, but deposits travel to randomly picked banks, and banks have seen the last round.' },
    openLabel: 'Open step 1', stepLabel: S => `End step ${S.step}; move the deposits`, closeLabel: S => S.step >= steps(S.settings) ? 'End the last step' : 'End lending now' };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
