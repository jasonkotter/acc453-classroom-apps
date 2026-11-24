/* Class Check: the question engine (peer instruction) on the shared classroom toolkit.
   Question sets live in sets.js. Each question takes three steps in a round:
     vote → revote (after the class sees the split, without the answer) → review (answer shown).
   The instructor can skip the revote. Answer keys stay in sets.js and are published only at
   each review step; round settings carry the questions without their answers. */
(function () {
  'use strict';
  const ui = window.Classroom.ui, { esc } = ui;
  const SETS = window.CLASS_CHECK_SETS || [];
  const findSet = id => SETS.find(s => s.id === id);
  const KIND = ['vote', 'revote', 'review'];
  const at = step => ({ q: Math.floor((step - 1) / 3), k: KIND[(step - 1) % 3] });

  /* ---------- settings: questions without answers, and the answer rules per step ---------- */
  const fields = [
    { id: 'set', label: 'Question set', type: 'select', options: SETS.map(s => [s.id, s.title]) },
    { id: 'revote', label: 'Peer instruction: split, discuss, revote', type: 'checkbox' }
  ];
  const presets = SETS.map(s => ({ id: s.id, label: s.title, note: s.note || '', values: { set: s.id, revote: s.revote !== false } }));
  function strip(q) {
    const o = { type: q.type || 'choice', prompt: q.prompt, show: q.show || null, unit: q.unit || '', min: q.min, max: q.max, step: q.step };
    if (o.type === 'choice') o.options = q.options.map(x => ({ id: x.id, text: x.text }));
    return o;
  }
  function buildSettings(v) {
    const set = findSet(v.set) || SETS[0], qs = set.questions.map(strip), input = {};
    qs.forEach((q, i) => {
      const spec = q.type === 'choice' ? { required: ['choice'], fields: { choice: { type: 'choice', label: 'Your answer', in: q.options.map(o => o.id) } } }
        : q.type === 'prob' ? { required: ['p'], fields: { p: { type: 'int', label: 'Your probability', min: 0, max: 100 } } }
          : { required: ['value'], fields: { value: { type: 'num', label: 'Your guess', min: q.min ?? -1e9, max: q.max ?? 1e9 } } };
      input[String(3 * i + 1)] = spec; input[String(3 * i + 2)] = spec;
    });
    return { set: set.id, title: set.title, revote: !!v.revote, questions: qs, input };
  }
  const steps = s => 3 * ((s && s.questions) || []).length;
  function rules(s) {
    return `<ul class="rules"><li>${s.questions.length} questions. Answer on your phone; you can change your answer until the instructor moves on.</li>
      ${s.revote ? '<li>After everyone answers, the screen shows how the class split, without the answer. <b>Convince your neighbor</b>, then answer again.</li>' : ''}
      <li>Then the answer and the reasoning behind each choice. No points for speed.</li>
      <li>This is practice: it is not graded.</li></ul>`;
  }

  /* ---------- summaries ---------- */
  function splitOf(q, moves) {
    if (q.type === 'choice') { const c = Object.fromEntries(q.options.map(o => [o.id, 0])); for (const m of moves) if (m.choice in c) c[m.choice]++; return { n: moves.length, counts: c }; }
    const vals = moves.map(m => q.type === 'prob' ? m.p : m.value).filter(Number.isFinite);
    return { n: vals.length, vals: vals.sort((a, b) => a - b), median: ui.median(vals) };
  }
  const movesAt = (data, step) => { const out = {}; for (const m of data.moves) if (m.step === step) out[m.player] = m.data; return out; };
  let pendingActual = null;   // a number the instructor typed for "Guess the Release"
  function afterStep({ S, data, closedStep }) {
    const s = S.settings, { q, k } = at(closedStep), Q = s.questions[q], pub = {};
    if (k === 'vote' || k === 'revote') pub['split' + closedStep] = splitOf(Q, Object.values(movesAt(data, closedStep)));
    const next = at(S.step);
    if (next.k === 'review' && next.q === q) {
      const src = (findSet(s.set) || {}).questions[q] || {};
      const key = { explain: src.explain || '', fixed: src.fixed || null };
      if (Q.type === 'choice') { key.answer = src.answer; key.why = Object.fromEntries(src.options.map(o => [o.id, o.why || ''])); }
      else key.answer = Number.isFinite(src.answer) ? src.answer : pendingActual;
      pub['key' + q] = key; pendingActual = null;
    }
    return { pub };
  }

  /* ---------- instructor buttons ---------- */
  function controls(S, list, h) {
    if (S.phase !== 'open' || S.pending) return list;
    const { q, k } = at(S.step), s = S.settings, Q = s.questions[q], last = q === s.questions.length - 1;
    const needActual = Q.type !== 'choice' && !Number.isFinite(((findSet(s.set) || {}).questions[q] || {}).answer);
    const readActual = () => { if (!needActual) return true; const v = Number((document.getElementById('ccActual') || {}).value); if (!Number.isFinite(v) || document.getElementById('ccActual').value === '') { document.getElementById('instMsg').textContent = 'Enter the actual value first.'; return false; } pendingActual = v; return true; };
    const keep = list.filter(b => ['close', 'reveal', 'debrief'].includes(b.id)).map(b => Object.assign(b, { next: b.id === 'close' && k === 'review' && last }));
    const own = [];
    if (k === 'vote') {
      if (s.revote) own.push({ id: 'split', label: 'Show the split; revote', enabled: true, next: true, run: h.advance });
      own.push({ id: 'answer', label: 'Reveal the answer' + (s.revote ? ' now' : ''), enabled: true, next: !s.revote, secondary: s.revote, run: async () => { if (!readActual()) return; await h.advance(); if (needActual) pendingActual = Number(document.getElementById('ccActual').value); await h.advance(); } });
    } else if (k === 'revote') own.push({ id: 'answer', label: 'Reveal the answer', enabled: true, next: true, run: async () => { if (readActual()) await h.advance(); } });
    else if (!last) own.push({ id: 'nextq', label: `Next question (${q + 2} of ${s.questions.length})`, enabled: true, next: true, run: h.advance });
    return own.concat(keep);
  }

  /* ---------- drawing a question ---------- */
  function taccounts(show, key, q) {
    if (!show) return '';
    const wrong = key && q.type === 'choice' ? key.answer : null;
    const line = l => `<p style="${l.opt && l.opt === wrong ? 'background:var(--rose);border-radius:6px;padding:0 4px;text-decoration:line-through' : ''}"><span>${l.opt ? `<b>(${l.opt.toUpperCase()})</b> ` : ''}${esc(l.label)}</span><span>${esc(l.amount)}</span></p>`;
    return `<div class="tgrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px">${show.map(t => `<div><div class="label" style="margin-top:6px">${esc(t.who)}</div><div class="taccount"><div><h4>Assets</h4>${(t.assets || []).map(line).join('') || '<p class="note">—</p>'}</div><div><h4>Liabilities</h4>${(t.liabilities || []).map(line).join('') || '<p class="note">—</p>'}</div></div></div>`).join('')}</div>`;
  }
  function optionBars(Q, split1, split2, key) {
    const fin = split2 || split1, wrong = key && fin ? Q.options.filter(o => o.id !== key.answer).sort((x, y) => fin.counts[y.id] - fin.counts[x.id])[0] : null;
    const showWhy = id => key && (id === key.answer || (wrong && id === wrong.id && fin.counts[id] > 0));
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:0 10px">' + Q.options.map(o => {
      const a = split1 ? split1.counts[o.id] / Math.max(1, split1.n) : null, b = split2 ? split2.counts[o.id] / Math.max(1, split2.n) : null, right = key && key.answer === o.id;
      const bar = (x, c) => x == null ? '' : `<div style="height:12px;border-radius:4px;background:${c};width:${Math.max(1, x * 100)}%;margin-top:3px"></div>`;
      return `<div style="border:2px solid ${right ? 'var(--teal)' : 'var(--line)'};background:${right ? 'var(--mint)' : '#fff'};border-radius:12px;padding:7px 12px;margin:5px 0">
        <div style="display:flex;justify-content:space-between;gap:10px"><span><b>${o.id.toUpperCase()}.</b> ${o.text}${right ? ' <b>✔</b>' : ''}</span><span class="mono">${a != null ? ui.pct(a) : ''}${b != null ? ' → ' + ui.pct(b) : ''}</span></div>
        ${bar(a, '#b7c6c2')}${bar(b, right ? 'var(--teal)' : 'var(--orange)')}
        ${showWhy(o.id) && key.why && key.why[o.id] ? `<div class="note" style="margin-top:3px">${o.id === key.answer ? '' : '<b>Most popular wrong answer.</b> '}${key.why[o.id]}</div>` : ''}</div>`;
    }).join('') + '</div>';
  }
  function numberSummary(Q, split, key) {
    if (!split || !split.n) return '<p class="note">No answers.</p>';
    const vals = split.vals, lo = Math.min(...vals, key && Number.isFinite(key.answer) ? key.answer : Infinity), hi = Math.max(...vals, key && Number.isFinite(key.answer) ? key.answer : -Infinity);
    const nb = 12, w = (hi - lo) / nb || 1, bins = Array.from({ length: nb }, (_, i) => ({ lo: lo + i * w, n: 0 }));
    for (const v of vals) bins[Math.min(nb - 1, Math.floor((v - lo) / w))].n++;
    const ai = key && Number.isFinite(key.answer) ? Math.min(nb - 1, Math.floor((key.answer - lo) / w)) : -1;
    const fmt = x => ui.num(x, Math.abs(hi - lo) < 10 ? 1 : 0) + (Q.unit === '%' ? '%' : '');
    const close = key && Number.isFinite(key.answer) ? [...vals].sort((a, b) => Math.abs(a - key.answer) - Math.abs(b - key.answer)).slice(0, 3) : [];
    return ui.bars(bins.map((b, i) => ({ label: fmt(b.lo), mark: i === ai ? '▲ actual' : '', parts: [{ n: b.n, color: i === ai ? 'var(--teal)' : '#b7c6c2' }] })), { aria: 'Distribution of the class guesses' }) +
      ui.tiles([['Class median', fmt(split.median)], ['Answers', split.n], ...(key && Number.isFinite(key.answer) ? [['Actual', `<span style="color:var(--teal-dark)">${fmt(key.answer)}</span>`, 'hi'], ['Closest guesses', close.map(fmt).join(', ')]] : [])]);
  }

  /* ---------- projector ---------- */
  function renderProjector(S, ctx) {
    const s = S.settings, head = `<div class="label">${esc(s.title)}</div>`;
    if (S.phase === 'instructions') return `${head}<h2>${esc(S.label)}</h2>${rules(s)}${ctx.joinLine()}`;
    if (S.phase === 'open') {
      if (S.pending) return `${head}<h2>Counting…</h2>`;
      const { q, k } = at(S.step), Q = s.questions[q], key = S.pub['key' + q], base = 3 * q + 1;
      const s1 = S.pub['split' + base], s2 = S.pub['split' + (base + 1)];
      const top = `${head}<h2 style="font-size:1.6rem">Question ${q + 1} of ${s.questions.length}</h2><p style="font-size:1.25rem;margin:4px 0 8px">${Q.prompt}</p>${taccounts(Q.show, k === 'review' ? key : null, Q)}`;
      const status = k === 'review' ? '' : `<div class="banner ${k === 'revote' ? 'warn' : ''}"><strong style="font-size:1.2em">${k === 'revote' ? 'Convince your neighbor, then answer again.' : 'Answer on your phone.'}</strong>${S.nMoved} of ${S.nPlayers} answered${k === 'revote' ? ' this time' : ''}.</div>`;
      if (Q.type === 'choice') return top + status + optionBars(Q, k === 'vote' ? null : s1, k === 'review' && s2 && s2.n ? s2 : null, k === 'review' ? key : null) + (k === 'review' ? `<div class="split" style="align-items:start">${key.explain ? `<div class="banner" style="margin:8px 0"><strong>Why</strong>${key.explain}</div>` : '<div></div>'}<div>${key.fixed ? `<div class="label">The correct entries</div>${taccounts(key.fixed, null, Q)}` : ''}</div></div>` : '');
      const sp = k === 'review' ? (s2 && s2.n ? s2 : s1) : k === 'revote' ? s1 : null;
      return top + status + (sp ? numberSummary(Q, sp, k === 'review' ? key : null) : '') + (k === 'review' && key.explain ? `<div class="banner"><strong>Why</strong>${key.explain}</div>` : '');
    }
    if (S.phase === 'closed') return `${head}<h2>That's the set</h2><p class="sub">Results in a moment.</p>`;
    const h = S.history.find(x => x.roundNo === S.roundNo); if (!h) return head;
    return `${head}<h2>How the class did</h2>${summaryTable(h)}`;
  }
  function summaryTable(h) {
    return ui.table(['Question', 'First answer right', 'Final answer right', 'Answers'], h.result.perQ.map((r, i) => [`${i + 1}. ${h.settings.questions[i].prompt.replace(/<[^>]+>/g, '').slice(0, 70)}…`,
      r.first != null ? ui.pct(r.first) : (r.err1 != null ? 'median miss ' + ui.num(r.err1, 1) : '—'), r.final != null ? `<b>${ui.pct(r.final)}</b>` : (r.err2 != null ? 'median miss ' + ui.num(r.err2, 1) : '—'), r.n]));
  }

  /* ---------- student ---------- */
  function renderStudent(S, me) {
    const s = S.settings;
    if (S.phase === 'instructions') return `<h2>Get ready</h2><p class="sub">${esc(s.title)}: ${s.questions.length} questions.</p>`;
    if (S.phase === 'open') {
      if (S.pending) return '<h2>Counting…</h2>';
      const { q, k } = at(S.step), Q = s.questions[q], mine = me.moves[String(S.step)], key = S.pub['key' + q];
      const head = `<div class="label">Question ${q + 1} of ${s.questions.length}${k === 'revote' ? ' · answer again' : ''}</div><p style="font-size:1.08rem;font-weight:650">${Q.prompt}</p>${taccounts(Q.show, k === 'review' ? key : null, Q)}`;
      if (k === 'review') {
        const fin = me.moves[String(3 * q + 2)] || me.moves[String(3 * q + 1)];
        if (Q.type === 'choice') { const right = fin && fin.choice === key.answer; return head + `<div class="banner ${fin ? (right ? '' : 'bad') : 'warn'}"><strong>${fin ? (right ? '✔ Right' : `✖ The answer is ${key.answer.toUpperCase()}`) : `The answer is ${key.answer.toUpperCase()}`}</strong>${fin && !right && key.why[fin.choice] ? key.why[fin.choice] : ''}</div>${key.explain ? `<p class="sub">${key.explain}</p>` : ''}`; }
        const v = fin ? (Q.type === 'prob' ? fin.p : fin.value) : null;
        return head + `<div class="banner"><strong>Actual: ${Number.isFinite(key.answer) ? ui.num(key.answer, 1) + (Q.unit === '%' ? '%' : '') : '—'}</strong>${v != null ? `You said ${ui.num(v, 1)}${Q.unit === '%' ? '%' : ''}.` : ''}</div>${key.explain ? `<p class="sub">${key.explain}</p>` : ''}`;
      }
      if (Q.type === 'choice') return head + `<div style="display:grid;gap:8px">${Q.options.map(o => `<button class="choice" data-choice="${o.id}" aria-pressed="${!!mine && mine.choice === o.id}"><b>${o.id.toUpperCase()}.</b> <span style="display:inline;color:var(--ink)">${o.text}</span></button>`).join('')}</div><p class="msg good" id="receipt">${mine ? 'Answer in. You can change it until the instructor moves on.' : ''}</p>`;
      const cur = mine ? (Q.type === 'prob' ? mine.p : mine.value) : '';
      return head + `<div class="row"><div class="field"><label for="ccNum">${Q.type === 'prob' ? 'Probability (0–100%)' : 'Your answer' + (Q.unit ? ` (${esc(Q.unit)})` : '')}</label><input id="ccNum" type="number" inputmode="decimal" step="${Q.step || 'any'}" value="${cur}"></div><button class="btn primary" id="ccSend">Submit</button></div><p class="msg good" id="receipt">${mine ? `Answer in: ${cur}. You can change it until the instructor moves on.` : ''}</p>`;
    }
    if (S.phase === 'closed') return '<h2>That\'s the set</h2><p class="sub">Waiting for the results.</p>';
    const p = me.priv[S.roundNo] || {};
    return `<h2>Your result</h2>${p.of ? `<div class="bigpay">${p.score} of ${p.of}</div><p class="sub">multiple-choice questions right on your final answer.</p>` : ''}<p class="note">Practice only; not graded.</p>`;
  }
  function wireStudent(root, ctx) {
    root.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => ctx.submit({ choice: b.dataset.choice }));
    const send = root.querySelector('#ccSend'); if (send) send.onclick = () => {
      const raw = root.querySelector('#ccNum').value.trim();
      if (raw === '') return ctx.say('Enter a number.');
      const isProb = root.querySelector('label[for=ccNum]').textContent.startsWith('Probability');
      ctx.submit(isProb ? { p: Math.round(Number(raw)) } : { value: Number(raw) });
    };
  }
  function renderInstructor(S) {
    if (S.phase !== 'open' || S.pending) return '';
    const { q, k } = at(S.step), Q = S.settings.questions[q], src = ((findSet(S.settings.set) || {}).questions || [])[q] || {};
    let html = `<div class="banner"><strong>Question ${q + 1} · ${k}</strong>${S.nMoved} of ${S.nPlayers} answered</div>`;
    if (k !== 'review') html += Q.type === 'choice' ? `<p class="note">Answer: <b>${String(src.answer).toUpperCase()}</b> (private to you)</p>` : Number.isFinite(src.answer) ? `<p class="note">Answer: <b>${src.answer}</b></p>` : `<div class="field"><label for="ccActual">Actual value, to reveal${Q.unit ? ` (${esc(Q.unit)})` : ''}</label><input id="ccActual" type="number" step="any"></div>`;
    return html;
  }

  /* ---------- scoring at the end of the set ---------- */
  function resolve({ S, settings, data }) {
    const s = settings, ids = Object.keys(data.private).length ? Object.keys(data.private) : data.players.filter(p => p.eligibleFrom <= S.roundNo).map(p => p.id);
    const priv = {}; ids.forEach(id => priv[id] = { score: 0, of: 0 });
    const perQ = s.questions.map((Q, i) => {
      const v1 = movesAt(data, 3 * i + 1), v2 = movesAt(data, 3 * i + 2), key = S.pub['key' + i] || {};
      const fin = id => v2[id] || v1[id];
      if (Q.type === 'choice') {
        const a1 = Object.values(v1), af = ids.map(fin).filter(Boolean);
        ids.forEach(id => { priv[id].of++; if (fin(id) && fin(id).choice === key.answer) priv[id].score++; });
        return { n: af.length, first: a1.length ? a1.filter(m => m.choice === key.answer).length / a1.length : null, final: af.length ? af.filter(m => m.choice === key.answer).length / af.length : null };
      }
      const val = m => Q.type === 'prob' ? m.p : m.value;
      const err = arr => Number.isFinite(key.answer) && arr.length ? ui.median(arr.map(m => Math.abs(val(m) - key.answer))) : null;
      return { n: ids.map(fin).filter(Boolean).length, err1: err(Object.values(v1)), err2: err(ids.map(fin).filter(Boolean)) };
    });
    return { result: { perQ }, private: priv };
  }

  function sim(st, rand) {
    if (st.phase !== 'open' || st.pending) return null;
    const { q, k } = at(st.step); if (k === 'review' || st.me.moves[String(st.step)]) return null;
    const Q = st.settings.questions[q];
    if (Q.type === 'choice') { const ids = Q.options.map(o => o.id); const pick = rand() < (k === 'revote' ? 0.4 : 0.15) ? ids[0] : ids[Math.floor(rand() * ids.length)]; return { submit: { choice: pick } }; }
    if (Q.type === 'prob') return { submit: { p: Math.round(rand() * 100) } };
    const lo = Q.min ?? 0, hi = Q.max ?? 100; return { submit: { value: Math.round((lo + (hi - lo) * (0.3 + 0.4 * rand())) * 10) / 10 } };
  }
  function exportRows(h, d) {
    const rows = [];
    for (const p of d.players.filter(p => p.eligibleFrom <= h.roundNo)) h.settings.questions.forEach((Q, i) => {
      const a = (st) => { const m = d.moves.find(x => x.player === p.id && x.step === st); return m ? JSON.stringify(m.data) : ''; };
      rows.push({ round: h.roundNo, set: h.settings.title, display_name: p.name, question: i + 1, first_answer: a(3 * i + 1), revote: a(3 * i + 2), answer: (h.pub['key' + i] || {}).answer ?? '' });
    });
    return rows;
  }

  const game = { id: 'class-check', title: 'Class Check', eyebrow: 'Answer, discuss, answer again', tagline: 'Short question sets: everyone answers, the class sees how it split, neighbors argue it out, and everyone answers again.',
    fields, presets, buildSettings, steps, rules, afterStep, controls, renderProjector, renderStudent, wireStudent, renderInstructor, resolve, sim, exportRows,
    openLabel: 'Start the questions', closeLabel: () => 'End the set' };
  window.CLASSROOM_GAME = game;
  if (!window.CLASSROOM_NO_START) window.Classroom.start(game);
})();
