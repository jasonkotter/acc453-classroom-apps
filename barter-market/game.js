/* Barter Market on the shared classroom toolkit. Rules: SPEC.md.
   Trades run on the server (cls_trade in _shared/schema.sql), so two students' goods are
   swapped in one step and the same good can never be traded twice. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc } = ui;
  const GOODS = [['bread', '🍞', 'Bread'], ['fish', '🐟', 'Fish'], ['wool', '🧶', 'Wool'], ['salt', '🧂', 'Salt'], ['eggs', '🥚', 'Eggs'], ['milk', '🥛', 'Milk'], ['wood', '🪵', 'Wood'], ['pots', '🏺', 'Pots'], ['apples', '🍎', 'Apples'], ['cheese', '🧀', 'Cheese']];
  const G = Object.fromEntries(GOODS.map(g => [g[0], g]));
  const good = id => G[id] ? `${G[id][1]} ${G[id][2]}` : esc(id);

  const fields = [
    { id: 'nGoods', label: 'Kinds of goods', type: 'number', min: 3, max: 10 },
    { id: 'minutes', label: 'Minutes to trade', type: 'number', min: 1, max: 15, step: 0.5 },
    { id: 'money', label: 'Money: one token each; any good sells for a token', type: 'checkbox' }
  ];
  const presets = [
    { id: 'barter', label: 'Barter', note: 'Goods for goods only. You may accept a good you do not want, if you think you can trade it on.', values: { nGoods: 8, minutes: 3, money: false } },
    { id: 'money', label: 'Money', note: 'Same goods and wants, new random draw. Everyone also gets one token, and any good can be sold for a token or bought with one.', values: { nGoods: 8, minutes: 3, money: true } }
  ];
  const clean = v => ({ nGoods: Math.max(3, Math.min(10, Math.round(Number(v.nGoods) || 8))), minutes: Math.max(1, Math.min(15, Number(v.minutes) || 3)), money: !!v.money });
  function buildSettings(v) {
    const s = clean(v), ids = GOODS.slice(0, s.nGoods).map(g => g[0]);
    s.goods = ids; s.price = 1;
    s.input = { '*': { required: ['to', 'kind'], fields: {
      to: { type: 'tag', label: 'Partner tag' },
      kind: { type: 'choice', label: 'Kind of offer', in: s.money ? ['swap', 'sell', 'buy'] : ['swap'] },
      give: { type: 'privItem', label: 'What you give', from: 'goods', optional: true },
      get: { type: 'choice', label: 'What you get', in: ids, optional: true }
    } } };
    return s;
  }
  function rules(s) {
    s = clean(s);
    const out = [
      'You hold one good and want a different one. Your phone shows both, and your <b>trading tag</b>.',
      '<b>Walk around the room</b> and talk: call out what you have and what you want.',
      'To trade, enter your partner\'s tag and the goods, and send the offer. Your partner accepts it on their phone, and the goods change hands at once.',
      'When you hold the good you want, you consume it and you are <b>done</b>. Keep helping others if you like.',
      s.money ? 'You also have <b>one token</b>. Anyone will take a token for a good: you can <b>sell</b> your good for a token, then <b>buy</b> the good you want with it.' : 'There is no money: a trade is goods for goods. You may accept a good you do not want, if you think you can trade it on.',
      `You have ${s.minutes} minutes.`
    ];
    return '<ul class="rules">' + out.map(x => `<li>${x}</li>`).join('') + '</ul>';
  }

  /* ---------- assignments: every good is held as often as it is wanted ---------- */
  function assign({ S, settings, roster, rng }) {
    const s = settings, ids = s.goods, n = roster.length, priv = {};
    const people = ui.shuffle(roster.map(p => p.id), rng);
    const has = people.map((_, i) => ids[i % ids.length]);
    let want = ui.shuffle(has, rng);
    for (let i = 0; i < n; i++) if (want[i] === has[i]) {   // nobody may want what they hold: swap with someone it suits
      const j = want.findIndex((w, k) => k !== i && w !== has[i] && want[i] !== has[k]);
      if (j >= 0) [want[i], want[j]] = [want[j], want[i]];
      else want[i] = ids.find(x => x !== has[i]);
    }
    people.forEach((id, i) => { priv[id] = { goods: [has[i]], want: want[i], tokens: s.money ? 1 : 0, done: false, trades: 0, start: has[i] }; });
    const endsAt = S.now + s.minutes * 60000;
    return { private: priv, pub: { openedAt: S.now, endsAt, n } };
  }

  function resolve({ S, settings, data }) {
    const P = data.private, ids = Object.keys(P), t0 = S.pub.openedAt;
    const done = ids.filter(id => P[id].done), times = done.map(id => Math.max(0, (P[id].doneAt - t0) / 1000)).sort((a, b) => a - b);
    const trades = ui.sum(ids.map(id => P[id].trades || 0)) / 2;
    const holding = ids.filter(id => !P[id].done && (P[id].goods || []).some(g => g !== P[id].start)).length;   // took a good they did not want
    const timeline = [[0, 0], ...times.map((t, i) => [Math.round(t), i + 1])];
    return { result: { n: ids.length, done: done.length, trades, holding, median: ui.median(times), timeline, money: !!settings.money, seconds: settings.minutes * 60 } };
  }

  /* ---------- projector ---------- */
  function comparison(S) {
    const done = S.history.filter(h => h.result && h.result.n != null);
    if (!done.length) return '';
    const colors = ['#2a78d6', '#087d75', '#eb6834', '#9d3c35'];
    const chart = ui.lines(done.map((h, i) => ({ label: `${h.roundNo}. ${esc(h.label)}`, color: colors[i % 4], points: h.result.timeline.map(([t, k]) => [t, k / h.result.n * 100]).concat([[h.result.seconds, h.result.done / h.result.n * 100]]) })),
      { xLabel: 'Seconds since trading opened', yLabel: 'Share done (%)', yMax: 100, xMin: 0, yFmt: y => Math.round(y) + '%', xFmt: x => Math.round(x), aria: 'Share of students done over time, by round' });
    return `<h3 style="margin-top:0">Barter against money</h3>` + ui.table(['Round', 'Done', 'Share done', 'Trades', 'Trades per student done', 'Half of those done by'],
      done.map(h => { const r = h.result; return [`${h.roundNo}. ${esc(h.label)}`, `${r.done} of ${r.n}`, `<b>${ui.pct(r.done / Math.max(1, r.n))}</b>`, r.trades, r.done ? (r.trades / r.done).toFixed(1) : '—', r.median != null ? Math.round(r.median) + ' s' : '—']; })) + chart;
  }
  function renderProjector(S, ctx) {
    const s = S.settings, head = `<div class="label">Round ${S.roundNo} · ${esc(S.label)}</div>`;
    if (S.phase === 'instructions')
      return `${head}<h2>${s.money ? 'Now with money' : 'Trade by barter'}</h2><div class="split"><div>${rules(s)}${ctx.joinLine()}</div><div>${comparison(S) || `<p class="sub">Goods in this market: ${s.goods.map(good).join(' · ')}</p>`}</div></div>`;
    if (S.phase === 'open' || S.phase === 'closed') {
      const pts = ctx.live.history.map(x => [Math.max(0, (x.t - S.pub.openedAt) / 1000), x.nDone / Math.max(1, S.nPlayers) * 100]);
      return `${head}<div class="split"><div><h2>${S.phase === 'open' ? 'Trading is open' : 'Trading is closed'}</h2>
          ${S.phase === 'open' ? `<div class="label">Time left</div>${ui.countdown(S.pub.endsAt)}` : ''}
          ${ui.tiles([['Students done', `${S.nDone} of ${S.nPlayers}`, 'hi'], ['Share done', ui.pct(S.nDone / Math.max(1, S.nPlayers))]], 'two')}
          <div class="banner warn"><strong style="font-size:1.25em">Walk, talk, trade.</strong>Call out what you have and what you want. Offers go by trading tag.</div>${ctx.joinLine()}</div>
        <div>${ui.lines([{ points: pts.length ? pts : [[0, 0]], color: s.money ? '#087d75' : '#2a78d6', label: 'Share done' }], { xLabel: 'Seconds since trading opened', yLabel: 'Share done (%)', yMax: 100, xMin: 0, xMax: s.minutes * 60, yFmt: y => Math.round(y) + '%', xFmt: x => Math.round(x), aria: 'Share of students done so far' })}</div></div>`;
    }
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head + '<p>Waiting for results.</p>';
    const r = h.result;
    return `${head}<div class="split"><div><div class="label">${r.money ? 'With money' : 'By barter'}</div><div class="lead">${ui.pct(r.done / Math.max(1, r.n))} got what they wanted</div>
      ${ui.tiles([['Students done', `${r.done} of ${r.n}`], ['Trades made', r.trades], ['Trades per student done', r.done ? (r.trades / r.done).toFixed(1) : '—'], ['Holding a good they took to trade on', r.holding]], 'two')}
      ${S.phase === 'debrief' ? `<div class="banner"><strong>Talk about it</strong>Why was barter slow? Did anyone take a good they did not want, to trade it on? Which good would you have taken? What did the token do?</div>` : ''}
      </div><div>${comparison(S)}</div></div>`;
  }

  /* ---------- student ---------- */
  function offerText(o, from) {
    if (o.kind === 'sell') return `${from} sells you ${good(o.give)} for 1 token`;
    if (o.kind === 'buy') return `${from} buys your ${good(o.get)} for 1 token`;
    return `${from} gives ${good(o.give)} for your ${good(o.get)}`;
  }
  function renderStudent(S, me, ctx) {
    const s = S.settings, p = me.priv[S.roundNo] || {}, mine = me.moves[String(S.step)];
    const status = `<div class="row" style="justify-content:space-between;align-items:center"><div><div class="label">Your trading tag</div><div class="tagbig">${esc(me.tag)}</div></div>${S.phase === 'open' ? `<div style="text-align:right"><div class="label">Time left</div>${ui.countdown(S.pub.endsAt)}</div>` : ''}</div>`;
    const holdings = `${ui.tiles([['You have', (p.goods || []).length ? p.goods.map(good).join(', ') : 'nothing'], ['You want', p.done ? '✔ done' : good(p.want)], ...(s.money ? [['Tokens', p.tokens || 0]] : [])], s.money ? 'three' : 'two')}`;
    if (S.phase === 'instructions') return `<h2>Get ready to trade</h2>${status}<p class="sub">Your goods appear when trading opens.</p>`;
    if (S.phase === 'closed' || S.phase === 'revealed' || S.phase === 'debrief') {
      const h = S.history.find(x => x.roundNo === S.roundNo);
      return `<h2>${p.done ? '✔ You got what you wanted' : 'Trading is over'}</h2>${holdings}${h ? `<p class="sub">${h.result.done} of ${h.result.n} students got what they wanted, in ${h.result.trades} trades.</p>` : '<p class="sub">Waiting for the results.</p>'}`;
    }
    const inbox = me.inbox.map((o, i) => {
      const d = o.data, can = d.kind === 'sell' ? (p.tokens || 0) >= 1 : (p.goods || []).includes(d.get);
      const why = can ? '' : d.kind === 'sell' ? 'You have no token.' : `You don't have ${good(d.get)}.`;
      return `<div class="banner" style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span><b>${offerText(d, esc(o.tag) + ' (' + esc(o.name) + ')')}</b>${why ? `<br><span class="note">${why}</span>` : ''}</span><button class="btn primary" data-accept="${esc(o.tag)}" ${can ? '' : 'disabled'}>Accept</button></div>`;
    }).join('');
    const goodsOpts = (ids, sel) => ids.map(g => `<option value="${g}" ${g === sel ? 'selected' : ''}>${good(g)}</option>`).join('');
    const kinds = s.money ? `<div class="field"><label for="bKind">Offer</label><select id="bKind"><option value="swap">Swap goods</option><option value="sell">Sell my good for a token</option><option value="buy">Buy their good with a token</option></select></div>` : '';
    return `${status}${p.done ? '<div class="banner"><strong>✔ Done: you got what you wanted.</strong>You can still trade to help others.</div>' : ''}${holdings}
      ${me.inbox.length ? `<h3>Offers to you</h3>${inbox}` : ''}
      <h3>Make an offer</h3>
      ${mine ? `<div class="banner warn"><strong>Your offer to ${esc(mine.to)}</strong>${offerText(mine, 'You').replace('You gives', 'You give').replace('You sells you', 'You sell').replace('You buys your', 'You buy their')}. Waiting for them to accept.<div class="actions"><button class="btn secondary" id="bWithdraw">Withdraw offer</button></div></div>` : ''}
      <div class="row"><div class="field" style="max-width:120px"><label for="bTo">Partner's tag</label><input id="bTo" maxlength="3" autocapitalize="characters" autocomplete="off" placeholder="AB2"></div>${kinds}</div>
      <div class="row" style="margin-top:8px"><div class="field" id="giveField"><label for="bGive">You give</label><select id="bGive">${goodsOpts(p.goods || [])}</select></div>
        <div class="field" id="getField"><label for="bGet">You get</label><select id="bGet">${goodsOpts(s.goods, p.done ? null : p.want)}</select></div></div>
      <div class="actions"><button class="btn primary" id="bSend">Send offer</button></div>
      <p class="msg" id="receipt"></p>`;
  }
  function wireStudent(root, ctx) {
    root.querySelectorAll('[data-accept]').forEach(b => b.onclick = async () => { if (await ctx.trade(b.dataset.accept)) ctx.say('Traded!', true); });
    const kind = root.querySelector('#bKind'), send = root.querySelector('#bSend'); if (!send) return;
    const show = () => { const k = kind ? kind.value : 'swap'; root.querySelector('#giveField').classList.toggle('hidden', k === 'buy'); root.querySelector('#getField').classList.toggle('hidden', k === 'sell'); };
    if (kind) { kind.onchange = show; show(); }
    send.onclick = async () => {
      const k = kind ? kind.value : 'swap', to = root.querySelector('#bTo').value.trim().toUpperCase();
      if (!to) return ctx.say('Enter your partner\'s tag.');
      const d = { to, kind: k };
      if (k !== 'buy') { const g = root.querySelector('#bGive').value; if (!g) return ctx.say('You have nothing to give.'); d.give = g; }
      if (k !== 'sell') d.get = root.querySelector('#bGet').value;
      if (await ctx.submit(d)) ctx.say(`Offer sent to ${to}. Ask them to accept it on their phone.`, true);
    };
    const w = root.querySelector('#bWithdraw'); if (w) w.onclick = () => ctx.submit(null);
  }
  function renderInstructor(S) {
    if (S.phase === 'open') return `<div class="banner"><strong>${S.nDone} of ${S.nPlayers} done</strong>Time left: ${ui.countdown(S.pub.endsAt)}. Close trading when time is up.</div>`;
    const h = S.history.find(x => x.roundNo === S.roundNo);
    return h ? `<div class="banner"><strong>${h.result.done} of ${h.result.n} done</strong>${h.result.trades} trades</div>` : '';
  }

  /* Simulated students hear only a few others at a time (`world` is the other simulated
     students; each tick a student "hears" five of them). */
  function sim(st, rand, world) {
    const s = st.settings, p = st.me.priv[st.roundNo]; if (!p) return null;
    const goods = p.goods || [];
    for (const o of st.me.inbox) {   // accept anything that gets me what I want; sometimes take a good to trade on
      const d = o.data;
      if (d.kind === 'swap' && goods.includes(d.get) && (d.give === p.want && !p.done || d.get !== p.want && rand() < 0.15)) return { trade: o.tag };
      if (d.kind === 'sell' && d.give === p.want && !p.done && (p.tokens || 0) >= 1) return { trade: o.tag };
      if (d.kind === 'buy' && goods.includes(d.get) && (d.get !== p.want || p.done)) return { trade: o.tag };
    }
    if (st.me.moves[String(st.step)] && rand() < 0.75) return null;   // give an offer time
    if (rand() < 0.4) return null;                                    // still walking around
    const heard = ui.shuffle(world, rand).slice(0, 5), mine = goods.filter(g => g !== p.want || p.done);
    if (!p.done) {
      if (s.money && (p.tokens || 0) >= 1) { const w = heard.find(x => (x.goods || []).includes(p.want)); if (w) return { submit: { to: w.tag, kind: 'buy', get: p.want } }; }
      for (const w of heard) { const g = mine.find(x => x === w.want); if (g && (w.goods || []).includes(p.want)) return { submit: { to: w.tag, kind: 'swap', give: g, get: p.want } }; }
    }
    if (s.money && mine.length) { const w = heard.find(x => x.want === mine[0] && !x.done && (x.tokens || 0) >= 1); if (w) return { submit: { to: w.tag, kind: 'sell', give: mine[0] } }; }
    return null;
  }
  function exportRows(h, d) {
    return d.players.filter(p => d.private[p.id]).map(p => { const x = d.private[p.id]; return { round: h.roundNo, label: h.label, money: !!h.settings.money, display_name: p.name, tag: p.tag, started_with: x.start, wanted: x.want, done: !!x.done, seconds_to_done: x.done ? Math.round((x.doneAt - h.pub.openedAt) / 1000) : '', trades: x.trades || 0, tokens_left: x.tokens || 0, holding: (x.goods || []).join(' ') }; });
  }

  const game = { id: 'barter', title: 'Barter Market', tagline: 'You have one thing and want another. Find someone to trade with, first by barter, then with money.',
    fields, presets, buildSettings, rules, assign, resolve, renderProjector, renderStudent, wireStudent, renderInstructor, sim, exportRows,
    showTag: true, broadcastStudentActions: true, openLabel: 'Open trading', closeLabel: () => 'Close trading' };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
