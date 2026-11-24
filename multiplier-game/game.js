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
    { id: 'textbook', label: 'Textbook banking', note: 'Loans pay 6% and almost all are repaid; reserves pay nothing. Lending beats holding reserves.', values: { steps: 5, rr: 10, drain: 10, loanRate: 6, lossPct: 1, iorb: 0 } },
    { id: 'ample', label: 'Interest on reserves, riskier loans', note: 'Reserves pay 4.5%; loans pay 6% but 2% are not repaid (4% net). Holding reserves pays more, as after 2008.', values: { steps: 5, rr: 10, drain: 10, loanRate: 6, lossPct: 2, iorb: 4.5 } }
  ];
  const clean = v => { const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { steps: Math.round(n(v.steps, 5, 2, 8)), rr: n(v.rr, 10, 0, 100), drain: n(v.drain, 10, 0, 100), loanRate: n(v.loanRate, 6, 0, 30), lossPct: n(v.lossPct, 1, 0, 100), iorb: n(v.iorb, 0, 0, 30) }; };
  function buildSettings(v) { const s = clean(v); s.input = { '*': { required: ['lend'], fields: { lend: { type: 'int', label: 'Your loan', min: 0, maxPriv: 'maxLend' } } } }; return s; }
  const netLoan = s => s.loanRate * (1 - s.lossPct / 100) - s.lossPct;   // % earned per $ lent, after losses
  function rules(s) {
    s = clean(s);
    return `<ul class="rules">
      <li>You are a bank. The Fed just bought bonds, and the sellers deposited <b>${whole(D0)} at every bank</b>.</li>
      <li>In each of ${s.steps} steps, decide how much of your <b>new deposits</b> to lend. You must keep ${s.rr}% as required reserves; the rest you can lend or keep as extra reserves.</li>
      <li>Borrowers spend what you lend (keeping ${s.drain}% as cash). The spending is deposited at other banks, so next step you may have new deposits too.</li>
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
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Reserves pay', 'Lent (of what they could)', 'Extra reserves', 'Multiplier after the steps', 'If lending went on'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, h.settings.iorb + '%', pct(r.lendShare), whole(r.extra), `<b>${r.mult.toFixed(2)}</b>`, r.projMult ? r.projMult.toFixed(1) : '—']; }));
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
      <p class="sub">after ${r.steps} steps. Banks lent ${pct(r.lendShare)} of what they could. If they kept lending like that, it would reach about <b>${r.projMult ? r.projMult.toFixed(1) : '—'}</b> (the textbook 1/rr = ${r.textbook.toFixed(0)} assumes banks lend everything and no one holds cash).</p>
      ${ui.tiles([['Base', whole(r.B)], ['Money (deposits + cash)', whole(r.M)], ['Extra reserves held', whole(r.extra)], ['Median bank profit', ui.money(r.medIncome)]])}</div>
      <div>${chart(S)}</div></div>${comparison(S)}`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {};
    if (S.phase === 'instructions') return `<h2>Get ready</h2><p class="sub">You start with ${whole(D0)} of new deposits.</p>`;
    const book = ui.tiles([['Your loans', whole(p.loans || 0)], ['Your reserves', whole(p.res || 0)]], 'two');
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
  const game = { id: 'multiplier', title: 'Money Multiplier', tagline: 'Every student is a bank. Lend out deposits and watch the money supply grow, or hold reserves and watch it stall.',
    fields, presets, buildSettings, rules, steps, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    openLabel: 'Open step 1', stepLabel: S => `End step ${S.step}; move the deposits`, closeLabel: S => S.step >= steps(S.settings) ? 'End the last step' : 'End lending now' };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
