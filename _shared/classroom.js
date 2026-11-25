/* ACC 453 classroom apps — shared toolkit.
   A game page loads config.js, local.js, this file, and its own game.js, which calls
   Classroom.start(game). The toolkit draws the student, instructor, and projector screens,
   handles joining, polling, instructor controls, and CSV export, and talks to either the
   Supabase backend (_shared/schema.sql) or the local demo (local.js). The game supplies its
   rules, settings, assignments, results, and screens.

   A game object:
     id, title, tagline, eyebrow?
     fields: [{id, label, type: 'number'|'checkbox'|'select', min?, max?, step?, options?: [[value, label]]}]
     presets: [{id, label, note?, values: {fieldId: value}}]
     buildSettings(values) -> settings (must include settings.input, the answer rules)
     steps?(settings) -> number of steps in a round (default 1)
     stepLabel?(S) / closeLabel?(S) / openLabel?
     assign?({S, settings, roster, rng}) -> {private: {playerId: data}, pub?}   (at open)
     afterStep?({S, data, closedStep}) -> {pub?, private?}                     (after each step)
     resolve({S, settings, data}) -> {result, private?, pub?}                    (at reveal)
     rules?(settings) -> html for the "How it works" card
     renderStudent(S, me, ctx) -> html;  wireStudent?(root, ctx)
     renderProjector(S, ctx) -> html;    wireProjector?(root, ctx)
     renderInstructor?(S, ctx) -> html (a live summary for the instructor)
     controls?(S, list, h) -> list (add or change instructor buttons)
     sim?(state, rng) -> {submit: data} | {trade: tag} | null   (simulated students)
     exportRows?(h, data) -> [{...}] (one CSV row per student per round)            */
