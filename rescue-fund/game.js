/* The Rescue Fund (Panic of 1907) on the shared classroom toolkit (Mar 9, after 09.7–09.9).
   Spec: classroom/specs/rescue-fund.md. Commonwealth Trust is solvent but short T today.
   Every student is a large or small bank with free cash and a loss if Commonwealth fails.
   Hidden pledges over two windows (a pledge can only rise). All or nothing: if total pledges
   P < T, every pledge is refunded and Commonwealth fails; if P >= T, every bank lends the same
   share T/P of its pledge, the loan is repaid, and lending costs a set amount per dollar lent.
   Points lost = cost × lent + (loss, if it failed). Treatment: the window 1 total is shown
   (Morgan in the library) or kept private. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc } = ui;
  const sum = a => (a || []).reduce((x, y) => x + y, 0);
  const pct = x => x == null || !isFinite(x) ? '—' : Math.round(x * 100) + '%';
  const n1 = x => x == null || !isFinite(x) ? '—' : (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));
  const n2 = x => x == null || !isFinite(x) ? '—' : x.toFixed(2);

  const fields = [
    { id: 'show', label: 'Show the total pledged after window 1', type: 'checkbox' },
    { id: 'targetPct', label: 'Target T (% of all free cash)', type: 'number', min: 10, max: 90, step: 5 },
    { id: 'costCents', label: 'Cost per dollar lent (cents)', type: 'number', min: 0, max: 50 },
    { id: 'largePct', label: 'Large banks (% of class, at least 2)', type: 'number', min: 0, max: 100, step: 5 },
    { id: 'largeCash', label: 'Large bank: free cash', type: 'number', min: 1, max: 100 },
    { id: 'largeLoss', label: 'Large bank: loss if Commonwealth fails', type: 'number', min: 0, max: 200 },
    { id: 'smallCash', label: 'Small bank: free cash', type: 'number', min: 1, max: 100 },
    { id: 'smallLoss', label: 'Small bank: loss if Commonwealth fails', type: 'number', min: 0, max: 200 }
  ];
  const base = { targetPct: 50, costCents: 15, largePct: 20, largeCash: 30, largeLoss: 40, smallCash: 10, smallLoss: 8 };
  const presets = [
    { id: 'private', label: 'Private pledges', note: 'Pledges are hidden: no one sees a total until the reveal. Two windows; a pledge can only rise.', values: Object.assign({ show: false }, base) },
    { id: 'morgan', label: 'Morgan in the library', note: 'The run moves to the next trust company. Same banks, cash, losses, target, and cost. One change: after window 1, everyone sees the total pledged and the gap.', values: Object.assign({ show: true }, base) }
  ];
  const clean = v => { v = v || {}; const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { show: !!v.show, targetPct: n(v.targetPct, 50, 10, 90), costCents: n(v.costCents, 15, 0, 50), largePct: n(v.largePct, 20, 0, 100),
      largeCash: Math.round(n(v.largeCash, 30, 1, 100)), largeLoss: n(v.largeLoss, 40, 0, 200), smallCash: Math.round(n(v.smallCash, 10, 1, 100)), smallLoss: n(v.smallLoss, 8, 0, 200) }; };
  function buildSettings(v) {
    const s = clean(v);
    s.input = {
      '1': { fields: { pledge: { type: 'int', label: 'Your pledge', min: 0, maxPriv: 'cash', optional: true }, predict: { type: 'int', label: 'Your prediction', min: 0, max: 300, optional: true } } },
      '2': { fields: { pledge: { type: 'int', label: 'Your pledge', minPriv: 'pledged', maxPriv: 'cash', optional: true } } }
    };
    return s;
  }
  const steps = () => 2;
  const roleOf = (s, role) => role === 'large' ? { role, cash: s.largeCash, loss: s.largeLoss } : { role: 'small', cash: s.smallCash, loss: s.smallLoss };

  /* ---------- the model ---------- */
  function outcome(s, banks) {   // banks: [{role, cash, loss, pledge}]
    s = clean(s);
    const cashAll = sum(banks.map(b => b.cash)), T = s.targetPct / 100 * cashAll, P = sum(banks.map(b => b.pledge)), ok = banks.length > 0 && P >= T - 1e-9;
    const frac = ok ? (P > 0 ? T / P : 0) : 0, cost = s.costCents / 100;
    const rows = banks.map(b => { const lent = b.pledge * frac; return Object.assign({}, b, { lent, lost: cost * lent + (ok ? 0 : b.loss) }); });
    const by = r => { const g = rows.filter(x => x.role === r); return { n: g.length, pledged: sum(g.map(x => x.pledge)), cash: sum(g.map(x => x.cash)), lost: sum(g.map(x => x.lost)) }; };
    return { T, P, ok, frac, rows, large: by('large'), small: by('small'), room: sum(rows.map(x => x.lost)), cashAll };
  }

  /* ---------- instructor side ---------- */
  function assign({ S, settings, roster, rng }) {
    const s = clean(settings), prev = {};
    for (const h of S.history) if (h.result && h.result.roles) Object.assign(prev, h.result.roles);
    const n = roster.length, want = n < 2 ? 0 : Math.min(n, Math.max(2, Math.round(s.largePct / 100 * n)));
    const roles = {}; let nl = 0;
    for (const p of roster) if (prev[p.id]) { roles[p.id] = prev[p.id]; if (prev[p.id] === 'large') nl++; }
    for (const p of ui.shuffle(roster.filter(p => !prev[p.id]), rng)) { roles[p.id] = nl < want ? 'large' : 'small'; if (roles[p.id] === 'large') nl++; }
    const priv = {}; let cashAll = 0;
    for (const p of roster) { const r = roleOf(s, roles[p.id]); priv[p.id] = Object.assign(r, { pledged: 0 }); cashAll += r.cash; }
    return { private: priv, pub: { n, nLarge: nl, nSmall: n - nl, T: s.targetPct / 100 * cashAll, cashAll, roles, w1: null } };
  }
  const firstPledges = data => { const out = {}; for (const m of data.moves) if (m.step === 1 && Number.isInteger(m.data.pledge)) out[m.player] = m.data.pledge; return out; };
  function afterStep({ S, data, closedStep }) {
    if (closedStep !== 1) return {};
    const f = firstPledges(data), priv = {}; let tot = 0;
    for (const id in data.private) { const x = Math.min(data.private[id].cash, f[id] || 0); priv[id] = { pledged: x }; tot += x; }
    return { private: priv, pub: { w1: clean(S.settings).show ? tot : null, w1Hidden: tot } };
  }
  function resolve({ S, settings, data }) {
    const s = clean(settings), P = data.private, f = firstPledges(data), w2 = {};
    for (const m of data.moves) if (m.step === 2 && Number.isInteger(m.data.pledge)) w2[m.player] = m.data.pledge;
    const ids = Object.keys(P);
    const banks = ids.map(id => { const p1 = Math.min(P[id].cash, P[id].pledged || f[id] || 0); return { id, role: P[id].role, cash: P[id].cash, loss: P[id].loss, pledge: Math.min(P[id].cash, Math.max(p1, w2[id] ?? p1)) }; });
    const o = outcome(s, banks), priv = {};
    for (const r of o.rows) priv[r.id] = { pledge: r.pledge, lent: r.lent, lost: r.lost, saved: o.ok };
    const preds = []; for (const m of data.moves) if (m.step === 1 && Number.isFinite(m.data.predict)) preds.push(m.data.predict);
    const w1 = sum(ids.map(id => Math.min(P[id].cash, f[id] || 0)));
    const failCost = sum(o.rows.map(x => x.loss));
    const dist = role => { const g = o.rows.filter(r => r.role === role); return [g.filter(r => r.pledge === 0).length, g.filter(r => r.pledge > 0 && r.pledge < r.cash).length, g.filter(r => r.pledge >= r.cash).length]; };
    return { private: priv, result: { n: ids.length, nLarge: o.large.n, nSmall: o.small.n, show: s.show, T: o.T, P: o.P, ok: o.ok, frac: o.frac, w1, cashAll: o.cashAll,
      largeShare: o.large.cash ? o.large.pledged / o.large.cash : null, smallShare: o.small.cash ? o.small.pledged / o.small.cash : null,
      largeLost: o.large.n ? o.large.lost / o.large.n : null, smallLost: o.small.n ? o.small.lost / o.small.n : null, room: o.room, failCost,
      predMedian: ui.median(preds), nPred: preds.length, distLarge: dist('large'), distSmall: dist('small'), roles: S.pub.roles } };
  }

  /* ---------- screens ---------- */
  function rules(s, S) {
    s = clean(s);
    return `<ul class="rules"><li><b>October 1907.</b> Commonwealth Trust is <b>solvent</b>: its loans are worth more than its deposits at normal prices. But depositors want more cash today than it has. It is short <b>T</b>${S && S.pub && S.pub.T ? ` = <b>${n1(S.pub.T)}</b>` : ''}. Without a loan it must sell loans at half price, and it fails.</li>
      <li>You run a bank in the city: <b>large</b> (free cash ${s.largeCash}, you lose ${s.largeLoss} if Commonwealth fails) or <b>small</b> (cash ${s.smallCash}, loss ${s.smallLoss}). About ${s.largePct}% of you are large; your phone tells you which.</li>
      <li>Pledge any part of your free cash to a <b>rescue pool</b>. Pledges are hidden. Two windows; in window 2 you may raise your pledge, not lower it.</li>
      <li><b>Short of T:</b> every pledge is refunded, Commonwealth fails, and every bank takes its loss.</li>
      <li><b>T or more:</b> every bank lends the same share of its pledge (T ÷ total pledged). The loan is repaid with interest, but tying up cash in a panic costs <b>${s.costCents}¢ per dollar lent</b>.</li>
      <li>${s.show ? '<b>This round, the total pledged after window 1 goes on the screen.</b>' : 'This round, no one sees a total until the reveal.'}</li>
      <li>Your score is <b>points lost</b> = ${(s.costCents / 100).toFixed(2)} × amount lent + your loss if it fails. Lower is better.</li></ul>`;
  }
  function meter(T, P, w1) {
    const top = Math.max(T * 1.25, P, 1), p = x => Math.min(100, x / top * 100).toFixed(1);
    return `<div style="position:relative;height:40px;border-radius:9px;background:#e4eae7;margin:30px 0 30px">
      <div style="position:absolute;inset:0 auto 0 0;width:${p(P)}%;background:${P >= T ? 'var(--teal)' : '#eb6834'};border-radius:9px 0 0 9px"></div>
      ${w1 != null ? `<i style="position:absolute;top:-6px;bottom:-6px;left:${p(w1)}%;border-left:2px dotted #152f39"><span style="position:absolute;bottom:-20px;left:4px;font-size:.78rem;font-style:normal;white-space:nowrap">after window 1: ${n1(w1)}</span></i>` : ''}
      <i style="position:absolute;top:-8px;bottom:-8px;left:${p(T)}%;border-left:3px solid #152f39"><span style="position:absolute;top:-20px;left:6px;font-size:.85rem;font-weight:800;font-style:normal;white-space:nowrap">T = ${n1(T)}</span></i></div>`;
  }
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.T != null); if (!done.length) return '';
    return '<h3>Round comparison</h3>' + ui.table(['Round', 'Total shown?', 'Pledged of T', 'Commonwealth', 'Large banks pledged', 'Small banks pledged', 'Points lost, room'], done.map(h => { const r = h.result;
      return [`${h.roundNo}. ${esc(h.label)}`, r.show ? 'after window 1' : 'no', `${n1(r.P)} of ${n1(r.T)}`, r.ok ? '✔ saved' : '✖ failed', pct(r.largeShare), pct(r.smallShare), n1(r.room)]; }));
  }
  function distTable(r) {
    return ui.table(['', 'Pledged nothing', 'Some', 'All their cash', 'Share of cash pledged'], [
      [`Large banks (${r.nLarge})`, ...r.distLarge, pct(r.largeShare)], [`Small banks (${r.nSmall})`, ...r.distSmall, pct(r.smallShare)]]);
  }
  function renderProjector(S, ctx) {
    const s = clean(S.settings), head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>Will the banks save Commonwealth Trust?</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S) || '<p class="sub">Results from each round collect here.</p>'}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const shown = S.step >= 2 && S.pub.w1 != null;
      const st = S.phase === 'closed' ? 'Pledges are closed. Results in a moment.' : S.pending ? 'Counting window 1…' : `Window ${S.step} of 2 is open. ${S.nMoved} of ${S.nPlayers} have answered.`;
      return `${head}<h2>${shown ? `Pledged so far: ${n1(S.pub.w1)} of ${n1(S.pub.T)}` : 'Pledges are hidden'}</h2>
        ${shown ? meter(S.pub.T, S.pub.w1, null) + `<div class="banner ${S.pub.w1 >= S.pub.T ? '' : 'warn'}"><strong style="font-size:1.3em">${S.pub.w1 >= S.pub.T ? 'The pool has reached T.' : `Gap: ${n1(S.pub.T - S.pub.w1)}`}</strong>Window 2: you may raise your pledge.</div>` : ''}
        ${ui.tiles([['Target T', n1(S.pub.T), 'hi'], ['Large banks', S.pub.nLarge], ['Small banks', S.pub.nSmall], ['Free cash in the room', n1(S.pub.cashAll)]])}
        <div class="banner"><strong>${st}</strong>${s.show ? 'The window 1 total goes on the screen before window 2.' : 'No one sees a total until the reveal.'}</div>${ctx.joinLine()}`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    const r = h.result;
    return `${head}<div class="split"><div>
      <div class="label">Commonwealth Trust</div><div class="lead">${r.ok ? 'Saved' : 'Failed'}</div>
      <p class="sub">${n1(r.P)} pledged against T = ${n1(r.T)}. ${r.ok ? `Every bank lent ${pct(r.frac)} of its pledge, and the loan is repaid.` : 'Every pledge is refunded, and every bank takes its loss.'}</p>
      ${ui.tiles([['Pledged after window 1', n1(r.w1)], ['Class median prediction', r.predMedian != null ? r.predMedian + '% of T' : '—'], ['Avg points lost, large', n2(r.largeLost)], ['Avg points lost, small', n2(r.smallLost)], ['Points lost, whole room', n1(r.room)], [r.ok ? 'Room’s points lost had it failed' : 'Room’s points lost had it been saved', r.ok ? n1(r.failCost) : n1(clean(h.settings).costCents / 100 * r.T)]])}
      </div><div>${meter(r.T, r.P, r.w1)}${distTable(r)}</div></div>${comparison(S)}`;
  }
  function example(s) {
    s = clean(s);
    const c = s.costCents / 100;
    return `<details open><summary>Worked example</summary><p class="note" style="margin:6px 0 0">The pool needs 420 and the other banks have pledged 410. A large bank that pledges 10 closes the gap: the pool reaches 420, it lends 10, and loses ${(c * 10).toFixed(2)} points instead of ${s.largeLoss}. If it pledges 30, the pool is 440, every bank lends 420 ÷ 440 of its pledge, and it lends about 28.6 (${(c * 30 * 420 / 440).toFixed(2)} points). If the others had pledged 420 already, its best pledge would be nothing.</p></details>`;
  }
  function renderStudent(S, me) {
    const s = clean(S.settings), p = me.priv[S.roundNo] || {}, m1 = me.moves['1'] || {}, m2 = me.moves['2'];
    if (S.phase === 'instructions') return `<h2>Get ready</h2>${ui.brief('a bank: large or small, with free cash and a loss if Commonwealth Trust fails. You see it when the round opens.', 'how much of your free cash to pledge to the rescue pool. In window 2 you may raise your pledge.', `if pledges reach T, every bank lends the same share of its pledge and is repaid; lending costs ${s.costCents}¢ per dollar lent. If they fall short, every pledge is refunded and Commonwealth fails.`)}${example(s)}`;
    const card = `<div class="banner"><strong>${p.role === 'large' ? '🏦 Large bank' : '🏠 Small bank'}</strong><span class="bigpay">Free cash ${p.cash}</span><span class="note">You lose <b>${p.loss}</b> if Commonwealth fails. The pool needs T = <b>${n1(S.pub.T)}</b>.</span></div>`;
    if (S.phase === 'open' && S.pending) return '<h2>Counting window 1…</h2>';
    if (S.phase === 'open') {
      const w2 = S.step === 2, cur = w2 ? (m2 && m2.pledge != null ? m2.pledge : p.pledged || 0) : m1.pledge;
      const info = w2 ? (S.pub.w1 != null ? `<div class="banner ${S.pub.w1 >= S.pub.T ? '' : 'warn'}"><strong>Pledged after window 1: ${n1(S.pub.w1)} of ${n1(S.pub.T)}</strong>${S.pub.w1 >= S.pub.T ? 'The pool has reached T.' : `Gap: ${n1(S.pub.T - S.pub.w1)}.`}</div>` : '<p class="sub">No one sees a total this round.</p>') : '';
      const got = w2 ? (m2 ? `Your pledge is now <b>${m2.pledge ?? p.pledged}</b>.` : `Your pledge stands at <b>${p.pledged || 0}</b> unless you raise it.`) : me.moves['1'] ? `Received: pledge ${m1.pledge ?? 0}${m1.predict != null ? `, prediction ${m1.predict}%` : ''}. You can change it until the window ends.` : '';
      return `<h2>Window ${S.step} of 2</h2>${card}${info}
        ${!w2 ? `<div class="field" style="margin:10px 0"><label for="predInput">Your prediction: total pledges will reach what % of T?</label><input id="predInput" type="number" min="0" max="300" step="5" inputmode="numeric" value="${m1.predict ?? ''}"></div>` : ''}
        <div class="field"><label for="pledgeInput">${w2 ? `Your pledge (at least ${p.pledged || 0}, at most ${p.cash})` : `Your pledge (0 to ${p.cash})`}</label><input id="pledgeInput" type="number" min="${w2 ? p.pledged || 0 : 0}" max="${p.cash}" step="1" inputmode="numeric" value="${cur ?? ''}"></div>
        <div class="actions"><button class="btn primary" id="pBtn">Send pledge</button>${!w2 ? '<button class="btn secondary" id="zeroBtn">Pledge nothing</button>' : ''}</div>
        <p class="msg good" id="receipt">${got}</p>`;
    }
    if (S.phase === 'closed') return `<h2>Pledges are closed</h2>${card}<p class="sub">Your pledge: ${m2 && m2.pledge != null ? m2.pledge : p.pledged || m1.pledge || 0}. Waiting for the reveal.</p>`;
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return '<p>Waiting for results.</p>';
    const r = h.result;
    return `<h2>${r.ok ? 'Commonwealth was saved' : 'Commonwealth failed'}</h2><div class="bigpay">Points lost: ${n2(p.lost)}</div>
      <p class="sub">${r.ok ? `You pledged ${p.pledge} and lent ${n2(p.lent)} (${pct(r.frac)} of your pledge), at ${s.costCents}¢ a dollar.` : `Pledges reached ${n1(r.P)} of ${n1(r.T)}, so yours (${p.pledge}) was refunded, and you took your loss of ${p.loss}.`}</p>
      ${ui.table(['', ''], [['Total pledged', `${n1(r.P)} of ${n1(r.T)}`], ['Your role', p.role === 'large' ? 'Large bank' : 'Small bank'], ['Your pledge', p.pledge], ...(m1.predict != null ? [['Your prediction', m1.predict + '% of T']] : [])])}`;
  }
  function wireStudent(root, ctx) {
    const num = id => { const el = root.querySelector('#' + id); return el && el.value.trim() !== '' ? Math.round(Number(el.value)) : null; };
    const pred = root.querySelector('#predInput');
    const b = root.querySelector('#pBtn'); if (b) b.onclick = () => { const v = num('pledgeInput'); if (v == null) return ctx.say('Enter a pledge (0 is fine).'); const d = { pledge: v }; if (pred) d.predict = num('predInput'); ctx.submit(d); };
    const z = root.querySelector('#zeroBtn'); if (z) z.onclick = () => { const d = { pledge: 0 }; if (pred) d.predict = num('predInput'); ctx.submit(d); };
  }
  function renderInstructor(S) {
    if (S.phase === 'open') return `<div class="banner"><strong>Window ${S.step}${S.pending ? ' · counting' : ''}: ${S.nMoved} of ${S.nPlayers} answered</strong>T = ${n1(S.pub.T)}${S.step === 2 && S.pub.w1Hidden != null ? ` · after window 1: ${n1(S.pub.w1Hidden)} (${S.pub.w1 != null ? 'shown' : 'not shown to students'})` : ''}</div>`;
    const h = S.history.find(x => x.roundNo === S.roundNo);
    if (h && (S.phase === 'revealed' || S.phase === 'debrief')) return `<div class="banner"><strong>${h.result.ok ? 'Saved' : 'Failed'}: ${n1(h.result.P)} of ${n1(h.result.T)}</strong>Large ${pct(h.result.largeShare)} · small ${pct(h.result.smallShare)} of cash pledged</div>`;
    return '';
  }

  /* Simulated banks: large banks mostly pledge in full; a small bank pledges with a modest
     probability, higher when it can see a gap it could help close. Each bank's draw is fixed for
     the round and window (seeded by its id), so repeated polls do not give it extra chances. */
  function sim(st) {
    const p = st.me.priv[st.roundNo]; if (!p || st.me.moves[String(st.step)]) return null;
    const r = ui.rng(ui.hash(st.me.id + ':' + st.roundNo + ':' + st.step)), u = r(), v = r(), w = r();
    if (st.step === 1) {
      const go = p.role === 'large' ? u < 0.8 : u < 0.2;
      return { submit: { pledge: go ? (p.role === 'large' || v < 0.6 ? p.cash : Math.ceil(p.cash / 2)) : 0, predict: Math.round((60 + 80 * w) / 5) * 5 } };
    }
    if ((p.pledged || 0) >= p.cash) return null;
    const T = st.pub.T, gap = st.pub.w1 != null ? T - st.pub.w1 : null;
    const chance = gap == null ? (p.role === 'large' ? 0.3 : 0.06) : gap <= 0 ? 0.02 : p.role === 'large' ? 0.8 : Math.min(0.5, 0.1 + gap / Math.max(1, T));
    return u < chance ? { submit: { pledge: p.cash } } : null;
  }
  function exportRows(h, d) {
    const first = {}; for (const m of d.moves) if (m.step === 1) first[m.player] = m.data;
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id];
      return { round: h.roundNo, label: h.label, total_shown: h.result.show, target: h.result.T, pledged_total: h.result.P, saved: h.result.ok, display_name: p.name, role: x.role, free_cash: x.cash, loss_if_fails: x.loss,
        window1_pledge: first[p.id] && first[p.id].pledge != null ? first[p.id].pledge : '', final_pledge: x.pledge ?? '', prediction_pct: first[p.id] && first[p.id].predict != null ? first[p.id].predict : '', lent: x.lent != null ? x.lent.toFixed(2) : '', points_lost: x.lost != null ? x.lost.toFixed(2) : '' }; });
  }

  /* ---------- debrief ---------- */
  const CHECK = { q: 'A rescue pool needs 420. The other banks have pledged 414 in all. You are a small bank with 10 of free cash, and you lose 8 if the target fails. Lending costs 15¢ per dollar lent, and pledges are refunded if the pool falls short. How much do you pledge?',
    options: [['a', '6: exactly enough to close the gap'], ['b', '10: everything, to be safe'], ['c', '0: my pledge is too small to matter'], ['d', '0: pledging is a donation']], answer: 'a',
    why: 'Pledging 6 closes the gap. You lend 6 at a cost of 0.9 and avoid a loss of 8. Pledging 10 also works, but the pool then holds 424, every bank lends 420 ÷ 424 of its pledge, and you lend about 9.9 (1.49 points) instead of 6.',
    trap: 'treating your own pledge as too small to matter, or as a donation. When the gap is small, your pledge decides the outcome; and the loan is repaid with interest.' };
  function debrief(S, hh) {
    const r = hh.result, prev = S.history.filter(x => x.result && x.roundNo < hh.roundNo).pop();
    return {
      explain: `${n1(r.P)} was pledged against T = ${n1(r.T)}, and Commonwealth ${r.ok ? 'was saved' : 'failed'}. Large banks pledged ${pct(r.largeShare)} of their cash; small banks pledged ${pct(r.smallShare)}. Why would a small bank that loses ${clean(hh.settings).smallLoss} if the rescue fails pledge nothing?${prev ? ` Last round (${prev.result.show ? 'total shown' : 'private'}), pledges reached ${n1(prev.result.P)}. What did seeing the total after window 1 change?` : ''}`,
      transfer: 'A central bank could lend Commonwealth T against its loans, valued at normal prices less a haircut, at a penalty rate. What would that do to this game? Now suppose Commonwealth\'s loans are worth less than its deposits even at normal prices: would a pool loan save it, and who would bear the loss?',
      next: !prev && !r.show ? 'Next round, everyone sees the total after window 1. Predict: will more of the target be pledged, and by whom?' : '',
      check: CHECK
    };
  }

  const game = { id: 'rescue-fund', title: 'The Rescue Fund', tagline: 'October 1907, no central bank. A sound trust company is short of cash. Will the city\'s banks save it, with their own money?',
    fields, presets, buildSettings, steps, rules, assign, afterStep, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows, debrief,
    nonresponse: 'window 1: a pledge of 0 and no prediction; window 2: the window 1 pledge stands.',
    expected: S => S.step === 1 ? S.nPlayers : null,
    compare: { metric: 'the total pledged and who pledged it', note: 'Same banks, cash, losses, target, cost, and two windows; the only change is whether the window 1 total is shown. Round 2 also comes second, after students saw round 1, so the difference is suggestive.' },
    stepLabel: S => clean(S.settings).show ? 'End window 1: show the total' : 'End window 1', closeLabel: S => S.step < 2 ? 'End the round now' : 'Close pledges', openLabel: 'Open window 1',
    model: { outcome } };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
