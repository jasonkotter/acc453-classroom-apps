/* Repair the Capital Ratio on the shared classroom toolkit (Mar 11, after 09.10, Ch. 9 §§15–17).
   Spec: classroom/specs/capital-repair.md; ledgers checked in specs/calibration/capital_repair.py.
   A diagnostic activity, not a strategic game: nothing a classmate does changes your bank.
   Starting bank: cash 10 + loans 80 + Treasuries 10 = 100, funded by deposits 96 and common
   equity 4. Supplied rules: loans weigh 100%, cash and Treasuries 0%; floors 8% of RWA and 5% of
   assets (a ratio exactly at the floor passes). Step 1: pick one of four repairs and predict which
   floors the repaired bank still fails. The four balanced ledgers are then shown. Step 2: a
   recognized credit loss of L% of loans (announced before anyone answers) hits every bank; loans
   and equity fall by the same amount, cash is unchanged. Predict which floors fail and whether
   equity is still positive. Scored on prediction accuracy only; there is no leaderboard of repairs.
   A student who picks no repair keeps the starting bank, counted separately. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc } = ui;
  const RB = 0.08, LEV = 0.05, SCALE = 0.12;
  const START = { cash: 10, loans: 80, tsy: 10, dep: 96, cbd: 0, eq: 4 };
  const REPAIRS = {
    A: { short: 'Shift to Treasuries', text: 'Sell 30 of loans at par; buy 30 of Treasuries', head: 'Sell 30 of loans, buy 30 of Treasuries', bank: { cash: 10, loans: 50, tsy: 40, dep: 96, cbd: 0, eq: 4 } },
    B: { short: 'Shrink', text: 'Sell 40 of loans at par; repay 40 of deposits', head: 'Sell 40 of loans, repay 40 of deposits', bank: { cash: 10, loans: 40, tsy: 10, dep: 56, cbd: 0, eq: 4 } },
    C: { short: 'Issue equity', text: 'Issue 3 of new common equity for cash; redeem 3 of deposits', head: 'Issue 3 of equity, redeem 3 of deposits', bank: { cash: 10, loans: 80, tsy: 10, dep: 93, cbd: 0, eq: 7 } },
    D: { short: 'Borrow from the central bank', text: 'Borrow 3 from the central bank', head: 'Borrow 3 from the central bank', bank: { cash: 13, loans: 80, tsy: 10, dep: 96, cbd: 3, eq: 4 } }
  };
  const KEYS = ['A', 'B', 'C', 'D'];
  const FAILS = [['none', 'Fails neither'], ['rb', 'Fails risk-based only'], ['lev', 'Fails leverage only'], ['both', 'Fails both']];
  const failName = k => (FAILS.find(f => f[0] === k) || [, '—'])[1];
  const bankOf = k => k && REPAIRS[k] ? REPAIRS[k].bank : START;

  /* ---------- the model ---------- */
  const assets = b => b.cash + b.loans + b.tsy;
  function ratios(b) {
    const A = assets(b), rwa = b.loans, rb = b.eq / rwa, lev = b.eq / A, rbOk = rb >= RB - 1e-9, levOk = lev >= LEV - 1e-9;
    return { A, rwa, rb, lev, rbOk, levOk, fails: rbOk && levOk ? 'none' : !rbOk && !levOk ? 'both' : !rbOk ? 'rb' : 'lev' };
  }
  function afterLoss(b, lossPct) {
    const loss = b.loans * lossPct / 100;
    const nb = Object.assign({}, b, { loans: b.loans - loss, eq: b.eq - loss });
    return Object.assign(ratios(nb), { bank: nb, loss, positive: nb.eq > 1e-9 });
  }
  const balanced = b => Math.abs(assets(b) - (b.dep + b.cbd + b.eq)) < 1e-9;

  /* ---------- settings ---------- */
  const fields = [{ id: 'lossPct', label: 'Recognized credit loss in step 2 (% of loans)', type: 'number', min: 1, max: 10, step: 1 }];
  const presets = [
    { id: 'two', label: 'Repair, then a 2% loss', note: 'Pick a repair and predict, see the four ledgers, then a loss of 2% of loans hits every bank. The 2% loss separates the repairs; no bank goes below zero.', values: { lossPct: 2 } },
    { id: 'six', label: 'Repair, then a 6% loss (optional)', note: 'Same bank and repairs; only the loss changes. At 6% every repair fails a floor and repair D has negative equity (−0.8). Better for the solvency point, worse for comparing repairs.', values: { lossPct: 6 } }
  ];
  const clean = v => { v = v || {}; const x = Math.round(Number(v.lossPct)); return { lossPct: isFinite(x) ? Math.min(10, Math.max(1, x)) : 2 }; };
  function buildSettings(v) {
    const s = clean(v), fk = FAILS.map(f => f[0]);
    s.input = {
      '1': { fields: { repair: { type: 'choice', label: 'Your repair', in: KEYS, optional: true }, predict: { type: 'choice', label: 'Your prediction', in: fk, optional: true } } },
      '2': { fields: { predict: { type: 'choice', label: 'Your prediction', in: fk, optional: true }, positive: { type: 'choice', label: 'Equity still positive?', in: ['yes', 'no'], optional: true } } }
    };
    return s;
  }
  const steps = () => 2;

  /* ---------- instructor side ---------- */
  function assign({ roster }) {
    const priv = {}; for (const p of roster) priv[p.id] = { bank: true };
    return { private: priv, pub: { n: roster.length } };
  }
  const movesBy = (data, step) => { const o = {}; for (const m of data.moves) if (m.step === step) o[m.player] = m.data; return o; };
  function tally1(data) {
    const m1 = movesBy(data, 1), by = {}; [...KEYS, 'none'].forEach(k => by[k] = { n: 0, pred: 0, right: 0 });
    for (const id in data.private) {
      const d = m1[id] || {}, k = d.repair && REPAIRS[d.repair] ? d.repair : 'none', g = by[k];
      g.n++; if (k !== 'none' && d.predict) { g.pred++; if (d.predict === ratios(bankOf(k)).fails) g.right++; }
    }
    return by;
  }
  function afterStep({ data, closedStep }) {
    if (closedStep !== 1) return {};
    return { pub: { split: tally1(data) } };
  }
  function resolve({ S, settings, data }) {
    const s = clean(settings), m1 = movesBy(data, 1), m2 = movesBy(data, 2), by = {}, priv = {};
    [...KEYS, 'none'].forEach(k => by[k] = { n: 0, pred: 0, right: 0, pos: 0, posRight: 0 });
    for (const id in data.private) {
      const d1 = m1[id] || {}, d2 = m2[id] || {}, k = d1.repair && REPAIRS[d1.repair] ? d1.repair : 'none';
      const before = ratios(bankOf(k)), after = afterLoss(bankOf(k), s.lossPct), g = by[k];
      g.n++;
      if (d2.predict) { g.pred++; if (d2.predict === after.fails) g.right++; }
      if (d2.positive) { g.pos++; if ((d2.positive === 'yes') === after.positive) g.posRight++; }
      priv[id] = { repair: k, pred1: d1.predict || null, ok1: d1.predict ? d1.predict === before.fails : null, pred2: d2.predict || null, ok2: d2.predict ? d2.predict === after.fails : null,
        positive: d2.positive || null, okPos: d2.positive ? (d2.positive === 'yes') === after.positive : null };
    }
    const n = Object.keys(data.private).length, all = k => KEYS.concat(['none']).reduce((t, x) => t + by[x][k], 0);
    return { private: priv, result: { n, lossPct: s.lossPct, split1: S.pub.split || tally1(data), split2: by, pred: all('pred'), right: all('right'), pos: all('pos'), posRight: all('posRight') } };
  }

  /* ---------- screens ---------- */
  const p1 = x => x == null || !isFinite(x) ? '—' : (x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(1) + '%';
  const n2 = x => (x < -1e-9 ? '−' : '') + (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.abs(Math.round(x))) : Math.abs(x).toFixed(2));
  const mark = ok => ok ? '✓ passes' : '✗ fails';
  function bar(label, v, floor, ok) {
    const w = Math.max(0, Math.min(1, v / SCALE)) * 100;
    return `<div class="cr-bar"><div class="cr-lab"><span>${label}</span><b class="${ok ? 'cr-ok' : 'cr-no'}">${p1(v)} ${mark(ok)}</b></div>
      <div class="cr-track" role="img" aria-label="${label} ${p1(v)}, floor ${p1(floor)}, ${ok ? 'passes' : 'fails'}"><div class="cr-fill ${ok ? 'ok' : 'no'}" style="width:${w}%"></div><div class="cr-floor" style="left:${floor / SCALE * 100}%"></div></div></div>`;
  }
  function ledger(b, before) {
    const L = (a, x) => `<span>${a}</span><b>${x == null ? '' : n2(x)}</b>`;
    const left = [L('Cash', b.cash), L('Loans', b.loans), L('Treasuries', b.tsy)], right = [L('Deposits', b.dep)];
    if (b.cbd) right.push(L('Central bank', b.cbd));
    right.push(L('Equity', b.eq));
    while (right.length < 3) right.push('<span></span><b></b>');
    const rows = left.map((x, i) => `<div class="cr-row"><div>${x}</div><div>${right[i]}</div></div>`).join('');
    return `<div class="cr-led">${rows}<div class="cr-row cr-tot"><div>${L('Assets', assets(b))}</div><div>${L('Total', b.dep + b.cbd + b.eq)}</div></div></div>`;
  }
  function card(k, opts) {
    const R = REPAIRS[k], b = R.bank, r = ratios(b), o = opts || {}, g = o.split ? o.split[k] : null;
    if (o.loss != null) {
      const a = afterLoss(b, o.loss);
      return `<div class="cr-card"><div class="cr-head"><b>${k}</b> ${esc(R.head)}</div>
        <p class="cr-line">Loss <b>${n2(a.loss)}</b> · RWA ${n2(b.loans)} → ${n2(a.rwa)}</p>
        <p class="cr-line">Equity ${n2(b.eq)} → <b>${n2(a.bank.eq)}</b>${a.positive ? '' : ' <b class="cr-no">(below zero)</b>'}</p>
        ${bar('Equity ÷ RWA', a.rb, RB, a.rbOk)}${bar('Equity ÷ assets', a.lev, LEV, a.levOk)}
        <p class="cr-line">Cash ${n2(b.cash)}, unchanged</p>
        ${g ? `<p class="cr-foot">${g.n} chose ${k}${g.pred ? ` · ${g.right} of ${g.pred} right` : ''}</p>` : ''}</div>`;
    }
    return `<div class="cr-card"><div class="cr-head"><b>${k}</b> ${esc(R.head)}</div>${ledger(b)}
      <p class="cr-line">RWA ${n2(r.rwa)} · loans kept ${n2(b.loans)}</p>
      ${bar('Equity ÷ RWA', r.rb, RB, r.rbOk)}${bar('Equity ÷ assets', r.lev, LEV, r.levOk)}
      ${g ? `<p class="cr-foot">${g.n} chose ${k}${g.pred ? ` · ${g.right} of ${g.pred} right` : ''}</p>` : ''}</div>`;
  }
  const SIMPLE = 'Simplified: ending assets stand in for average assets, loans sell at par, and a zero credit weight on Treasuries does not remove their interest-rate risk. These are teaching rules, not current regulation.';
  function rules(s, proj) {
    s = clean(s);
    return `<ul class="rules">${proj ? '' : '<li>Your bank fails both capital floors. Pick <b>one repair</b>, and predict which floors your repaired bank <b>still</b> fails.</li>'}
      <li><b>Supplied rules for this exercise:</b> loans carry a 100% risk weight, cash and Treasuries 0%. Floors: <b>8%</b> of risk-weighted assets (RWA) and <b>5%</b> of total assets. A ratio exactly at the floor passes.</li>
      <li>Then a recognized credit loss of <b>${s.lossPct}% of loans</b> hits every bank. Loans and equity fall by the same amount; cash does not change.</li>
      ${proj ? '' : `<li class="note">${SIMPLE}</li>`}</ul>`;
  }
  function startCard() {
    const r = ratios(START);
    return `<div class="cr-card cr-start"><div class="cr-head">The starting bank</div>${ledger(START)}<p class="cr-line">RWA ${r.rwa} (loans only)</p>${bar('Equity ÷ RWA', r.rb, RB, r.rbOk)}${bar('Equity ÷ assets', r.lev, LEV, r.levOk)}</div>`;
  }
  const TICK = '<p class="note" style="margin:6px 0 0">The black tick on each bar is the floor: 8% of RWA, 5% of assets. Bars stop at 12%.</p>';
  const menu = () => `<ol class="cr-menu">${KEYS.map(k => `<li><b>${k}.</b> ${esc(REPAIRS[k].text)}</li>`).join('')}</ol>`;
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.split2); if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Loss', 'Chose A / B / C / D', 'Pass both after the loss', 'Predictions right'], done.map(h => { const r = h.result;
      return [`${h.roundNo}. ${esc(h.label)}`, r.lossPct + '% of loans', KEYS.map(k => r.split2[k].n).join(' / '), KEYS.filter(k => afterLoss(bankOf(k), r.lossPct).fails === 'none').join(', ') || 'none', `${r.right} of ${r.pred}`]; }));
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions' || (S.phase === 'open' && S.step === 1)) {
      const again = S.phase === 'instructions' && S.history.length > 0;   // the toolkit adds its round-comparison card below
      const st = S.phase === 'open' ? `<div class="banner warn"><strong style="font-size:1.25em">Step 1: pick a repair and predict which floors it still fails</strong>${S.nMoved} of ${S.nPlayers} answered</div>` : '';
      return `${head}<h2>Your bank fails both floors. Which repair?</h2>${st}<div class="split"><div>${startCard()}${again ? '' : `<p class="note">${SIMPLE}</p>`}</div><div>${menu()}${!again ? rules(s, true) : ''}${ctx.joinLine()}</div></div>`;
    }
    if (S.phase === 'open' || S.phase === 'closed') {
      const sp = S.pub.split || {}, none = sp.none ? sp.none.n : 0;
      const st = S.pending ? 'Counting step 1…' : S.phase === 'closed' ? 'Step 2 is closed. Results in a moment.' : `Step 2: a loss of ${s.lossPct}% of loans hits every bank. For your bank: which floors fail now, and is equity still positive?`;
      return `${head}<div class="banner warn"><strong style="font-size:1.2em">${st}</strong>${S.phase === 'open' ? `${S.nMoved} of ${S.nPlayers} answered · ` : ''}${none ? `${none} picked no repair and keep the starting bank.` : 'Every student picked a repair.'}</div>
        <div class="cr-grid">${KEYS.map(k => card(k, { split: sp })).join('')}</div>${TICK}`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head + '<p>Waiting for results.</p>';
    const r = h.result, sp = r.split2, none = sp.none.n;
    const anyNeg = KEYS.some(k => !afterLoss(bankOf(k), r.lossPct).positive);
    return `${head}<h2 style="margin-bottom:4px">After a loss of ${r.lossPct}% of loans</h2>
      <p class="sub" style="margin-top:0">Predictions right: <b>${r.right} of ${r.pred}</b> on the floors, <b>${r.posRight} of ${r.pos}</b> on positive equity.${none ? ` ${none} with no repair kept the starting bank.` : ''} ${anyNeg ? 'One bank is below zero: insolvent on these values. No bank is short of cash.' : 'No bank has negative equity, and none is short of cash.'}</p>
      <div class="cr-grid">${KEYS.map(k => card(k, { split: sp, loss: r.lossPct })).join('')}</div>${comparison(S)}`;
  }

  function predButtons(cur, key) {
    return `<div class="cr-chips">${FAILS.map(f => `<button class="chip" data-${key}="${f[0]}" aria-pressed="${cur === f[0]}">${f[1]}</button>`).join('')}</div>`;
  }
  function phoneBank(k) {
    const b = bankOf(k), r = ratios(b);
    return `${ledger(b)}<p class="note" style="margin:4px 0">RWA ${n2(r.rwa)}. Risk-based ${p1(r.rb)}, leverage ${p1(r.lev)}.</p>`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), rn = S.roundNo, p = me.priv[rn] || {}, m1 = me.moves['1'] || {}, m2 = me.moves['2'] || {};
    if (S.phase === 'instructions') return `<h2>Get ready</h2>${ui.brief('a bank that fails both capital floors: equity 4 against RWA of 80 (5.0%, floor 8%) and assets of 100 (4.0%, floor 5%).', 'one of four repairs, and which floors your repaired bank will still fail.', `everyone sees all four repaired banks. Then a loss of ${s.lossPct}% of loans hits every bank, and you predict again.`)}
      <details open><summary>Worked example: the starting bank</summary><p class="note" style="margin:6px 0 0">Only loans carry a risk weight, so RWA = 80 × 100% = 80. Equity ÷ RWA = 4 ÷ 80 = 5.0%, below 8%. Equity ÷ assets = 4 ÷ 100 = 4.0%, below 5%. It fails both.</p></details>${ledger(START)}`;
    if (S.phase === 'open' && S.pending) return '<h2>Counting step 1…</h2>';
    const cur = `<i id="crCur" hidden data-crep="${m1.repair || ''}" data-cp1="${m1.predict || ''}" data-cp2="${m2.predict || ''}" data-cpos="${m2.positive || ''}"></i>`;
    if (S.phase === 'open' && S.step === 1) {
      const got = m1.repair ? `Repair <b>${m1.repair}</b>${m1.predict ? `; prediction: ${failName(m1.predict).toLowerCase()}` : '; now predict'}. You can change either until the step ends.` : '';
      return `<h2>Step 1: pick a repair</h2><p class="note">The starting bank:</p>${ledger(START)}
        <p class="note">Loans 100% weight; cash and Treasuries 0%. Floors: 8% of RWA, 5% of assets.</p>
        <div style="display:grid;gap:8px">${KEYS.map(k => `<button class="choice" data-rep="${k}" aria-pressed="${m1.repair === k}"><b>${k}. ${esc(REPAIRS[k].short)}</b><span>${esc(REPAIRS[k].text)}</span></button>`).join('')}</div>
        <h3>Your prediction: after your repair, the bank…</h3>${predButtons(m1.predict, 'p1')}
        <p class="msg good" id="receipt">${got}</p>${cur}`;
    }
    const mine = m1.repair && REPAIRS[m1.repair] ? m1.repair : null;
    const yours = mine ? `Your bank: repair <b>${mine}</b>, ${esc(REPAIRS[mine].short.toLowerCase())}` : 'You picked no repair, so you keep <b>the starting bank</b>';
    if (S.phase === 'open') {
      const r = ratios(bankOf(mine)), ok1 = m1.predict ? m1.predict === r.fails : null;
      const got = m2.predict || m2.positive ? `Received${m2.predict ? `: ${failName(m2.predict).toLowerCase()}` : ''}${m2.positive ? `; equity positive: ${m2.positive}` : ''}. You can change it until the step ends.` : '';
      return `<h2>Step 2: a loss of ${s.lossPct}% of loans</h2><p class="sub">${yours}.</p>${phoneBank(mine)}
        ${ok1 != null ? `<div class="banner ${ok1 ? '' : 'warn'}"><strong>Step 1: ${ok1 ? 'your prediction was right' : 'not quite'}</strong>It ${failName(r.fails).toLowerCase()}.</div>` : ''}
        <p class="note">The loss is ${s.lossPct}% of your loans. Loans and equity fall by the same amount; cash does not change.</p>
        <h3>After the loss, your bank…</h3>${predButtons(m2.predict, 'p2')}
        <h3>Is its equity still positive?</h3><div class="cr-chips">${['yes', 'no'].map(v => `<button class="chip" data-pos="${v}" aria-pressed="${m2.positive === v}">${v === 'yes' ? 'Yes' : 'No'}</button>`).join('')}</div>
        <p class="msg good" id="receipt">${got}</p>${cur}`;
    }
    if (S.phase === 'closed') return `<h2>Step 2 is closed</h2><p class="sub">${yours}. Waiting for the reveal.</p>`;
    const h = S.history.find(x => x.roundNo === rn); if (!h) return '<p>Waiting for results.</p>';
    const a = afterLoss(bankOf(p.repair === 'none' ? null : p.repair), h.result.lossPct), ans = (v, ok) => v == null ? 'no answer' : ok ? 'right' : 'not right';
    return `<h2>Your bank after the loss</h2><p class="sub">${yours}. The loss was ${n2(a.loss)}.</p>
      ${ui.table(['', ''], [['Equity', `${n2(a.bank.eq)}${a.positive ? '' : ' (below zero)'}`], ['Equity ÷ RWA', `${p1(a.rb)} ${mark(a.rbOk)}`], ['Equity ÷ assets', `${p1(a.lev)} ${mark(a.levOk)}`], ['Cash', `${n2(a.bank.cash)}, unchanged`],
        ['Step 1 prediction', ans(p.pred1, p.ok1)], ['Step 2 prediction', ans(p.pred2, p.ok2)], ['Positive equity', ans(p.positive, p.okPos)]])}`;
  }
  function wireStudent(root, ctx) {
    const c = (root.querySelector('#crCur') || { dataset: {} }).dataset, v = x => x || null;
    root.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => ctx.submit({ repair: b.dataset.rep, predict: v(c.cp1) }));
    root.querySelectorAll('[data-p1]').forEach(b => b.onclick = () => { if (!c.crep) return ctx.say('Pick a repair first.'); ctx.submit({ repair: c.crep, predict: b.dataset.p1 }); });
    root.querySelectorAll('[data-p2]').forEach(b => b.onclick = () => ctx.submit({ predict: b.dataset.p2, positive: v(c.cpos) }));
    root.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => ctx.submit({ predict: v(c.cp2), positive: b.dataset.pos }));
  }
  function renderInstructor(S) {
    if (S.phase === 'open') return `<div class="banner"><strong>Step ${S.step}${S.pending ? ' · counting' : ''}: ${S.nMoved} of ${S.nPlayers} answered</strong>Loss in step 2: ${clean(S.settings).lossPct}% of loans</div>`;
    const h = S.history.find(x => x.roundNo === S.roundNo);
    if (h && (S.phase === 'revealed' || S.phase === 'debrief')) return `<div class="banner"><strong>A / B / C / D: ${KEYS.map(k => h.result.split2[k].n).join(' / ')}</strong>Predictions right after the loss: ${h.result.right} of ${h.result.pred}</div>`;
    return '';
  }

  /* Simulated students: repairs spread A 30%, B 20%, C 35%, D 15%; a little over half predict right. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const pick = () => FAILS[Math.floor(rand() * 4)][0];
    if (st.step === 1) {
      const u = rand(), k = u < 0.3 ? 'A' : u < 0.5 ? 'B' : u < 0.85 ? 'C' : 'D';
      return { submit: { repair: k, predict: rand() < 0.6 ? ratios(bankOf(k)).fails : pick() } };
    }
    const m1 = st.me.moves['1'] || {}, a = afterLoss(bankOf(m1.repair), clean(st.settings).lossPct);
    return { submit: { predict: rand() < 0.55 ? a.fails : pick(), positive: rand() < 0.85 ? (a.positive ? 'yes' : 'no') : (a.positive ? 'no' : 'yes') } };
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id] || {};
      return { round: h.roundNo, label: h.label, loss_pct: h.result.lossPct, display_name: p.name, repair: x.repair || '', step1_prediction: x.pred1 || '', step1_right: x.ok1 == null ? '' : x.ok1 ? 1 : 0,
        step2_prediction: x.pred2 || '', step2_right: x.ok2 == null ? '' : x.ok2 ? 1 : 0, equity_positive_answer: x.positive || '', equity_positive_right: x.okPos == null ? '' : x.okPos ? 1 : 0 }; });
  }

  /* ---------- debrief ---------- */
  const CHECK = { q: 'A new bank, same weights and floors: cash 5, loans 60, Treasuries 35; deposits 95, equity 5. It passes both floors (8.3% and 5.0%). A recognized loss of 10% of loans (6) hits. Which follows from these facts alone?',
    options: [['a', 'It breaches both floors and its equity is negative, but nothing shows it is short of cash'], ['b', 'It breaches both floors, its equity is negative, and it cannot make its payments today'],
      ['c', 'It breaches both floors, but its equity is still positive'], ['d', 'Nothing changes: a bank that passed both floors can absorb the loss']], answer: 'a',
    why: 'Equity is 5 − 6 = −1, so on these values the bank is insolvent, and both ratios are below their floors. But cash is still 5, and no withdrawal or payment is due, so nothing here shows a cash shortfall.',
    trap: 'treating a ratio breach, negative equity, and a cash shortfall as one problem, or thinking a bank that passes its ratios cannot fail.' };
  function debrief(S, hh) {
    const r = hh.result, a = k => afterLoss(bankOf(k), r.lossPct);
    return {
      explain: `Repair A reached 8.0% of RWA without a dollar of new equity, and still failed leverage at 4.0%. What did the leverage ratio see that RWA missed? After the ${r.lossPct}% loss, A is at ${p1(a('A').rb)} and ${p1(a('A').lev)}; C took the largest dollar loss (${n2(a('C').loss)}) and kept the most equity (${n2(a('C').bank.eq)}). Why?`,
      transfer: 'B and C both pass. What does the economy lose when banks repair by shrinking (40 of lending gone)? Who gives something up when they repair by issuing equity? And why do regulators watch a risk-based ratio and a leverage ratio together?',
      next: r.lossPct < 6 ? 'If the loss were 6% of loans instead, which repair would leave the bank below zero? Is that bank short of cash?' : '',
      check: CHECK
    };
  }

  const game = { id: 'capital-repair', title: 'Repair the Capital Ratio', tagline: 'Your bank fails both capital floors. Which repair fixes it, and what survives a loss?',
    fields, presets, buildSettings, steps, rules, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows, debrief,
    nonresponse: 'step 1: no repair, so the student keeps the starting bank (counted separately); step 2: no prediction is recorded.',
    compare: { metric: 'the number of repairs that pass both floors after the loss', note: 'The bank, the four repairs, the weights, and the floors are the same; only the size of the loss changes. Students have also seen round 1.' },
    stepLabel: () => 'End step 1: show the four ledgers', closeLabel: S => S.step < 2 ? 'End the round now' : 'Close step 2', openLabel: 'Open step 1',
    model: { START, REPAIRS, ratios, afterLoss, balanced, assets } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