(function () {
  'use strict';

  /* ---------------- formatting and small charts ---------------- */
  const ui = {};
  ui.$ = id => document.getElementById(id);
  ui.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ui.money = (x, d) => x == null || !isFinite(x) ? '—' : (x < 0 ? '−' : '') + '$' + Math.abs(Number(x)).toLocaleString('en-US', d != null ? { minimumFractionDigits: d, maximumFractionDigits: d } : Math.abs(x - Math.round(x)) < 0.005 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  ui.whole = x => x == null || !isFinite(x) ? '—' : (x < 0 ? '−' : '') + '$' + Math.round(Math.abs(x)).toLocaleString('en-US');
  ui.pct = (x, d = 0) => x == null || !isFinite(x) ? '—' : (x * 100).toFixed(d) + '%';
  ui.num = (x, d = 0) => x == null || !isFinite(x) ? '—' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  ui.sum = a => (a || []).reduce((t, x) => t + (Number(x) || 0), 0);
  ui.mean = a => a && a.length ? ui.sum(a) / a.length : null;
  ui.median = a => { if (!a || !a.length) return null; const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  ui.tiles = (list, cls = '') => `<div class="tiles ${cls}">${list.map(t => `<div class="tile ${t[2] || ''}"><small>${t[0]}</small><strong>${t[1]}</strong></div>`).join('')}</div>`;
  ui.table = (head, rows) => `<div class="scroll"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  /* Vertical bars. bins: [{label, parts: [{n, color, title?}], mark?}]; mark puts a ▲ note under that bin. */
  ui.bars = (bins, { height = 140, aria = 'Bar chart', unit = '' } = {}) => {
    const max = Math.max(1, ...bins.map(b => ui.sum(b.parts.map(p => p.n))));
    return `<div role="img" aria-label="${ui.esc(aria)}" style="display:grid;grid-template-columns:repeat(${bins.length},minmax(0,1fr));gap:4px;margin:10px 0 4px">${bins.map(b => {
      const tot = ui.sum(b.parts.map(p => p.n));
      return `<div style="text-align:center"><div style="height:${height}px;display:flex;flex-direction:column;justify-content:flex-end;gap:1px"><small style="font-size:.72rem;font-weight:750">${tot || ''}</small>${b.parts.slice().reverse().map(p => `<i style="display:block;border-radius:2px;height:${p.n / max * (height - 16)}px;background:${p.color}" title="${ui.esc(p.title || '')}"></i>`).join('')}</div><small style="display:block;font-size:.7rem;color:var(--muted);line-height:1.2;margin-top:3px;${b.mark ? 'font-weight:800;color:var(--ink)' : ''}">${b.label}${b.mark ? '<br>' + b.mark : ''}</small></div>`;
    }).join('')}</div>${unit ? `<p class="note" style="margin:0">${unit}</p>` : ''}`;
  };
  /* Line chart. series: [{points: [[x, y]], color, dash?, label, dots?}] */
  ui.lines = (series, { xLabel = '', yLabel = '', xFmt = x => x, yFmt = y => y, yMin = 0, yMax, xMin, xMax, aria = 'Line chart', vline, xTicks, yTicks } = {}) => {
    const W = 720, H = 260, L = 58, R = 18, T = 14, B = 44, pw = W - L - R, ph = H - T - B;
    const all = series.flatMap(s => s.points);
    if (!all.length) return '<p class="note">No data yet.</p>';
    const x0 = xMin ?? Math.min(...all.map(p => p[0])), x1 = xMax ?? Math.max(...all.map(p => p[0]), x0 + 1);
    const y1 = yMax ?? Math.max(...all.map(p => p[1]), yMin + 1) * 1.08;
    const X = x => L + (x - x0) / (x1 - x0 || 1) * pw, Y = y => T + ph - (y - yMin) / (y1 - yMin || 1) * ph;
    const yt = yTicks || [0, .25, .5, .75, 1].map(f => yMin + f * (y1 - yMin));
    const xt = xTicks || [0, .25, .5, .75, 1].map(f => x0 + f * (x1 - x0));
    return `<div class="chart"><div class="legend" style="margin-bottom:4px">${series.filter(s => s.label).map(s => `<span><svg width="30" height="10" aria-hidden="true"><line x1="0" x2="30" y1="5" y2="5" stroke="${s.color}" stroke-width="3" ${s.dash ? 'stroke-dasharray="6 4"' : ''}/></svg>${s.label}</span>`).join('')}</div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ui.esc(aria)}">
      ${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${Math.abs(v) < 1e-9 && yMin < 0 ? '#5d6e73' : '#e3e8e5'}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="14" fill="#5d6e73">${yFmt(v)}</text>`).join('')}
      ${xt.map(v => `<text x="${X(v)}" y="${H - B + 18}" text-anchor="middle" font-size="14" fill="#5d6e73">${xFmt(v)}</text>`).join('')}
      <text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" font-size="14" fill="#5d6e73">${ui.esc(xLabel)}</text>
      <text x="14" y="${T + ph / 2}" text-anchor="middle" font-size="14" fill="#5d6e73" transform="rotate(-90 14 ${T + ph / 2})">${ui.esc(yLabel)}</text>
      ${vline != null ? `<line x1="${X(vline)}" x2="${X(vline)}" y1="${T}" y2="${T + ph}" stroke="#152f39" stroke-dasharray="3 3"/>` : ''}
      ${series.map(s => `<polyline points="${s.points.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="3" ${s.dash ? 'stroke-dasharray="7 4"' : ''} stroke-linejoin="round"/>${s.dots ? s.points.map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4.5" fill="${s.color}"/>`).join('') : ''}`).join('')}
      </svg></div>`;
  };
  /* Seeded random numbers (mulberry32), so assignments can be reproduced from a seed. */
  ui.rng = seed => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  ui.shuffle = (arr, rand) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  ui.hash = s => {
    let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  };
  /* A live countdown: <span data-ends="serverMs"></span>, kept current by the toolkit. */
  ui.countdown = ends => `<span class="countdown" data-ends="${Number(ends) || 0}">—</span>`;
  ui.phaseNames = { lobby: 'Lobby', instructions: 'Instructions', open: 'Submissions open', closed: 'Submissions closed', revealed: 'Results revealed', debrief: 'Debrief' };

  const loadScript = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });

  /* ---------------- the live backend ---------------- */
  function liveApi(sb) {
    const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(error.message); return data; };
    return {
      local: false,
      state: (code, pl) => rpc('cls_state', { p_code: code, p_player: pl ? pl.id : null, p_secret: pl ? pl.secret : null }),
      create: (key, game) => rpc('cls_create_session', { p_key: key, p_game: game }),
      join: (code, name) => rpc('cls_join', { p_code: code, p_name: name }),
      submit: (code, pl, step, data) => rpc('cls_submit', { p_code: code, p_player: pl.id, p_secret: pl.secret, p_step: step, p_data: data }),
      trade: (code, pl, tag) => rpc('cls_trade', { p_code: code, p_player: pl.id, p_secret: pl.secret, p_from: tag }),
      host: (code, secret, action, payload) => rpc('cls_host', { p_code: code, p_secret: secret, p_action: action, p_payload: payload || {} }),
      hostData: (code, secret, round) => rpc('cls_host_data', { p_code: code, p_secret: secret, p_round: round ?? null })
    };
  }
  async function connect(gameId, forceDemo) {
    const CFG = window.CLASSROOM_CONFIG || {};
    if (!forceDemo && CFG.supabaseUrl && CFG.supabaseAnonKey) {
      if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      if (window.supabase) {
        const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false } });
        return { api: liveApi(sb), sb, live: true };
      }
      return { api: window.ClassroomLocal.create(gameId), live: false, error: 'Could not load the Supabase library, so this is the local demo. Check the network connection.' };
    }
    return { api: window.ClassroomLocal.create(gameId), live: false };
  }

  /* ---------------- the page ---------------- */
  async function start(game) {
    const { $, esc } = ui;
    const params = new URLSearchParams(location.search);
    const baseUrl = location.href.split('?')[0].split('#')[0];
    const conn = await connect(game.id, params.has('demo'));
    const api = conn.api, LIVE = conn.live;
    document.title = `${game.title} · ACC 453`;
    document.body.innerHTML = `
      <header class="top"><div class="brand">Money &amp; Banking · Classroom</div><div class="course">ACC 453 · ${esc(game.title)}</div></header>
      <main class="shell">
        <section class="hero"><div><div class="eyebrow">${esc(game.eyebrow || 'A shared classroom experiment')}</div><h1>${esc(game.title)}</h1><p>${game.tagline || ''}</p></div>
          <div class="pill"><i class="dot"></i><span id="phaseText">Lobby</span></div></section>
        <nav class="tabs hidden" id="tabs" aria-label="Choose screen"></nav>
        <section class="view" id="student"><div class="grid">
          <article class="card"><div class="label" id="sLabel">${esc(game.title)}</div>
            <div id="joinForm" class="hidden"><h2>Join</h2><p class="sub">Enter a display name. Use a first name or a nickname; nothing else is collected.</p>
              <div class="row"><div class="field hidden" id="codeField" style="max-width:130px"><label for="codeInput">Session code</label><input id="codeInput" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="ABCD"></div>
                <div class="field"><label for="nameInput">Display name</label><input id="nameInput" maxlength="24" autocomplete="nickname" placeholder="e.g., Alex"></div>
                <button class="btn primary" id="joinBtn">Join</button></div>
              <p class="msg bad" id="joinMsg" aria-live="polite"></p></div>
            <div id="studentBody" aria-live="polite"></div></article>
          <aside class="card"><h2>How it works</h2><div id="studentRules"><p class="sub">The rules for each round appear here once the instructor sets it up.</p></div></aside>
        </div></section>
        <section class="view" id="instructor">
          <div id="hostGate" class="card hidden" style="max-width:560px"><div class="label">Instructor</div><h2>Start a session</h2>
            <p class="sub">Enter the instructor passphrase you set in Supabase. It is sent once to create the session and is not saved in this browser.</p>
            <div class="row"><div class="field"><label for="hostKey">Instructor passphrase</label><input id="hostKey" type="password" autocomplete="off"></div><button class="btn primary" id="createBtn">Create session</button></div>
            <p class="msg bad" id="hostMsg" aria-live="polite"></p></div>
          <div class="grid" id="hostPanel">
            <article class="card"><div class="label">Private instructor controls</div><h2>Run the round</h2>
              <p class="sub">Choose a treatment, show it to the class, open submissions, then reveal. Settings are copied into the round when you show it.</p>
              <div class="row"><div class="field"><label for="preset">Treatment</label><select id="preset"></select></div>
                <div class="field"><label for="roundLabel">Label on the projector</label><input id="roundLabel" maxlength="80"></div></div>
              <p class="note" id="presetNote"></p>
              <div class="settings" id="settingsBox"></div>
              <div class="actions" id="flowBtns"></div>
              <div class="banner"><strong id="instPhase">Lobby</strong><span id="instCounts"></span></div>
              <p class="msg bad" id="instMsg" aria-live="polite"></p>
              <div class="actions"><button class="btn secondary hidden" id="bSims">Add 20 simulated students</button><button class="btn secondary" id="bExport">Export CSV</button><button class="btn danger" id="bReset">Reset</button></div>
            </article>
            <aside class="card"><h2>Session</h2><div class="joincode" id="instCode">—</div>
              <p class="note">Students join at <span id="instJoin"></span></p>
              <p><a id="projLink" target="_blank" rel="noopener">Open the projector screen in a new window</a></p>
              <p class="note" id="modeNote"></p><div id="instResult"></div></aside>
          </div></section>
        <section class="view" id="projector"><div class="card" id="projBody"></div></section>
        <p class="footer" id="footer"></p>
      </main>`;

    /* who am I on this device */
    const idStore = LIVE ? localStorage : sessionStorage;   // local demo: one student per tab
    const PKEY = `cls-player-${game.id}`, HKEY = `cls-host-${game.id}`;
    const readJSON = (store, k) => { try { return JSON.parse(store.getItem(k)); } catch { return null; } };
    let player = readJSON(idStore, PKEY);
    let host = LIVE ? readJSON(localStorage, HKEY) : { code: 'DEMO', hostSecret: 'local' };
    let view = ['student', 'instructor', 'projector'].includes(params.get('view')) ? params.get('view') : 'student';
    let code = LIVE ? (params.get('code') || (view === 'student' ? player && player.code : host && host.code) || '').toUpperCase() : 'DEMO';
    if (player && LIVE && code && player.code !== code) player = null;
    let S = null, lastSig = '', channel = null, clockOffset = 0, busy = false;
    const live = { history: [] };   // projector-side memory (e.g. a live timeline), reset each round

    /* ---------- instructor helpers given to the game ---------- */
    const secret = () => host && host.hostSecret;
    const h = {
      host: (action, payload) => api.host(code, secret(), action, payload),
      data: round => api.hostData(code, secret(), round),
      state: () => api.state(code),
      async advance() { await h.host('advance'); await h.finishStep(); },
      async finishStep() {
        const S2 = await api.state(code), d = await h.data();
        const out = game.afterStep ? (await game.afterStep({ S: S2, data: d, closedStep: S2.step - 1, settings: S2.settings, ui })) || {} : {};
        await h.host('publish', Object.assign({}, out, { step: S2.step }));
      },
      async open() {
        for (let i = 0; ; i++) {
          const S2 = await api.state(code), d = await h.data();
          const roster = d.players.filter(p => p.eligibleFrom <= S2.roundNo);
          const seed = (Date.now() ^ ui.hash(code + S2.roundNo)) >>> 0;
          const out = game.assign ? (await game.assign({ S: S2, settings: S2.settings, roster, rng: ui.rng(seed), seed, ui })) || {} : {};
          try { await h.host('open', out); return; }
          catch (e) { if (!/ROSTER_CHANGED/.test(e.message) || i >= 4) throw e; }
        }
      },
      async reveal() {
        const S2 = await api.state(code), d = await h.data();
        const out = await game.resolve({ S: S2, settings: S2.settings, data: d, ui });
        await h.host('reveal', out);
      }
    };

    /* ---------- settings form ---------- */
    const presets = game.presets || [];
    $('settingsBox').innerHTML = (game.fields || []).map(f => f.type === 'checkbox'
      ? `<label class="check"><input type="checkbox" id="f_${f.id}"> ${esc(f.label)}</label>`
      : f.type === 'select'
        ? `<div class="field"><label for="f_${f.id}">${esc(f.label)}</label><select id="f_${f.id}">${f.options.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></div>`
        : `<div class="field"><label for="f_${f.id}">${esc(f.label)}</label><input id="f_${f.id}" type="number" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 1}"></div>`).join('');
    const readForm = () => { const o = {}; for (const f of game.fields || []) { const el = $('f_' + f.id); o[f.id] = f.type === 'checkbox' ? el.checked : f.type === 'select' ? el.value : Number(el.value); } return o; };
    function fillForm(id) {
      const p = presets.find(x => x.id === id);
      $('presetNote').textContent = p ? (p.note || '') : 'Custom settings. Edit the values below.';
      if (!p) return;
      $('roundLabel').value = p.label;
      for (const f of game.fields || []) { const el = $('f_' + f.id), v = (p.values || {})[f.id]; if (v === undefined) continue; if (f.type === 'checkbox') el.checked = !!v; else el.value = v; }
    }
    $('preset').innerHTML = presets.map((p, i) => `<option value="${p.id}">${i + 1}. ${esc(p.label)}</option>`).join('') + '<option value="custom">Custom</option>';
    $('preset').onchange = () => fillForm($('preset').value);
    if (presets[0]) fillForm(presets[0].id);
    for (const f of game.fields || []) $('f_' + f.id).addEventListener('input', () => { $('preset').value = 'custom'; $('presetNote').textContent = 'Custom settings. Edit the values below.'; });
    let advancedFor = 0;   // after a reveal, move the treatment menu to the next preset once

    /* ---------- the instructor's buttons ---------- */
    function controls() {
      const ph = S.phase, n = game.steps ? game.steps(S.settings || {}) : 1, list = [];
      list.push({ id: 'setup', label: ph === 'instructions' ? 'Update round' : ph === 'lobby' ? 'Show round to class' : 'Show next round', enabled: ['lobby', 'instructions', 'revealed', 'debrief'].includes(ph), next: ['lobby', 'revealed', 'debrief'].includes(ph),
        run: () => h.host('setup', { label: $('roundLabel').value.trim() || 'Round', settings: game.buildSettings(readForm()) }) });
      list.push({ id: 'open', label: game.openLabel || 'Open submissions', enabled: ph === 'instructions' && S.nPlayers > 0, next: ph === 'instructions', run: h.open });
      if (S.pending) list.push({ id: 'finish', label: 'Finish publishing this step', enabled: true, next: true, run: h.finishStep });
      else if (n > 1) list.push({ id: 'step', label: game.stepLabel ? game.stepLabel(S) : `End step ${S.step} of ${n}`, enabled: ph === 'open' && S.step < n, next: ph === 'open' && S.step < n, run: h.advance });
      list.push({ id: 'close', label: game.closeLabel ? game.closeLabel(S) : 'Close submissions', enabled: ph === 'open' && !S.pending, next: ph === 'open' && !S.pending && S.step >= n, run: () => h.host('close') });
      list.push({ id: 'reveal', label: 'Reveal results', enabled: ph === 'closed', next: ph === 'closed', run: h.reveal });
      list.push({ id: 'debrief', label: 'Begin debrief', enabled: ph === 'revealed', secondary: true, run: () => h.host('debrief') });
      return game.controls ? game.controls(S, list, h) : list;
    }
    let btnList = [];
    function renderInstructor() {
      const needHost = LIVE && !(host && host.code);
      $('hostGate').classList.toggle('hidden', !needHost); $('hostPanel').classList.toggle('hidden', needHost);
      if (needHost || !S) return;
      if ((S.phase === 'revealed' || S.phase === 'debrief') && advancedFor !== S.roundNo) {
        advancedFor = S.roundNo;
        const i = presets.findIndex(p => p.id === $('preset').value);
        if (i >= 0 && i < presets.length - 1 && presets[i].label === S.label) { $('preset').value = presets[i + 1].id; fillForm(presets[i + 1].id); }
      }
      btnList = controls();
      $('flowBtns').innerHTML = btnList.map((b, i) => `<button class="btn ${b.secondary ? 'secondary' : 'primary'} ${b.next && b.enabled ? 'next' : ''}" data-i="${i}" ${b.enabled ? '' : 'disabled'}>${esc(b.label)}</button>`).join('');
      $('flowBtns').querySelectorAll('button').forEach(el => el.onclick = () => hostAct(btnList[Number(el.dataset.i)].run));
      $('instPhase').textContent = (S.roundNo ? `Round ${S.roundNo} · ${S.label} · ` : '') + ui.phaseNames[S.phase] + (S.phase === 'open' && game.steps && game.steps(S.settings || {}) > 1 ? ` · step ${S.step}` : '') + (S.pending ? ' · publishing…' : '');
      $('instCounts').textContent = `${S.nJoined} joined` + (S.roundNo ? ` · ${S.nPlayers} in this round` : '') + (S.phase === 'open' ? ` · ${S.nMoved} answered this step` : '') + (S.phase === 'instructions' && S.nPlayers < 1 ? ' · needs at least one student before opening' : '');
      $('instCode').textContent = S.code; $('instJoin').textContent = LIVE ? `${baseUrl}?code=${S.code}` : baseUrl;
      $('projLink').href = `${baseUrl}?view=projector${LIVE ? '&code=' + S.code : params.has('demo') ? '&demo=1' : ''}`;
      preserve($('instResult'), () => { $('instResult').innerHTML = game.renderInstructor ? game.renderInstructor(S, ctxFor()) || '' : ''; });
    }
    async function hostAct(fn) {
      if (busy) return; busy = true; $('instMsg').textContent = '';
      document.querySelectorAll('#flowBtns button').forEach(b => b.disabled = true);
      try { await fn(); ping(); } catch (e) { $('instMsg').textContent = e.message; }
      busy = false; await refresh(true);
    }

    /* ---------- the student's screen ---------- */
    function ctxFor() {
      return {
        ui, live, LIVE, baseUrl, code, game,
        offset: () => clockOffset,
        joinLine: () => `<p class="note">Join at <b>${esc(baseUrl)}</b>${LIVE ? ` · code <b>${esc(S.code)}</b>` : ''} · ${S.nJoined} joined</p>`,
        submit: data => studentAct(() => api.submit(code, player, S.step, data)),
        trade: tag => studentAct(() => api.trade(code, player, tag)),
        say: (text, good) => { const el = $('receipt'); if (el) { el.textContent = text; el.className = 'msg ' + (good ? 'good' : 'bad'); } }
      };
    }
    async function studentAct(fn) {
      try { S = await fn(); lastSig = ''; render(); ping(true); return true; }
      catch (e) { await refresh(true); const el = $('receipt'); if (el) { el.textContent = e.message; el.className = 'msg bad'; } return false; }
    }
    /* Keep what a student is typing when the screen redraws. */
    function preserve(root, draw) {
      const vals = {}, act = document.activeElement, actId = act && root.contains(act) ? act.id : null;
      let sel = null; try { sel = actId ? [act.selectionStart, act.selectionEnd] : null; } catch { sel = null; }
      root.querySelectorAll('input[id],select[id],textarea[id]').forEach(el => { if (el.dataset.keep !== 'no') vals[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
      const rc = root.querySelector('#receipt'), keepMsg = rc && rc.textContent.trim() ? [rc.textContent, rc.className] : null;
      draw();
      const rc2 = root.querySelector('#receipt'); if (keepMsg && rc2 && !rc2.textContent.trim()) { rc2.textContent = keepMsg[0]; rc2.className = keepMsg[1]; }
      for (const id in vals) { const el = root.querySelector('#' + CSS.escape(id)); if (el && el.dataset.keep !== 'no') { if (el.type === 'checkbox') el.checked = vals[id]; else el.value = vals[id]; } }
      if (actId) { const el = root.querySelector('#' + CSS.escape(actId)); if (el) { el.focus(); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch { } } }
    }
    function renderStudent() {
      const joined = !!(player && S && S.me);
      $('joinForm').classList.toggle('hidden', joined);
      $('codeField').classList.toggle('hidden', !LIVE || !!params.get('code'));
      if (!S) { $('studentBody').innerHTML = ''; return; }
      $('sLabel').textContent = S.roundNo ? `Round ${S.roundNo} · ${S.label}` : game.title;
      $('studentRules').innerHTML = S.settings && game.rules ? game.rules(S.settings, S) : '<p class="sub">The rules for each round appear here once the instructor sets it up.</p>';
      if (!joined) { $('studentBody').innerHTML = ''; return; }
      const me = S.me, inRound = S.roundNo > 0 && me.eligibleFrom <= S.roundNo && (S.phase === 'instructions' || !game.assign || !!me.priv[S.roundNo]);
      let html;
      if (S.phase === 'lobby') html = `<h2>You're in, ${esc(me.name)}</h2><p class="sub">Waiting for the instructor to set up the first round.</p>${game.showTag ? `<p class="note">Your trading tag</p><div class="tagbig">${esc(me.tag)}</div>` : ''}`;
      else if (!inRound) html = `<h2>You're in, ${esc(me.name)}</h2><div class="banner warn"><strong>This round began before you joined.</strong>You play from the next round.</div>`;
      else html = game.renderStudent(S, me, ctxFor());
      const root = $('studentBody');
      preserve(root, () => { root.innerHTML = html; });
      if (inRound && game.wireStudent && S.phase !== 'lobby') game.wireStudent(root, ctxFor());
    }

    /* ---------- the projector ---------- */
    function renderProjector() {
      const root = $('projBody');
      if (!S) { root.innerHTML = `<h2>${esc(game.title)}</h2><p class="sub">${LIVE ? 'Add <b>&amp;code=XXXX</b> to this address, or open the projector from the instructor screen.' : 'Waiting for the session.'}</p>`; return; }
      if (S.phase === 'lobby') {
        root.innerHTML = `<div class="label">${esc(game.title)}</div><h2>Join on your phone</h2><div class="split"><div><p class="sub">Open this page on your phone${LIVE ? ' and enter the code' : ''}.</p><div class="joincode">${esc(S.code)}</div><p style="word-break:break-all"><b>${esc(baseUrl)}</b></p><p class="banner"><strong>${S.nJoined} joined</strong>Waiting for the instructor to set up the first round.</p></div><div id="qr"></div></div>`;
        drawQR(); return;
      }
      root.innerHTML = game.renderProjector(S, ctxFor());
      if (game.wireProjector) game.wireProjector(root, ctxFor());
    }
    async function drawQR() {
      const el = $('qr'); if (!el || !LIVE || !/^https?:/.test(location.protocol)) return;
      if (!window.qrcode) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js');
      if (!window.qrcode || !$('qr')) return;
      const q = window.qrcode(0, 'M'); q.addData(`${baseUrl}?code=${S.code}`); q.make();
      $('qr').innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      const svg = $('qr').querySelector('svg'); if (svg) { svg.style.width = '100%'; svg.style.maxWidth = '380px'; svg.setAttribute('aria-label', 'QR code for the join link'); }
    }

    /* ---------- refresh loop ---------- */
    function render() {
      document.body.classList.toggle('proj', view === 'projector');
      document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === view));
      document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.view === view)));
      $('phaseText').textContent = (S ? ui.phaseNames[S.phase] : 'Not connected') + (LIVE ? '' : ' · Local demo');
      if (view === 'student') renderStudent();
      if (view === 'instructor') renderInstructor();
      if (view === 'projector') renderProjector();
      tick();
    }
    let liveRound = 0;
    function remember() {   // projector memory of how counts moved during a round
      if (!S) return;
      if (S.roundNo !== liveRound) { liveRound = S.roundNo; live.history = []; }
      if (S.phase === 'open') { const last = live.history[live.history.length - 1]; if (!last || last.nDone !== S.nDone || last.nMoved !== S.nMoved || S.now - last.t > 5000) live.history.push({ t: S.now, nDone: S.nDone, nMoved: S.nMoved }); }
    }
    let refreshing = false;
    async function refresh(force) {
      if (refreshing) return; refreshing = true;
      try {
        if (code) {
          S = await api.state(code, view === 'student' ? player : null);
          clockOffset = S.now - Date.now();
          if (view === 'student' && player && !S.me) { player = null; idStore.removeItem(PKEY); }
          remember();
        } else S = null;
      } catch (e) { if (/No session/.test(e.message)) { S = null; if (view === 'student') { player = null; idStore.removeItem(PKEY); } } }
      refreshing = false;
      const strip = view === 'student' && S ? Object.assign({}, S, { nJoined: 0, nMoved: 0, nDone: 0, now: 0 }) : S && Object.assign({}, S, { now: 0 });
      const sig = JSON.stringify([strip, view, player && player.id, host && host.code]);
      if (force || sig !== lastSig) { lastSig = sig; render(); }
    }
    function tick() {
      const now = Date.now() + clockOffset;
      document.querySelectorAll('[data-ends]').forEach(el => { const left = Math.max(0, Number(el.dataset.ends) - now) / 1000; el.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`; });
    }
    function subscribe() {
      if (!LIVE || !code || channel) return;
      channel = conn.sb.channel('cls-' + code).on('broadcast', { event: 'tick' }, () => setTimeout(refresh, Math.random() * 800)).subscribe();
    }
    const ping = studentSide => { if (channel && (view === 'instructor' || studentSide && game.broadcastStudentActions)) channel.send({ type: 'broadcast', event: 'tick', payload: {} }); };

    /* ---------- simulated students (local demo) ---------- */
    async function runSims() {
      if (LIVE || view !== 'instructor' || !game.sim || busy) return;
      const sims = api.simPlayers(); if (!sims.length) return;
      await simTick(api, 'DEMO', sims, game, Math.random);
    }

    /* ---------- events ---------- */
    if (!LIVE || view !== 'student') {
      const list = LIVE ? ['instructor', 'projector'] : ['student', 'instructor', 'projector'];
      $('tabs').innerHTML = list.map(v => `<button class="tab" data-view="${v}">${{ student: 'Student phone', instructor: 'Instructor', projector: 'Projector' }[v]}</button>`).join('');
      $('tabs').classList.remove('hidden');
      $('tabs').querySelectorAll('.tab').forEach(t => t.onclick = () => { view = t.dataset.view; refresh(true); });
    }
    $('codeInput').value = LIVE ? code : '';
    $('joinBtn').onclick = async () => {
      const c = LIVE ? (params.get('code') || $('codeInput').value).trim().toUpperCase() : 'DEMO', name = $('nameInput').value.trim();
      if (LIVE && !c) { $('joinMsg').textContent = 'Enter the session code.'; return; }
      if (!name) { $('joinMsg').textContent = 'Enter a display name.'; $('nameInput').focus(); return; }
      try { const p = await api.join(c, name); code = c; player = { code: c, id: p.id, secret: p.secret, tag: p.tag, name }; idStore.setItem(PKEY, JSON.stringify(player)); $('joinMsg').textContent = ''; subscribe(); await refresh(true); }
      catch (e) { $('joinMsg').textContent = e.message; }
    };
    $('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
    $('createBtn').onclick = async () => {
      try { const r = await api.create($('hostKey').value, game.id); $('hostKey').value = ''; host = { code: r.code, hostSecret: r.hostSecret }; localStorage.setItem(HKEY, JSON.stringify(host)); code = r.code; subscribe(); await refresh(true); }
      catch (e) { $('hostMsg').textContent = e.message; }
    };
    $('bSims').classList.toggle('hidden', LIVE || !game.sim);
    $('bSims').onclick = async () => { for (let i = 1; i <= 20; i++) await api.join('DEMO', `Student ${Math.floor(Math.random() * 900 + 100)}`, true); refresh(true); };
    $('bExport').onclick = async () => {
      try {
        const rows = [];
        for (const hh of S.history) { const d = await h.data(hh.roundNo); rows.push(...(game.exportRows ? game.exportRows(hh, d, ui) : d.players.map(p => ({ round: hh.roundNo, label: hh.label, display_name: p.name, answers: JSON.stringify(d.moves.filter(m => m.player === p.id).map(m => m.data)) })))); }
        const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
        const csv = [keys, ...rows.map(r => keys.map(k => r[k] ?? ''))].map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${game.id}-${S.code}.csv`; a.click(); URL.revokeObjectURL(a.href);
      } catch (e) { $('instMsg').textContent = e.message; }
    };
    $('bReset').textContent = LIVE ? 'Leave this session' : 'Reset demo';
    $('bReset').onclick = () => {
      if (!confirm(LIVE ? 'Leave this session on this device? You will not be able to control it again. Export the CSV first if you need it.' : 'Clear this browser’s local demo session and start over?')) return;
      if (LIVE) { localStorage.removeItem(HKEY); host = null; code = ''; if (channel) { conn.sb.removeChannel(channel); channel = null; } }
      else { api.reset(); sessionStorage.removeItem(PKEY); player = null; }
      advancedFor = 0; if (presets[0]) { $('preset').value = presets[0].id; fillForm(presets[0].id); }
      refresh(true);
    };
    $('modeNote').textContent = LIVE ? 'Live session. Only display names are stored. Instructor controls work only from the browser that created the session.' : 'Local demo: names and choices stay in this browser. Open this page in more tabs to play several students, or add simulated students.';
    $('footer').textContent = conn.error || (LIVE ? 'Only your display name is stored · the rules are in SPEC.md' : 'Local demonstration · nothing is sent to a server · the rules are in SPEC.md');

    if (!LIVE) window.addEventListener('storage', e => { if (e.key === api.KEY) refresh(); });
    subscribe();
    await refresh(true);
    setInterval(refresh, LIVE ? (view === 'student' ? 3000 : 2000) : 1200);
    setInterval(tick, 500);
    if (!LIVE) setInterval(async () => { await runSims(); }, 1500);
    return { api, h };
  }

  /* One pass of simulated students. Each gets its own state plus `world`: what the other
     simulated students hold (their private data and tag), standing in for what people learn
     by talking to each other in the room. Returns a log of what was done. */
  async function simTick(api, code, sims, game, rand) {
    const states = [], done = [];
    for (const p of sims) { try { states.push([p, await api.state(code, p)]); } catch { } }
    const world = states.filter(([, st]) => st.me && st.me.priv[st.roundNo]).map(([p, st]) => Object.assign({ tag: st.me.tag }, st.me.priv[st.roundNo]));
    for (const [p, st] of states) {
      if (st.phase !== 'open' || st.pending || !st.me || st.me.eligibleFrom > st.roundNo) continue;
      if (game.assign && !st.me.priv[st.roundNo]) continue;
      const a = game.sim(st, rand, world.filter(w => w.tag !== st.me.tag)); if (!a) continue;
      try {
        if (a.trade) { await api.trade(code, p, a.trade); done.push(`${p.name} accepted ${a.trade}`); }
        else if ('submit' in a) { await api.submit(code, p, st.step, a.submit); done.push(`${p.name} submitted ${JSON.stringify(a.submit)}`); }
      } catch (e) { done.push(`${p.name} refused: ${e.message}`); }
    }
    return done;
  }

  window.Classroom = { start, ui, connect, simTick };
})();
