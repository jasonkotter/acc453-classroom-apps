/* Bank Run on the shared classroom toolkit (ported 2026-11-24 from the br_* backend; the old
   page is legacy.html). Rules: SPEC.md. Payouts: model.js, unchanged.
   Each withdrawal window is one step. Who needs cash is assigned privately when the round opens;
   they count as window-1 withdrawals. After each window the instructor's browser counts the new
   withdrawals and publishes the count; the last window is counted only at the reveal. */
(function () {
  'use strict';
  const M = window.BankRunModel, ui = window.Classroom.ui, { esc, money, whole } = ui;
  const sum = a => (a || []).reduce((x, y) => x + y, 0);
  const pct = x => Math.round(x * 100) + '%';
  const statusText = {
    sound: ['✔', 'The bank survived', 'It paid every withdrawal and can repay everyone who held, with interest.'],
    short: ['▲', 'The bank got through today, but holders take a loss', 'It paid every withdrawal. What is left cannot repay the depositors who held.'],
    closed: ['✖', 'The bank ran out of money and closed', 'It could not pay every withdrawal. Everyone still holding gets nothing from the bank.']
  };

  /* ---------- settings ---------- */
  const fields = [
    { id: 'cashPct', label: 'Cash reserves (% of deposits)', type: 'number', min: 0, max: 100 },
    { id: 'salePricePct', label: 'Forced-sale price (cents per $1)', type: 'number', min: 0, max: 100 },
    { id: 'lossPct', label: 'Bad loans (% of loans)', type: 'number', min: 0, max: 100 },
    { id: 'insurance', label: 'Deposit insurance', type: 'checkbox' },
    { id: 'insuranceLimit', label: 'Insurance limit ($ per depositor)', type: 'number', min: 0, max: 100 },
    { id: 'backstop', label: 'Lender of last resort', type: 'checkbox' },
    { id: 'needPct', label: 'Depositors who need cash (%)', type: 'number', min: 0, max: 100, step: 5 },
    { id: 'windows', label: 'Withdrawal windows', type: 'number', min: 1, max: 5 }
  ];
  const presets = M.PRESETS.map(p => ({ id: p.id, label: p.label, note: p.note, values: M.presetSettings(p.id) }));
  function buildSettings(v) {
    const s = M.cleanSettings(v), wd = { type: 'bool', optional: true };
    s.input = { '1': { fields: { wd, guess: { type: 'int', label: 'Your guess', min: 0, max: 100, optional: true } } }, '*': { role: 'dep', fields: { wd } } };
    return s;
  }
  const steps = s => M.cleanSettings(s).windows;

  /* ---------- the core state in the shape the Bank Run screens use ---------- */
  function view(S) {
    const pub = S.pub || {}, rn = S.roundNo;
    const V = { code: S.code, phase: S.phase, roundNo: rn, label: S.label, settings: S.settings, nJoined: S.nJoined,
      nPlayers: S.nPlayers, nNeed: pub.nNeed ?? null, window: S.phase === 'open' ? S.step : 0, byWindow: pub.byWindow || [],
      nGuessed: S.phase === 'open' && S.step === 1 ? S.nMoved : (pub.nGuessed ?? 0), pending: S.pending,
      history: S.history.filter(h => h.result && h.result.byWindow).map(h => ({ roundNo: h.roundNo, label: h.label, settings: M.cleanSettings(h.settings), nPlayers: h.result.nPlayers, nNeed: h.result.nNeed, byWindow: h.result.byWindow, beliefs: h.result.beliefs, nGuessed: h.result.nGuessed })) };
    if (S.me) {
      const need = {}, withdrew = {}, guess = {};
      for (const k in S.me.priv) { const p = S.me.priv[k]; if (p.need) { need[k] = true; withdrew[k] = 1; } else if (p.wdWindow) withdrew[k] = p.wdWindow; }
      const cur = S.me.moves[String(S.step)], first = S.me.moves['1'];
      if (S.phase === 'open' && !withdrew[rn] && cur && cur.wd) withdrew[rn] = S.step;
      if (first && first.guess != null) guess[rn] = first.guess;
      V.me = { id: S.me.id, name: S.me.name, eligibleFrom: S.me.eligibleFrom, need, withdrew, guess };
    }
    return V;
  }

  /* ---------- instructor side ---------- */
  function assign({ roster, settings, rng }) {
    const s = M.cleanSettings(settings), ids = ui.shuffle(roster.map(p => p.id), rng), nNeed = Math.round(ids.length * s.needPct / 100), priv = {};
    ids.forEach((id, i) => { priv[id] = i < nNeed ? { role: 'need', need: true } : { role: 'dep' }; });
    return { private: priv, pub: { nNeed, byWindow: [] } };
  }
  /* New withdrawals in one window: depositors whose answer for that window says withdraw and
     who had not withdrawn before; plus, in window 1, everyone who needs cash. */
  function countWindow(data, w) {
    const P = data.private, out = [];
    for (const m of data.moves) if (m.step === w && m.data.wd === true && P[m.player] && P[m.player].role === 'dep' && !P[m.player].wdWindow) out.push(m.player);
    const nNeed = w === 1 ? Object.values(P).filter(p => p.need).length : 0;
    return { ids: out, count: out.length + nNeed };
  }
  function afterStep({ S, data, closedStep }) {
    const c = countWindow(data, closedStep), priv = {};
    for (const id of c.ids) priv[id] = { wdWindow: closedStep };
    const pub = { byWindow: (S.pub.byWindow || []).concat([c.count]) };
    if (closedStep === 1) pub.nGuessed = data.moves.filter(m => m.step === 1 && m.data.guess != null).length;
    return { pub, private: priv };
  }
  function resolve({ S, data }) {
    const P = data.private, last = S.pub.byWindow || [];
    let byWindow = last, priv = {};
    if (last.length < S.step) {   // the window open when the round closed has not been counted yet
      const c = countWindow(data, S.step);
      for (const id of c.ids) priv[id] = { wdWindow: S.step };
      byWindow = last.concat([c.count]);
    }
    const wdw = id => P[id].need ? 1 : (P[id].wdWindow || (priv[id] && priv[id].wdWindow) || null);
    const groups = { hold: [], run: [], need: [] };
    for (const m of data.moves) if (m.step === 1 && m.data.guess != null && P[m.player]) groups[P[m.player].need ? 'need' : wdw(m.player) ? 'run' : 'hold'].push(m.data.guess);
    const beliefs = {};
    for (const k in groups) { const g = groups[k]; if (!g.length) continue; const bins = Array(11).fill(0); g.forEach(x => bins[Math.max(0, Math.min(10, Math.round(x / 10)))]++); beliefs[k] = { n: g.length, mean: Math.round(ui.mean(g) * 10) / 10, bins }; }
    const nGuessed = data.moves.filter(m => m.step === 1 && m.data.guess != null).length;
    return { private: priv, pub: { byWindow }, result: { nPlayers: Object.keys(P).length, nNeed: S.pub.nNeed, byWindow, beliefs, nGuessed } };
  }
  function controls(S, list, h) {
    const V = view(S), shut = S.phase === 'open' && !S.pending && M.resolveWindows(S.settings, S.nPlayers, V.byWindow).closedInWindow > 0;
    if (!shut) return list;
    return list.filter(b => b.id !== 'step').map(b => b.id === 'close' ? Object.assign(b, { label: 'End round: the bank has closed', next: true }) : b);
  }
  const stepLabel = S => { const K = steps(S.settings); return S.step < K ? `End window ${S.step} of ${K}` : 'End the last window'; };
  const closeLabel = S => { const K = steps(S.settings); return K > 1 ? (S.step < K ? 'End the round now' : 'End the last window') : 'Close withdrawals'; };

  /* ---------- rules and pieces (as in the original page) ---------- */
  function rulesFor(s) {
    s = M.cleanSettings(s); const d = s.deposit, K = s.windows, out = [];
    out.push(`Each of you has ${money(d)} in the bank. For every $100 of deposits the bank holds $${s.cashPct} in cash; the other $${100 - s.cashPct} is in loans that are repaid later.`);
    if (s.lossPct > 0) out.push(`Bad news: ${s.lossPct}% of those loans will never be repaid.`);
    if (s.needPct > 0) out.push(`${s.needPct}% of you, picked at random, <b>need cash today</b> and will withdraw. Your phone tells you privately if you are one of them.`);
    out.push(`<b>Hold</b> and you receive ${money(d + s.holdBonus)} (your deposit plus ${money(s.holdBonus)} of interest), as long as the bank can pay it.`);
    out.push(`<b>Withdraw</b> and you receive ${money(d)} today, as long as the bank can pay.`);
    if (K > 1) out.push(`There are ${K} withdrawal windows. After each one, the number who have withdrawn goes on the screen. If you are holding, you can still withdraw in a later window. Once a window ends, a withdrawal is final.`);
    if (s.backstop) out.push('If the cash runs out, the central bank lends the bank cash against its good loans, dollar for dollar.');
    else if (s.salePricePct > 0) out.push(`If the cash runs out, the bank must sell loans today at ${s.salePricePct} cents on the dollar.`);
    else out.push('The loans cannot be sold today. Cash is all the bank has to pay withdrawals.');
    if (K > 1) out.push('The bank pays each window in turn. If it cannot pay a window in full, it closes: the depositors in that window split what is left equally, and everyone still holding gets nothing from the bank.');
    else out.push('If the bank cannot pay every withdrawal, it closes. Withdrawers split what there is equally (being first does not help), and holders get nothing from the bank.');
    out.push(s.insurance ? `<b>Deposit insurance is on.</b> Whatever happens to the bank, you receive at least ${money(Math.min(s.insuranceLimit, d))}.` : 'There is no deposit insurance.');
    out.push('Doing nothing counts as holding.');
    return '<ul class="rules">' + out.map(x => `<li>${x}</li>`).join('') + '</ul>';
  }
  const badges = s => `<div class="badges"><span class="badge ${s.insurance ? 'on' : ''}">Deposit insurance: ${s.insurance ? 'ON, up to ' + money(Math.min(s.insuranceLimit, s.deposit)) : 'off'}</span><span class="badge ${s.backstop ? 'on' : ''}">Lender of last resort: ${s.backstop ? 'ON' : 'off'}</span></div>`;
  function balanceSheet(s, n) {
    const r = M.resolveBank(s, Math.max(n, 1), 0), per = n < 1;
    return `<div class="taccount"><div><h4>Assets</h4><p><span>Cash reserves</span><span>${whole(r.cash)}</span></p><p><span>Loans (repaid later)</span><span>${whole(r.loansFace)}</span></p>${r.loanLoss > 0 ? `<p class="minor"><span>of which will never be repaid</span><span>${whole(r.loanLoss)}</span></p>` : ''}</div>
      <div><h4>Liabilities</h4><p><span>Deposits</span><span>${whole(r.deposits)}</span></p><p class="minor"><span>${per ? 'shown per depositor' : n + ' depositors × ' + money(s.deposit)}</span><span></span></p></div></div>`;
  }
  function meter(s, n, nNeed, cum) {
    if (!n) return '';
    const t = M.thresholds(s, n), p = k => (k / n * 100).toFixed(1), mk = [];
    if (nNeed > 0) mk.push([nNeed, `${nNeed} need cash`, 'up']);
    if (t.maxSafe >= 0 && t.maxSafe < n) mk.push([t.maxSafe, `Holders lose beyond ${t.maxSafe}`, 'down']);
    if (t.maxMet < n) mk.push([t.maxMet, `Bank closes beyond ${t.maxMet}`, 'up']);
    const note = t.maxSafe < 0 ? 'Holders take a loss in this bank even if nobody else withdraws.' : t.maxSafe >= n ? 'No number of withdrawals costs the holders anything in this round.' : '';
    return `<div class="meter" role="img" aria-label="${cum} of ${n} depositors have withdrawn. ${mk.map(m => m[1]).join('. ')}."><div class="fill" style="width:${p(cum)}%"></div>${mk.map(m => `<i class="mk ${m[2]}${m[0] / n > 0.7 ? ' left' : ''}" style="left:${p(m[0])}%"><span>${m[1]}</span></i>`).join('')}</div>${note ? `<p class="note">${note}</p>` : ''}`;
  }
  function unfold(s, n, byWindow, nNeed, final) {
    let cum = 0, shut = false;
    const rows = byWindow.map((c, i) => {
      const was = shut; cum += c; const b = M.resolveBank(s, n, cum); let st;
      if (was && !c) return '';
      if (was) st = 'closed';
      else if (b.closed) { st = '✖ ran out of money'; shut = true; }
      else if (b.saleProceeds > 0.005) st = `selling loans at ${s.salePricePct}¢`;
      else if (b.fedLoan > 0.005) st = 'borrowing from the central bank';
      else st = 'cash covers it';
      return `<tr><td>Window ${i + 1}</td><td>${c}${i === 0 && nNeed ? ` (${Math.min(nNeed, c)} needed cash)` : ''}</td><td>${cum} of ${n} (${pct(cum / n)})</td><td>${st}</td>${final ? `<td>${money(final.perWindow[i])}</td>` : ''}</tr>`;
    }).join('');
    return `<div class="scroll"><table><thead><tr><th>Window</th><th>Withdrew</th><th>Total so far</th><th>The bank</th>${final ? '<th>Each received</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  const resultOf = h => M.resolveWindows(h.settings, h.nPlayers, h.byWindow);
  const costOf = (h, r) => M.runCost(h.settings, h.nPlayers, h.nNeed, r);
  const withdrawerLine = r => r.closedInWindow ? r.perWindow.map((v, i) => v == null ? null : `window ${i + 1}: ${money(v)}`).filter(Boolean).join(' · ') : money(r.perWithdraw);
  function lead(h, r, cost) {
    const n = r.n, d = r.settings.deposit, others = n - h.nNeed;
    const baseLine = cost.baseSound ? 'This bank was sound.' : 'This bank could not repay everyone even with no run.';
    const noRun = h.nNeed > 0 ? `If only the ${h.nNeed} who needed cash had withdrawn, each of the other ${others} would have received ${money(cost.base.perHold)}.` : `If nobody had withdrawn, every depositor would have received ${money(cost.base.perHold)}.`;
    let hind;
    if (r.closedInWindow && !r.settings.insurance) hind = `In hindsight, everyone still in the bank when window ${r.closedInWindow} opened would have done better to leave sooner.`;
    else if (r.h > 0 && r.perHold < d - 0.005) hind = `In hindsight, all ${r.h} who were still holding would have done better to withdraw early.`;
    else if (cost.ran > 0 && r.h > 0 && r.perHold > d + 0.005) hind = `In hindsight, the ${cost.ran} who withdrew without needing to gave up ${money(r.perHold - d)} each.`;
    else hind = 'In hindsight, nobody would change their choice.' + (cost.ran > 0 ? ' Once everyone else is leaving, leaving is the best you can do.' : '');
    const paid = r.fdicPaid > 0.005 ? ` Deposit insurance paid ${whole(r.fdicPaid)} to make depositors whole.` : '';
    return `<div class="label">${baseLine}</div><div class="lead">${cost.ran === 0 ? 'Nobody ran' : whole(cost.destroyed) + ' lost to the run'}</div><p class="sub">${noRun}${paid}</p><p><b>${hind}</b></p>`;
  }
  function beliefs(h, r) {
    const b = h.beliefs || {}, g = k => Object.assign({ n: 0, mean: null, bins: Array(11).fill(0) }, b[k] || {}), hold = g('hold'), run = g('run');
    if (!hold.n && !run.n) return '';
    const max = Math.max(1, ...hold.bins.map((x, i) => x + run.bins[i])), act = Math.round(r.share * 10), pc = m => m == null ? '—' : Math.round(m) + '%';
    return `<h3>What depositors expected</h3><p class="note">Before the first window, everyone guessed what share of the class would withdraw. Depositors who needed cash are left out.</p>
      <div class="tiles three"><div class="tile"><small>Those who held guessed (${hold.n})</small><strong>${pc(hold.mean)}</strong></div><div class="tile"><small>Those who ran guessed (${run.n})</small><strong>${pc(run.mean)}</strong></div><div class="tile"><small>Actually withdrew</small><strong>${pct(r.share)}</strong></div></div>
      <div class="hist" role="img" aria-label="Guesses in steps of ten percent. Held: ${hold.bins.join(', ')}. Ran: ${run.bins.join(', ')}.">${hold.bins.map((x, i) => `<div class="hcol${i === act ? ' act' : ''}"><div class="hbar"><i style="height:${run.bins[i] / max * 64}px;background:var(--wd)" title="${run.bins[i]} who ran guessed ${i * 10}%"></i><i style="height:${x / max * 64}px;background:var(--hold)" title="${x} who held guessed ${i * 10}%"></i></div><small>${i * 10}%${i === act ? '<br>▲ actual' : ''}</small></div>`).join('')}</div>
      <div class="legend"><span><i class="sw" style="background:var(--hold)"></i>Held</span><span><i class="sw" style="background:var(--wd)"></i>Ran</span><span>Bar height: number of depositors who made that guess</span></div>`;
  }
  function sourcesBar(r) {
    const parts = [['Cash reserves', r.cashUsed, '#102a35'], ['Loan sales', r.saleProceeds, '#087d75'], ['Central bank loan', r.fedLoan, '#d6a13b'], ['Not paid', r.unpaidToday, '#c9cfcc']].filter(p => p[1] > 0.005);
    if (!parts.length) return '<p class="note">No one withdrew, so the bank paid nothing out today.</p>';
    return `<div class="stack" role="img" aria-label="${parts.map(p => p[0] + ' ' + whole(p[1])).join(', ')}">${parts.map(p => `<i style="flex:${p[1]};background:${p[2]}" title="${p[0]}: ${whole(p[1])}"></i>`).join('')}</div>
      <div class="legend">${parts.map(p => `<span><i class="sw" style="background:${p[2]}"></i>${p[0]} ${whole(p[1])}</span>`).join('')}</div>`;
  }
  function payoffChart(s, n, w, nNeed) {
    const pts = M.payoffCurve(s, n), W = 720, H = 250, L = 52, R = 18, T = 14, B = 44, pw = W - L - R, ph = H - T - B, ymax = s.deposit * 1.1;
    const x = k => L + (n ? k / n : 0) * pw, y = v => T + ph - Math.min(v, ymax) / ymax * ph;
    const line = key => pts.filter(p => p[key] != null).map(p => `${x(p.k).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
    const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e8e5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="13" fill="#5d6e73">$${v}</text>`).join('');
    const xt = [0, .25, .5, .75, 1].map(f => `<text x="${L + f * pw}" y="${H - B + 18}" text-anchor="middle" font-size="13" fill="#5d6e73">${f * 100}%</text>`).join('');
    const here = pts[w], mx = x(w);
    const dotH = here.hold != null ? `<circle cx="${mx}" cy="${y(here.hold)}" r="6" fill="var(--hold)" stroke="#fff" stroke-width="2"/>` : '';
    const dotW = here.withdraw != null ? `<rect x="${mx - 6}" y="${y(here.withdraw) - 6}" width="12" height="12" fill="var(--wd)" stroke="#fff" stroke-width="2"/>` : '';
    const anchor = mx > W - 150 ? 'end' : 'start';
    const needMark = nNeed > 0 && nNeed !== w ? `<line x1="${x(nNeed)}" x2="${x(nNeed)}" y1="${T + 20}" y2="${T + ph}" stroke="#5d6e73" stroke-width="1.5" stroke-dasharray="2 4"/><text x="${x(nNeed)}" y="${T + ph - 6}" dx="${nNeed < w ? -6 : 6}" text-anchor="${nNeed < w ? 'end' : 'start'}" font-size="13" fill="#5d6e73">No run: ${pct(nNeed / n)}</text>` : '';
    return `<div class="legend" style="margin-bottom:4px"><span><svg width="34" height="12" aria-hidden="true"><line x1="0" x2="34" y1="6" y2="6" stroke="var(--hold)" stroke-width="3"/><circle cx="17" cy="6" r="4.5" fill="var(--hold)"/></svg>What a holder receives</span><span><svg width="34" height="12" aria-hidden="true"><line x1="0" x2="34" y1="6" y2="6" stroke="var(--wd)" stroke-width="3" stroke-dasharray="7 4"/><rect x="13" y="2" width="8" height="8" fill="var(--wd)"/></svg>What a withdrawer receives (the average, if the bank closes)</span></div>
      <div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Payout to a holder and to a withdrawer at every possible share of depositors withdrawing. This round, ${pct(n ? w / n : 0)} withdrew.">
        ${grid}${xt}<text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" font-size="13" fill="#5d6e73">Share of depositors who withdraw</text>
        <polyline points="${line('hold')}" fill="none" stroke="var(--hold)" stroke-width="3" stroke-linejoin="round"/>
        <polyline points="${line('withdraw')}" fill="none" stroke="var(--wd)" stroke-width="3" stroke-dasharray="7 4" stroke-linejoin="round"/>
        ${needMark}<line x1="${mx}" x2="${mx}" y1="${T}" y2="${T + ph}" stroke="#152f39" stroke-width="1.5"/>
        <text x="${mx}" y="${T + 11}" dx="${anchor === 'end' ? -7 : 7}" text-anchor="${anchor}" font-size="13" font-weight="700" fill="#152f39">This round: ${pct(n ? w / n : 0)}</text>${dotH}${dotW}</svg></div>
      <details><summary>Payout table</summary><div class="scroll"><table><thead><tr><th>Share withdrawing</th><th>Withdrawer receives</th><th>Holder receives</th><th>Bank</th></tr></thead><tbody>${
        [...new Set([0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1].map(f => Math.round(f * n)))].map(k => { const p = pts[k]; return `<tr><td>${k} of ${n} (${pct(n ? k / n : 0)})</td><td>${money(p.withdraw)}</td><td>${money(p.hold)}</td><td>${{ sound: 'survives', short: 'holders lose', closed: 'closes' }[p.status]}</td></tr>`; }).join('')
      }</tbody></table></div></details>`;
  }
  function comparison(V) {
    if (!V.history.length) return '';
    return `<h3>Round comparison</h3><div class="scroll"><table><thead><tr><th>Round</th><th>Withdrew</th><th>Needed cash</th><th>Ran</th><th>Lost to the run</th><th>Outside money</th><th>Holder got</th><th>Bank</th></tr></thead><tbody>${V.history.map(h => { const r = resultOf(h), c = costOf(h, r), outside = r.fedLoan + r.fdicPaid;
      return `<tr><td>${h.roundNo}. ${esc(h.label)}</td><td>${r.w + r.late} of ${r.n} (${pct((r.w + r.late) / Math.max(r.n, 1))})</td><td>${h.nNeed}</td><td>${c.ran}</td><td>${whole(c.destroyed)}</td><td>${outside > 0.005 ? whole(outside) : '—'}</td><td>${money(r.perHold)}</td><td>${{ sound: '✔ survived', short: '▲ holders lost', closed: '✖ closed' }[r.status]}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  /* ---------- projector ---------- */
  function renderProjector(S, ctx) {
    const V = view(S), s = M.cleanSettings(V.settings), K = s.windows, n = V.nPlayers, head = `<div class="label">Round ${V.roundNo} · ${esc(V.label)}</div>`, joinLine = ctx.joinLine();
    if (V.phase === 'instructions') return `${head}<h2>Hold or withdraw?</h2><div class="split"><div>${balanceSheet(s, n)}${badges(s)}<div class="banner"><strong style="font-size:1.4em">Read the rules</strong>Withdrawals open in a moment.</div>${joinLine}</div><div>${rulesFor(s)}</div></div>${comparison(V)}`;
    if (V.phase === 'open' || V.phase === 'closed') {
      const cum = sum(V.byWindow), now = M.resolveWindows(s, n, V.byWindow), shut = now.closedInWindow > 0;
      let st;
      if (V.phase === 'closed') st = ['Withdrawals are closed', 'The last window has not been counted yet. Results in a moment.', ''];
      else if (V.pending) st = ['Counting…', 'The window has ended.', ''];
      else if (shut) st = ['✖ The bank has run out of money', `It could not pay everyone who asked in window ${now.closedInWindow}. No more withdrawals.`, 'bad'];
      else st = [`Window ${V.window} of ${K} is open`, V.window === 1 ? `${V.nGuessed} of ${n} have answered. Make your guess, then hold or withdraw on your phone.` : 'If you are holding, you can still withdraw on your phone. Doing nothing keeps you holding.', 'warn'];
      return `${head}<h2>${V.byWindow.length ? `${cum} of ${n} have withdrawn so far` : s.needPct > 0 ? `${V.nNeed} of ${n} depositors need cash today` : 'Hold or withdraw?'}</h2>${meter(s, n, V.nNeed, cum)}
        <div class="split"><div><div class="banner ${st[2]}"><strong style="font-size:1.4em">${st[0]}</strong>${st[1]}</div>${V.byWindow.length ? unfold(s, n, V.byWindow, V.nNeed) : ''}${joinLine}</div><div>${balanceSheet(s, n)}${badges(s)}</div></div>${comparison(V)}`;
    }
    const h = V.history.find(x => x.roundNo === V.roundNo); if (!h) return head + '<p>Waiting for results.</p>';
    const r = resultOf(h), st = statusText[r.status], cost = costOf(h, r), all = r.w + r.late;
    return `${head}<div class="split"><div>${lead(h, r, cost)}
        <div class="headline ${r.status}"><span class="icon" aria-hidden="true">${st[0]}</span><span><b>${st[1]}</b>${st[2]}</span></div>
        <div class="tiles" style="grid-template-columns:1fr 1fr"><div class="tile"><small>Each withdrawer received</small><strong style="${r.closedInWindow ? 'font-size:1.05rem;letter-spacing:0' : ''}">${withdrawerLine(r)}</strong></div><div class="tile"><small>Each holder received</small><strong>${money(r.perHold)}</strong></div></div>
      </div><div><h3 style="margin-top:0">${pct(all / Math.max(r.n, 1))} withdrew: ${all} of ${r.n}. ${h.nNeed} needed cash, ${cost.ran} ran.</h3>${meter(s, r.n, h.nNeed, all)}${unfold(h.settings, r.n, h.byWindow, h.nNeed, r)}${beliefs(h, r)}</div></div>
      <div class="split" style="margin-top:14px"><div><h3 style="margin-top:0">Where today's ${whole(r.requested)} of withdrawals came from</h3>${sourcesBar(r)}
        <div class="tiles three"><div class="tile"><small>Cash paid out</small><strong>${whole(r.cashUsed)}</strong></div><div class="tile"><small>Loans sold</small><strong>${whole(r.loansSold)}</strong></div><div class="tile"><small>Lost in forced sales</small><strong>${whole(r.saleLoss)}</strong></div>
          <div class="tile"><small>Left for holders</small><strong>${whole(r.paidHolders)}</strong></div><div class="tile out"><small>Outside money: central bank loan</small><strong>${h.settings.backstop ? whole(r.fedLoan) : '—'}</strong></div><div class="tile out"><small>Outside money: deposit insurance paid</small><strong>${h.settings.insurance ? whole(r.fdicPaid) : '—'}</strong></div></div>${badges(h.settings)}
      </div><div><h3 style="margin-top:0">What each choice pays, at every size of run</h3>${payoffChart(h.settings, r.n, r.w, h.nNeed)}</div></div>${comparison(V)}`;
  }

  /* ---------- student ---------- */
  function studentOpen(V, me, S) {
    const s = M.cleanSettings(V.settings), rn = V.roundNo, K = s.windows, n = V.nPlayers, need = !!me.need[rn], wdWin = me.withdrew[rn], guess = me.guess[rn];
    const cum = sum(V.byWindow), shut = M.resolveWindows(s, n, V.byWindow).closedInWindow > 0, t = M.thresholds(s, n);
    if (V.pending) return '<h2>Counting…</h2><p class="sub">The window has ended. The new count is on its way.</p>';
    const limit = t.maxSafe >= 0 && t.maxSafe < n ? ` Holders start to lose beyond ${t.maxSafe}.` : '';
    let html = `<h2>${K > 1 ? `Window ${V.window} of ${K}` : 'Hold or withdraw?'}</h2>`;
    html += V.byWindow.length ? `<div class="banner warn"><strong>${cum} of ${n} have withdrawn so far</strong>${V.nNeed} of them needed cash.${limit}</div>` : s.needPct > 0 ? `<p class="sub">${V.nNeed} of ${n} depositors need cash today and will withdraw.${limit}</p>` : '';
    if (V.window === 1 && !shut) html += `<h3>${guess == null ? 'First, your guess' : 'Your guess'}</h3><p class="note">By the end of this round, what share of the class will have withdrawn? Tap again to change it until this window ends.</p>
        <div class="chips">${[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(g => `<button class="chip" data-guess="${g}" aria-pressed="${guess === g}">${g}%</button>`).join('')}</div>`;
    if (need) html += `<div class="banner"><strong>💵 You need your cash today</strong>Your withdrawal is in. You receive $${s.deposit} if the bank can pay. Nothing else to decide this round.</div>`;
    else if (wdWin && wdWin < V.window) html += `<div class="banner"><strong>💵 You withdrew in window ${wdWin}</strong>That withdrawal is final.</div>`;
    else if (shut) html += `<div class="banner bad"><strong>✖ The bank has run out of money</strong>No more withdrawals. You are still holding.</div>`;
    else if (wdWin) html += `<div class="banner warn"><strong>💵 Withdrawal requested</strong>It becomes final when this window ends.</div><button class="choice" data-wd="0"><b>🏦 Undo: keep holding</b><span>Leave my $${s.deposit} in the bank after all.</span></button>`;
    else if (V.window === 1 && guess == null) html += `<p class="sub">Make your guess to see your choices.</p>`;
    else html += `<div class="banner"><strong>🏦 You are holding</strong>Doing nothing keeps you holding.${K > 1 ? (V.window < K ? ' You can still withdraw in a later window.' : ' This is the last window.') : ''}</div><button class="choice" data-wd="1"><b>💵 Withdraw now</b><span>Take my $${s.deposit} out of the bank.</span></button>`;
    return html + '<p class="msg" id="receipt"></p>';
  }
  function renderStudent(S, me0) {
    const V = view(S), me = V.me, rn = V.roundNo, w = me.withdrew[rn];
    const mineIn = V.history.filter(h => me.eligibleFrom <= h.roundNo && (me0.priv[h.roundNo]));
    const total = mineIn.reduce((t, h) => t + (M.payoutFor(resultOf(h), me.withdrew[h.roundNo]) || 0), 0), played = mineIn.length;
    if (V.phase === 'instructions') return `<h2>Get ready</h2><p class="sub">Read the rules. The instructor will open withdrawals in a moment.</p>${balanceSheet(V.settings, 0)}${badges(M.cleanSettings(V.settings))}`;
    if (V.phase === 'open') return studentOpen(V, me, S);
    if (V.phase === 'closed') return `<h2>Withdrawals are closed</h2><div class="banner"><strong>${me.need[rn] ? 'You needed cash and withdrew' : w ? 'You withdrew in window ' + w : 'You held'}</strong>Waiting for the instructor to reveal what happened to the bank.</div>`;
    const h = V.history.find(x => x.roundNo === rn); if (!h) return '<p>Waiting for results.</p>';
    const r = resultOf(h), pay = M.payoutFor(r, w), top = pay - M.bankPayoutFor(r, w), st = statusText[r.status], g = me.guess[rn], all = r.w + r.late;
    const did = me.need[rn] ? 'You needed cash and <b>withdrew</b>' : w ? `You <b>withdrew</b> in window ${w}` : 'You <b>held</b>';
    return `<h2>Your result</h2><p class="sub">${did}. ${all} of ${r.n} depositors withdrew; ${h.nNeed} of them needed cash.</p><div class="bigpay">${money(pay)}</div>
      ${top > 0.005 ? `<p class="note">${money(pay - top)} from the bank and ${money(top)} from deposit insurance.</p>` : ''}
      <div class="headline ${r.status}"><span class="icon" aria-hidden="true">${st[0]}</span><span><b>${st[1]}</b>${st[2]}</span></div>
      <table><tbody><tr><td>Each withdrawer received</td><td>${withdrawerLine(r)}</td></tr><tr><td>Each holder received</td><td>${money(r.perHold)}</td></tr>
      ${g != null ? `<tr><td>You guessed / actually withdrew</td><td>${g}% / ${pct(all / Math.max(r.n, 1))}</td></tr>` : ''}
      <tr><td>Your total over ${played} round${played === 1 ? '' : 's'}</td><td><b>${money(total)}</b></td></tr></tbody></table>`;
  }
  let lastS = null;
  function wireStudent(root, ctx) {
    const S = lastS; if (!S) return;
    const cur = () => S.me.moves[String(S.step)] || {}, first = S.me.moves['1'] || {};
    const payload = (wd, guess) => { const d = {}; if (S.step === 1) { if (guess != null) d.guess = guess; } if (wd != null) d.wd = wd; return d; };
    root.querySelectorAll('[data-guess]').forEach(b => b.onclick = () => ctx.submit(payload(cur().wd === true ? true : (S.me.priv[S.roundNo] || {}).need ? undefined : cur().wd, Number(b.dataset.guess))));
    root.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => ctx.submit(payload(b.dataset.wd === '1', first.guess)));
  }
  function renderStudentWrapped(S, me, ctx) { lastS = S; return renderStudent(S, me, ctx); }

  function renderInstructor(S) {
    const V = view(S), h = V.history.find(x => x.roundNo === V.roundNo);
    if (h && (S.phase === 'revealed' || S.phase === 'debrief')) { const r = resultOf(h), c = costOf(h, r); return `<div class="headline ${r.status}"><span class="icon" aria-hidden="true">${statusText[r.status][0]}</span><span><b>${c.ran} ran · ${whole(c.destroyed)} lost</b>${r.w + r.late} of ${r.n} withdrew · holders ${money(r.perHold)}</span></div>`; }
    if (S.phase === 'open') return `<div class="banner"><strong>Window ${S.step}${S.pending ? ' · counting' : ''}</strong>${V.byWindow.length ? sum(V.byWindow) + ' withdrew in ended windows · ' : ''}${S.nMoved} answers this window · ${V.nNeed} need cash</div>`;
    return '';
  }

  /* Simulated depositors (as in the original demo): guess the final share, and withdraw if,
     at that guess, holding pays less than the deposit. Later windows extrapolate from the count. */
  function sim(st, rand) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const s = M.cleanSettings(st.settings), n = st.nPlayers, by = (st.pub.byWindow || []), nNeed = st.pub.nNeed || 0, cum = sum(by);
    if (!n || M.resolveWindows(s, n, by).closedInWindow) return null;
    const hist = st.history.filter(h => h.result && h.result.byWindow), last = hist[hist.length - 1], needShare = nNeed / n;
    const prior = last && last.result.nPlayers ? Math.max(needShare, sum(last.result.byWindow) / last.result.nPlayers) : needShare + 0.035;
    const u = rand(), patience = rand() * 30;
    let guess;
    if (st.step === 1) guess = Math.max(needShare, Math.min(1, prior + (u - 0.5) * 0.2));
    else { const share = cum / n; guess = Math.min(1, share + Math.max(0, share - needShare) * (0.3 + u)); }
    const d = {};
    if (st.step === 1) d.guess = Math.round(guess * 10) * 10;
    if (p.role === 'dep' && !p.wdWindow) {
      const hold = M.resolveBank(s, n, Math.min(Math.round(guess * n), n - 1)).perHold;
      if (hold != null && hold < s.deposit - (st.step === 1 ? 0 : patience) - 1e-9) d.wd = true;
    }
    return Object.keys(d).length ? { submit: d } : (st.step === 1 ? null : null);
  }
  function exportRows(h, d) {
    const H = { settings: M.cleanSettings(h.settings), nPlayers: h.result.nPlayers, nNeed: h.result.nNeed, byWindow: h.result.byWindow }, r = resultOf(H), c = costOf(H, r), s = H.settings;
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id], w = x.need ? 1 : x.wdWindow || null, g = d.moves.find(m => m.player === p.id && m.step === 1);
      return { round: h.roundNo, label: h.label, cash_pct: s.cashPct, sale_price_pct: s.salePricePct, bad_loans_pct: s.lossPct, insurance: s.insurance, insurance_limit: s.insuranceLimit, lender_of_last_resort: s.backstop, need_cash_pct: s.needPct, windows: s.windows,
        depositors: r.n, needed_cash: H.nNeed, withdrew: r.w + r.late, ran: c.ran, bank_outcome: r.status, lost_to_run: c.destroyed.toFixed(2), display_name: p.name, needed_cash_today: !!x.need, withdrew_in_window: w ?? '', guess_pct: g && g.data.guess != null ? g.data.guess : '', payout: (M.payoutFor(r, w) ?? 0).toFixed(2) }; });
  }

  const game = { id: 'bank-run', title: 'Bank Run', tagline: 'Everyone has $100 in the same bank. Hold or withdraw. What you receive depends on what everyone else does.',
    fields, presets, buildSettings, steps, rules: rulesFor, assign, afterStep, resolve, controls, stepLabel, closeLabel,
    renderProjector, renderStudent: renderStudentWrapped, wireStudent, renderInstructor, sim, exportRows, openLabel: 'Open withdrawals' };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
