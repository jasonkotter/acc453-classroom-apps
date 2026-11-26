/* Who Bears the Loss? on the shared classroom toolkit (Mar 9, after 09.7; Ch. 9 §§11, 14).
   Plan: classroom/APP_BUILD_PLAN.md, "Who Bears the Loss?: a better new insurance activity".
   A diagnostic activity on owners' incentives, not a strategic game: nothing a classmate does
   changes your bank. Disclosed one-period model: assets cost 100, funded by deposits D and owners'
   equity E (D + E = 100). The safe portfolio pays 105 for sure; the risky one pays 125 or 85, each
   with probability one-half (expected 105 for both). Owners have limited liability and are
   risk-neutral. Each student, as the owner, picks a portfolio, predicts the owners' expected ending
   equity for that choice, and says who covers the shortfall if the risky portfolio pays 85.
   Funding treatments:
     insured — credible deposit insurance with a flat premium; depositors are promised D and always
               get it; the insurer pays any shortfall.
     priced  — no insurance; lenders observe and enforce the portfolio before contracting, are
               risk-neutral, and require an expected repayment of D (zero required return). They
               set the promise R so that expected repayment is D: R = D if D <= 85, else 2D − 85.
   Both worlds are shown for every choice; no lucky draw picks a winner. Scored on prediction
   accuracy only. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc } = ui;
  const COST = 100, SAFE = 105, GOOD = 125, BAD = 85;
  const WHO = [['insurer', 'The deposit insurer'], ['lenders', 'Depositors or lenders'], ['owners', 'The owners, beyond their equity'], ['none', 'No one: there is no shortfall']];
  const whoName = k => (WHO.find(w => w[0] === k) || [, '—'])[1];

  /* ---------- the model ---------- */
  const clean = v => { v = v || {}; const e = Math.round(Number(v.equity)); return { mode: v.mode === 'priced' ? 'priced' : 'insured', equity: isFinite(e) ? Math.min(30, Math.max(5, e)) : 10 }; };
  function promise(s, choice) {   // what depositors or lenders are promised
    const D = COST - s.equity;
    if (s.mode === 'insured' || choice === 'safe') return D;
    return D <= BAD ? D : 2 * D - BAD;
  }
  function world(s, choice) {
    s = clean(s);
    const P = promise(s, choice), states = choice === 'safe' ? [['Sure', SAFE, 1]] : [['Good', GOOD, 0.5], ['Bad', BAD, 0.5]];
    const rows = states.map(([label, V, pr]) => { const short = Math.max(0, P - V);
      return { label, V, pr, own: Math.max(0, V - P), short, dep: s.mode === 'insured' ? P : Math.min(V, P), ins: s.mode === 'insured' ? short : 0, lenderLoss: s.mode === 'insured' ? 0 : short }; });
    const E = k => rows.reduce((t, r) => t + r.pr * r[k], 0);
    return { P, rows, expOwn: E('own'), expDep: E('dep'), expIns: E('ins'), expLenderLoss: E('lenderLoss') };
  }
  function whoAnswer(s) {   // who covers the shortfall if the risky portfolio pays 85
    s = clean(s);
    const short = Math.max(0, promise(s, 'risky') - BAD);
    return short <= 1e-9 ? 'none' : s.mode === 'insured' ? 'insurer' : 'lenders';
  }
  const near = (a, b) => a != null && Math.abs(a - b) <= 0.25 + 1e-9;

  /* ---------- settings ---------- */
  const fields = [
    { id: 'mode', label: 'Funding', type: 'select', options: [['insured', 'Insured deposits, flat premium'], ['priced', 'Uninsured lenders who see the portfolio and price it']] },
    { id: 'equity', label: 'Owners\' equity (of 100 of assets)', type: 'number', min: 5, max: 30 }
  ];
  const presets = [
    { id: 'insured', label: 'Insured deposits, flat premium', note: 'Deposits of 90 are credibly insured, and the premium is the same whatever the bank chooses. Owners put in 10.', values: { mode: 'insured', equity: 10 } },
    { id: 'priced', label: 'Lenders see the portfolio and price it', note: 'One change from the insured round: no insurance. Lenders see the portfolio before they lend and need to expect 90 back, so a risky bank must promise 95. Same assets, equity, and payoffs.', values: { mode: 'priced', equity: 10 } },
    { id: 'capital', label: 'Insured, with more capital: equity 15', note: 'Transfer round. One change from the insured round: owners issue 5 more equity and repay 5 of deposits, so deposits are 85 and equity 15. Still insured at a flat premium.', values: { mode: 'insured', equity: 15 } }
  ];
  function buildSettings(v) {
    const s = clean(v);
    s.input = { '1': { fields: {
      choice: { type: 'choice', label: 'Your portfolio', in: ['safe', 'risky'], optional: true },
      predict: { type: 'num', label: 'Your prediction', min: 0, max: 100, optional: true },
      who: { type: 'choice', label: 'Who covers it', in: WHO.map(w => w[0]), optional: true } } } };
    return s;
  }
  const steps = () => 1;

  /* ---------- instructor side ---------- */
  function assign({ roster }) { const priv = {}; for (const p of roster) priv[p.id] = { owner: true }; return { private: priv, pub: { n: roster.length } }; }
  function resolve({ settings, data }) {
    const s = clean(settings), last = {}, priv = {};
    for (const m of data.moves) if (m.step === 1) last[m.player] = m.data;
    const W = { safe: world(s, 'safe'), risky: world(s, 'risky') }, who = whoAnswer(s);
    const t = { safe: 0, risky: 0, none: 0, pred: 0, predRight: 0, who: 0, whoRight: 0, predSafe: [], predRisky: [] };
    for (const id in data.private) {
      const d = last[id] || {}, c = d.choice === 'safe' || d.choice === 'risky' ? d.choice : null;
      if (c) t[c]++; else t.none++;
      const okP = c && Number.isFinite(d.predict) ? near(d.predict, W[c].expOwn) : null, okW = d.who ? d.who === who : null;
      if (okP != null) { t.pred++; if (okP) t.predRight++; (c === 'safe' ? t.predSafe : t.predRisky).push(d.predict); }
      if (okW != null) { t.who++; if (okW) t.whoRight++; }
      priv[id] = { choice: c, predict: Number.isFinite(d.predict) ? d.predict : null, okP, who: d.who || null, okW };
    }
    return { private: priv, result: { n: Object.keys(data.private).length, mode: s.mode, equity: s.equity, safe: t.safe, risky: t.risky, none: t.none,
      pred: t.pred, predRight: t.predRight, who: t.who, whoRight: t.whoRight, whoAns: who, medSafe: ui.median(t.predSafe), medRisky: ui.median(t.predRisky),
      ownSafe: W.safe.expOwn, ownRisky: W.risky.expOwn, insRisky: W.risky.expIns, lenderLoss: W.risky.expLenderLoss, Prisky: W.risky.P } };
  }

  /* ---------- screens ---------- */
  const n1 = x => x == null || !isFinite(x) ? '—' : (x < 0 ? '−' : '') + (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.abs(Math.round(x))) : Math.abs(x).toFixed(1));
  const signed = x => (x > 1e-9 ? '+' : x < -1e-9 ? '−' : '') + n1(Math.abs(x));
  const fundLine = s => s.mode === 'insured'
    ? `Deposits of <b>${COST - s.equity}</b> are <b>insured</b> by a credible insurer, and the premium is <b>flat</b>: the same whichever portfolio you pick. Depositors are always paid ${COST - s.equity}.`
    : `Deposits are <b>not insured</b>. Lenders see your portfolio before they lend, and they need to expect ${COST - s.equity} back on average, so they set what you must <b>promise</b> to repay: ${promise(s, 'safe')} if you pick safe, <b>${promise(s, 'risky')}</b> if you pick risky.`;
  function bankTable(s) {
    return `<div class="wb-bs"><div><span>Assets</span><b>100</b></div><div><span>Deposits</span><b>${COST - s.equity}</b><span>Equity</span><b>${s.equity}</b></div></div>`;
  }
  function portfolios() {
    return '<div class="wb-port">' + ui.table(['Portfolio', 'Pays at the end', 'Expected payoff'], [['<b>Safe</b>', '105 for sure', '105'], ['<b>Risky</b>', '125 or 85, a coin flip', '½ × 125 + ½ × 85 = 105']]) + '</div>';
  }
  function rules(s) {
    s = clean(s);
    return `<ul class="rules"><li>You <b>own</b> a bank: assets cost 100, funded by ${COST - s.equity} of deposits and ${s.equity} of your equity. Choose its portfolio for one period.</li>
      <li>Both portfolios pay <b>105 on average</b>. As owner you keep what is left after depositors are paid, and you can lose <b>no more than your ${s.equity}</b>. Judge by the average (expected) payoff.</li>
      <li>${fundLine(s)}</li>
      <li>Predict your <b>expected ending equity</b> for the portfolio you pick, and say <b>who covers the shortfall</b> if the risky portfolio pays 85.</li>
      <li class="note">A disclosed one-period model: no taxes, no other costs, and both outcomes are shown at the reveal; no coin is flipped.</li></ul>`;
  }
  function payoffTable(s) {
    s = clean(s);
    const rows = [];
    for (const c of ['safe', 'risky']) { const w = world(s, c);
      w.rows.forEach((r, i) => rows.push([i ? '' : `<b>${c === 'safe' ? 'Safe' : 'Risky'}</b>`, r.label, n1(r.V), n1(r.dep), s.mode === 'insured' ? n1(r.ins) : n1(r.lenderLoss), `<b>${n1(r.own)}</b>`]));
      rows.push(['', '<i>Expected</i>', '105', n1(w.expDep), n1(s.mode === 'insured' ? w.expIns : w.expLenderLoss), `<b>${n1(w.expOwn)}</b> (${signed(w.expOwn - s.equity)})`]);
    }
    return ui.table(['Portfolio', 'State (½ each)', 'Assets pay', s.mode === 'insured' ? 'Depositors get' : 'Lenders get', s.mode === 'insured' ? 'Insurer pays' : 'Lenders short', 'Owners get (profit)'], rows);
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.ownSafe != null); if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Funding', 'Equity', 'Chose risky', 'Owners expect: safe / risky', 'Insurer\'s expected cost of risky'], done.map(h => { const r = h.result, k = r.safe + r.risky;
      return [`${h.roundNo}. ${esc(h.label)}`, r.mode === 'insured' ? 'Insured, flat premium' : 'Priced by lenders', r.equity, `<b>${k ? Math.round(100 * r.risky / k) : 0}%</b> (${r.risky} of ${k})`, `${n1(r.ownSafe)} / ${n1(r.ownRisky)}`, r.mode === 'insured' ? n1(r.insRisky) : 'none: priced by lenders']; }));
  }
  function splitBar(r) {
    const k = r.safe + r.risky, ps = k ? r.safe / k : 0;
    return `<div class="wb-split" role="img" aria-label="${r.safe} chose safe, ${r.risky} chose risky"><div class="wb-safe" style="width:${ps * 100}%">${r.safe ? `Safe ${r.safe}` : ''}</div><div class="wb-risky" style="width:${(1 - ps) * 100}%">${r.risky ? `Risky ${r.risky}` : ''}</div></div>`;
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions' || S.phase === 'open' || S.phase === 'closed') {
      const st = S.phase === 'open' ? `<div class="banner warn"><strong style="font-size:1.2em">Pick a portfolio, predict your expected ending equity, and say who covers a shortfall</strong>${S.nMoved} of ${S.nPlayers} answered</div>` : S.phase === 'closed' ? '<div class="banner"><strong>Answers are closed.</strong>Results in a moment.</div>' : '';
      return `${head}<h2>You own the bank. Safe or risky?</h2>${st}<div class="split"><div>${S.phase === 'instructions' && !S.history.length ? rules(s) : `<p class="wb-msg">${fundLine(s)}</p>`}${ctx.joinLine()}</div><div>${bankTable(s)}${portfolios()}<p class="wb-key">Owners can lose their ${s.equity}, and no more. Anything the assets cannot pay falls on ${s.mode === 'insured' ? 'someone else' : 'the lenders'}.</p></div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head + '<p>Waiting for results.</p>';
    const r = h.result, k = r.safe + r.risky;
    const gap = r.ownRisky - r.ownSafe, msg = r.mode === 'insured'
      ? (gap > 1e-9 ? `Risky gives owners <b>${n1(gap)} more</b> on average, though both portfolios pay 105. The insurer expects to pay <b>${n1(r.insRisky)}</b>.` : 'Both portfolios give owners the same expected payoff, and the insurer expects to pay nothing: the extra equity absorbs the bad state.')
      : `Lenders make a risky bank promise ${r.Prisky}, so owners expect <b>${n1(r.ownRisky)}</b> either way. Lenders get ${r.Prisky} or ${BAD}: ${n1((r.Prisky + BAD) / 2)} on average, what they lent. No insurer is involved.`;
    return `${head}<h2 style="margin-bottom:4px">${k ? Math.round(100 * r.risky / k) : 0}% chose risky</h2>
      <div class="split"><div>${splitBar(r)}<p class="wb-msg">${msg}</p>
        <p class="wb-pred">Predictions right: <b>${r.predRight} of ${r.pred}</b> on the owners' expected ending equity; <b>${r.whoRight} of ${r.who}</b> on who covers the bad-state shortfall (answer: ${esc(whoName(r.whoAns).toLowerCase())}).</p></div>
      <div class="wb-port">${payoffTable(s)}</div></div>${comparison(S)}`;
  }

  function renderStudent(S, me) {
    const s = clean(S.settings), rn = S.roundNo, p = me.priv[rn] || {}, m = me.moves['1'] || {};
    if (S.phase === 'instructions') return `<h2>Get ready</h2>${ui.brief(`a bank you own: 100 of assets, ${COST - s.equity} of deposits, ${s.equity} of your equity.`, 'a safe or a risky portfolio (both pay 105 on average), your expected ending equity, and who covers a shortfall.', 'the projector shows both outcomes for both portfolios, and who paid for each.')}
      <details open><summary>Worked example: the safe portfolio</summary><p class="note" style="margin:6px 0 0">The safe portfolio pays 105. Depositors are paid ${promise(s, 'safe')}, so the owners end with 105 − ${promise(s, 'safe')} = ${n1(SAFE - promise(s, 'safe'))}: a profit of ${n1(SAFE - promise(s, 'safe') - s.equity)} on their ${s.equity}. The risky portfolio is yours to work out.</p></details>`;
    const cur = `<i id="wbCur" hidden data-c="${m.choice || ''}" data-w="${m.who || ''}" data-p="${m.predict ?? ''}"></i>`;
    if (S.phase === 'open') {
      const got = m.choice || m.who || m.predict != null ? `Received${m.choice ? `: ${m.choice}` : ''}${m.predict != null ? `; ending equity ${n1(m.predict)}` : ''}${m.who ? `; ${whoName(m.who).toLowerCase()}` : ''}. You can change any of it until answers close.` : '';
      return `<h2>You own the bank</h2>${bankTable(s)}<p class="note">${fundLine(s)}</p>${portfolios()}
        <div class="choices">${['safe', 'risky'].map(c => `<button class="choice" data-wc="${c}" aria-pressed="${m.choice === c}"><b>${c === 'safe' ? 'Safe' : 'Risky'}</b><span>${c === 'safe' ? '105 for sure' : '125 or 85'}</span></button>`).join('')}</div>
        <div class="field"><label for="wbPred">Your prediction: owners' <b>expected</b> ending equity for your portfolio</label><input id="wbPred" type="number" min="0" max="100" step="0.5" inputmode="decimal" value="${m.predict ?? ''}"></div>
        <div class="actions"><button class="btn primary" id="wbSend">Send prediction</button></div>
        <h3>If the risky portfolio pays 85, who covers the shortfall?</h3>
        <div style="display:grid;gap:6px">${WHO.map(w => `<button class="chip" style="text-align:left;padding:8px 12px" data-ww="${w[0]}" aria-pressed="${m.who === w[0]}">${w[1]}</button>`).join('')}</div>
        <p class="msg good" id="receipt">${got}</p>${cur}`;
    }
    if (S.phase === 'closed') return `<h2>Answers are closed</h2><p class="sub">${m.choice ? `You picked ${m.choice}.` : 'You did not pick a portfolio.'} Waiting for the reveal.</p>`;
    const h = S.history.find(x => x.roundNo === rn); if (!h) return '<p>Waiting for results.</p>';
    const r = h.result, w = p.choice ? world(s, p.choice) : null, ans = (v, ok) => v == null ? 'no answer' : ok ? 'right' : 'not right';
    return `<h2>${p.choice ? `You picked ${p.choice}` : 'You did not pick a portfolio'}</h2>
      ${w ? `<div class="bigpay">${n1(w.expOwn)}</div><p class="sub">the owners' expected ending equity (profit ${signed(w.expOwn - s.equity)} on ${s.equity}).</p>` : ''}
      ${ui.table(['', ''], [['Safe: owners expect', n1(r.ownSafe)], ['Risky: owners expect', n1(r.ownRisky)], ['Your ending-equity prediction', p.predict != null ? `${n1(p.predict)}, ${ans(p.predict, p.okP)}` : 'no answer'],
        ['Who covers the shortfall', `${whoName(r.whoAns)}${p.who ? ` (you: ${ans(p.who, p.okW)})` : ''}`]])}`;
  }
  function wireStudent(root, ctx) {
    const c = (root.querySelector('#wbCur') || { dataset: {} }).dataset;
    const pred = () => { const el = root.querySelector('#wbPred'); if (!el || el.value.trim() === '') return c.p !== '' && c.p != null ? Number(c.p) : null; const v = Math.round(Number(el.value) * 2) / 2; return isFinite(v) ? Math.max(0, Math.min(100, v)) : null; };
    const base = () => ({ choice: c.c || null, predict: c.p !== '' && c.p != null ? Number(c.p) : null, who: c.w || null });
    root.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => ctx.submit(Object.assign(base(), { choice: b.dataset.wc, predict: pred() })));
    root.querySelectorAll('[data-ww]').forEach(b => b.onclick = () => ctx.submit(Object.assign(base(), { who: b.dataset.ww, predict: pred() })));
    const sb = root.querySelector('#wbSend'); if (sb) sb.onclick = () => { const v = pred(); if (v == null) return ctx.say('Enter a number, such as 15.'); if (!c.c) return ctx.say('Pick safe or risky first.'); ctx.submit(Object.assign(base(), { predict: v })); };
  }
  function renderInstructor(S) {
    if (S.phase === 'open') { const s = clean(S.settings); return `<div class="banner"><strong>${S.nMoved} of ${S.nPlayers} answered</strong>${s.mode === 'insured' ? 'Insured, flat premium' : 'Priced by lenders'} · equity ${s.equity}</div>`; }
    const h = S.history.find(x => x.roundNo === S.roundNo);
    if (h && (S.phase === 'revealed' || S.phase === 'debrief')) return `<div class="banner"><strong>Safe ${h.result.safe} · risky ${h.result.risky}</strong>Owners expect ${n1(h.result.ownSafe)} safe, ${n1(h.result.ownRisky)} risky</div>`;
    return '';
  }

  /* Simulated owners: risky is more popular when it pays owners more; about half predict right. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves['1']) return null;
    const s = clean(st.settings), W = { safe: world(s, 'safe'), risky: world(s, 'risky') };
    const c = rand() < (W.risky.expOwn > W.safe.expOwn + 1e-9 ? 0.65 : 0.4) ? 'risky' : 'safe';
    const wrong = [W.safe.expOwn, W.risky.expOwn, s.equity, 105 - (COST - s.equity) + 2.5].filter(x => !near(x, W[c].expOwn));
    const predict = rand() < 0.55 ? W[c].expOwn : wrong[Math.floor(rand() * wrong.length)];
    const who = rand() < 0.6 ? whoAnswer(s) : WHO[Math.floor(rand() * WHO.length)][0];
    return { submit: { choice: c, predict, who } };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id] || {};
      return { round: h.roundNo, label: h.label, funding: h.result.mode, equity: h.result.equity, display_name: p.name, choice: x.choice || '', prediction: x.predict ?? '',
        prediction_right: x.okP == null ? '' : x.okP ? 1 : 0, who_covers: x.who || '', who_right: x.okW == null ? '' : x.okW ? 1 : 0 }; });
  }

  /* ---------- debrief ---------- */
  const CHECK = { q: 'A bank has 100 of assets, insured deposits of 90, and 10 of equity, with a flat insurance premium. Its owners expect 17.5 from a risky portfolio (125 or 85) and 15 from a safe one (105), though both pay 105 on average. Where does the extra 2.5 come from?',
    options: [['a', 'The insurer: it pays 5 half the time, 2.5 on average'], ['b', 'A higher expected payoff on the risky assets'], ['c', 'The depositors, who get less in the bad state'], ['d', 'A reward the market pays for bearing risk']], answer: 'a',
    why: 'Both portfolios pay 105 on average, so risk adds nothing to the pie. In the bad state the assets pay 85, the owners get 0 rather than −5 (limited liability), and the insurer pays the 5 that depositors are owed. Half the time that is 2.5, which is exactly the owners\' gain.',
    trap: 'thinking the risky assets earn more on average, or that insured depositors bear the loss.' };
  function debrief(S, hh) {
    const r = hh.result, k = r.safe + r.risky, pct = k ? Math.round(100 * r.risky / k) : 0;
    const explain = r.mode === 'insured' && r.ownRisky > r.ownSafe + 1e-9
      ? `${pct}% chose risky. With insured deposits and a flat premium, risky gives owners ${n1(r.ownRisky)} on average against ${n1(r.ownSafe)} for safe, though both portfolios pay 105. Where does the extra ${n1(r.ownRisky - r.ownSafe)} come from, and who pays it?`
      : r.mode === 'priced' ? `${pct}% chose risky. Lenders who see the portfolio charge a risky bank a promise of ${r.Prisky}, and owners expect ${n1(r.ownRisky)} either way. What did pricing take away? What would happen if lenders could not see the choice until after they lent?`
      : `${pct}% chose risky. With ${r.equity} of equity, deposits of ${COST - r.equity} are covered even in the bad state, so the insurer pays nothing and owners expect ${n1(r.ownSafe)} either way. Why does more capital change the owners' choice?`;
    return {
      explain,
      transfer: 'Suppose the insurer charges a premium of 2.5 only to banks that pick risky. What do owners choose now? What could a supervisor do instead of a premium? Does either make banking riskless?',
      next: r.mode === 'insured' && r.equity <= 10 ? 'Next round: suppose there is no insurance, and lenders see the portfolio before they lend. Will more of you pick risky, or fewer?' : '',
      check: CHECK
    };
  }

  const game = { id: 'who-bears-loss', title: 'Who Bears the Loss?', tagline: 'You own a bank. Safe or risky? Both pay the same on average. Who pays when the risky bet goes wrong?',
    fields, presets, buildSettings, steps, rules, assign, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows, debrief,
    nonresponse: 'no portfolio is recorded; the student is not counted in the split.',
    compare: { metric: 'the share of the class that picks risky', note: 'The assets, payoffs, and probabilities are the same in every round. Students have also seen earlier rounds, so a change in the split is suggestive.' },
    closeLabel: () => 'Close answers', openLabel: 'Open answers',
    model: { world, promise, whoAnswer, clean } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
