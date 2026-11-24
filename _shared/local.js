/* Local demo backend: the same functions as _shared/schema.sql, kept in this browser's
   localStorage, so every game can be rehearsed with simulated students and no server.
   Keep the rules here in step with schema.sql (answer checks, phases, steps, trades). */
(function () {
  'use strict';
  const fail = m => { throw new Error(m); };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const has = (arr, v) => Array.isArray(arr) && arr.some(x => JSON.stringify(x) === JSON.stringify(v));
  const removeOne = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); return arr; };

  /* The same checks as cls_check in schema.sql. */
  function check(spec, data, priv, db, selfId) {
    if (!spec || typeof spec !== 'object') fail('Nothing to submit right now.');
    priv = priv || {};
    if (spec.role != null) {
      const roles = Array.isArray(spec.role) ? spec.role : [spec.role];
      if (!roles.includes(priv.role)) fail('Nothing for you to submit at this step.');
    }
    if (spec.lockDone && priv.done) fail('You are done for this round.');
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('That answer could not be read.');
    if (JSON.stringify(data).length > 2000) fail('That answer is too long.');
    for (const [k, v] of Object.entries(data)) {
      const f = (spec.fields || {})[k];
      if (!f) fail(`That answer has an unexpected part (${k}).`);
      const lab = f.label || k;
      if (v === null) { if (f.optional) continue; fail(`Enter ${lab.toLowerCase()}.`); }
      const t = f.type || 'num';
      if (t === 'int' || t === 'num') {
        if (typeof v !== 'number' || !isFinite(v)) fail(`${lab} must be a number.`);
        if (t === 'int' && !Number.isInteger(v)) fail(`${lab} must be a whole number.`);
        let lo = f.min != null ? f.min : null;
        if (f.minPriv != null && priv[f.minPriv] != null) lo = Math.max(lo == null ? -1e18 : lo, Number(priv[f.minPriv]));
        if (lo != null && v < lo) fail(`${lab} must be at least ${lo}.`);
        let hi = f.max != null ? f.max : null;
        if (f.maxPriv != null) hi = Math.min(hi == null ? 1e18 : hi, Number(priv[f.maxPriv] || 0));
        if (hi != null && v > hi) fail(`${lab} can be at most ${hi}.`);
      } else if (t === 'bool') {
        if (typeof v !== 'boolean') fail('That answer could not be read.');
      } else if (t === 'choice') {
        if (!has(f.in || [], v)) fail('That is not one of the choices.');
      } else if (t === 'privItem') {
        if (!has(priv[f.from] || [], v)) fail('You do not have that.');
      } else if (t === 'tag') {
        if (typeof v !== 'string') fail('Enter a tag.');
        if (!db.players.some(p => p.tag === v.toUpperCase() && p.id !== selfId)) fail(`No one else here has the tag ${v.toUpperCase()}.`);
      } else if (t === 'text') {
        if (typeof v !== 'string' || v.length > (f.maxLen || 200)) fail(`${lab} is too long.`);
      } else fail('Unknown answer type.');
    }
    for (const k of spec.required || []) if (data[k] == null) fail(`Enter ${(((spec.fields || {})[k] || {}).label || k).toLowerCase()}.`);
    if (spec.sum) {
      const tot = spec.sum.fields.reduce((t, k) => t + (typeof data[k] === 'number' ? data[k] : 0), 0);
      if (Math.abs(tot - spec.sum.equals) > 1e-4) fail(`${spec.sum.label || 'The amounts'} must add up to ${spec.sum.equals}.`);
    }
  }

  function create(gameId) {
    const KEY = 'acc453-cls-demo-' + gameId;
    const fresh = () => ({ code: 'DEMO', game: gameId, hostSecret: 'local', phase: 'lobby', roundNo: 0, rounds: {}, players: [], priv: {}, moves: {} });
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } };
    const save = db => localStorage.setItem(KEY, JSON.stringify(db));
    const round = db => db.rounds[db.roundNo];
    const eligible = (db, rn) => db.players.filter(p => p.eligibleFrom <= rn);
    const findMe = (db, id, secret) => db.players.find(p => p.id === id && p.secret === secret);
    const mergeAll = (db, rn, priv) => { const P = db.priv[rn] = db.priv[rn] || {}; for (const id in priv || {}) if (db.players.some(p => p.id === id)) P[id] = Object.assign(P[id] || {}, priv[id]); };

    function state(db, id, secret) {
      const r = round(db);
      let nPlayers = 0, nMoved = 0, nDone = 0;
      if (r) {
        nPlayers = r.nPlayers != null ? r.nPlayers : eligible(db, db.roundNo).length;
        const M = db.moves[db.roundNo] || {};
        nMoved = Object.values(M).filter(m => m[r.step]).length;
        nDone = Object.values(db.priv[db.roundNo] || {}).filter(d => d.done).length;
      }
      const history = Object.values(db.rounds).filter(x => x.result != null).sort((a, b) => a.roundNo - b.roundNo)
        .map(x => ({ roundNo: x.roundNo, label: x.label, settings: x.settings, nPlayers: x.nPlayers, pub: x.pub, result: x.result }));
      let me = null;
      const p = id && findMe(db, id, secret);
      if (p) {
        const priv = {}, moves = {};
        for (const rn in db.priv) if (db.priv[rn][p.id]) priv[rn] = db.priv[rn][p.id];
        const mine = (db.moves[db.roundNo] || {})[p.id] || {};
        for (const st in mine) moves[st] = mine[st].data;
        let inbox = [];
        if (db.phase === 'open' && r) {
          for (const pid in db.moves[db.roundNo] || {}) {
            const m = db.moves[db.roundNo][pid][r.step];
            if (m && m.data.to === p.tag) { const q = db.players.find(x => x.id === pid); inbox.push({ tag: q.tag, name: q.name, data: m.data, at: m.at }); }
          }
          inbox.sort((a, b) => a.at - b.at); inbox = inbox.map(({ at, ...x }) => x);
        }
        me = { id: p.id, name: p.name, tag: p.tag, eligibleFrom: p.eligibleFrom, priv, moves, inbox };
      }
      return JSON.parse(JSON.stringify({ code: db.code, game: db.game, phase: db.phase, roundNo: db.roundNo,
        label: r ? r.label : null, settings: r ? r.settings : null, step: r ? r.step : 0, pending: r ? r.pending : false,
        pub: r ? r.pub : {}, nJoined: db.players.length, nPlayers, nMoved, nDone, history, me, now: Date.now() }));
    }

    function newTag(db) {
      const L = 'ABCDEFGHJKMNPQRSTUVWXYZ', D = '23456789', pick = s => s[Math.floor(Math.random() * s.length)];
      for (;;) { const t = pick(L) + pick(L) + pick(D); if (!db.players.some(p => p.tag === t)) return t; }
    }

    const api = {
      local: true,
      async state(code, player) { return state(load(), player && player.id, player && player.secret); },
      async create() { return { code: 'DEMO', hostSecret: 'local' }; },
      async join(code, name, sim) {
        const db = load(); name = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24);
        if (!name) fail('Enter a display name.');
        if (db.players.length >= 400) fail('This session is full.');
        const p = { id: uuid(), secret: uuid(), tag: newTag(db), name, eligibleFrom: db.phase === 'instructions' ? db.roundNo : db.roundNo + 1, sim: !!sim, at: Date.now() };
        db.players.push(p); save(db); return { id: p.id, secret: p.secret, tag: p.tag };
      },
      async submit(code, player, step, data) {
        const db = load(), p = findMe(db, player.id, player.secret);
        if (!p) fail('Not a participant in this session.');
        if (db.phase !== 'open') fail('Submissions are not open.');
        if (p.eligibleFrom > db.roundNo) fail('You joined after this round began. You are in for the next one.');
        const r = round(db), rn = db.roundNo;
        if (r.pending || step !== r.step) fail('That step has closed.');
        const P = db.priv[rn] || {};
        if (Object.keys(P).length && !P[p.id]) fail('You joined after this round began. You are in for the next one.');
        const M = db.moves[rn] = db.moves[rn] || {}, mine = M[p.id] = M[p.id] || {};
        if (data == null) delete mine[r.step];
        else {
          const spec = ((r.settings || {}).input || {})[String(r.step)] || ((r.settings || {}).input || {})['*'];
          check(spec, data, P[p.id], db, p.id);
          data = JSON.parse(JSON.stringify(data));
          if (data.to != null) data.to = String(data.to).toUpperCase();
          mine[r.step] = { data, at: Date.now() };
        }
        save(db); return state(db, player.id, player.secret);
      },
      async trade(code, player, fromTag) {
        const db = load(), me = findMe(db, player.id, player.secret);
        if (!me) fail('Not a participant in this session.');
        if (db.phase !== 'open') fail('Trading is closed.');
        const r = round(db), rn = db.roundNo;
        if (r.pending) fail('Trading is paused.');
        const them = db.players.find(x => x.tag === String(fromTag || '').trim().toUpperCase());
        if (!them || them.id === me.id) fail('No offer from that tag.');
        const M = db.moves[rn] || {}, om = (M[them.id] || {})[r.step], o = om && om.data;
        if (!o || o.to !== me.tag) fail('That offer was withdrawn.');
        const P = db.priv[rn] || {}, a = P[them.id], b = P[me.id];
        if (!a || !b) fail('One of you is not trading this round.');
        const kind = o.kind || 'swap', price = Math.max(1, Number(r.settings.price) || 1);
        const dropOffer = () => { delete M[them.id][r.step]; save(db); };
        if (kind !== 'swap' && !r.settings.money) fail('There is no money in this round.');
        if ((kind === 'swap' || kind === 'sell') && !(a.goods || []).includes(o.give)) { dropOffer(); fail(`${them.tag} no longer has that good.`); }
        if ((kind === 'swap' || kind === 'buy') && !(b.goods || []).includes(o.get)) fail('You no longer have that good.');
        if (kind === 'sell' && (b.tokens || 0) < price) fail('You do not have enough tokens.');
        if (kind === 'buy' && (a.tokens || 0) < price) { dropOffer(); fail(`${them.tag} no longer has enough tokens.`); }
        a.goods = a.goods || []; b.goods = b.goods || [];
        if (kind === 'swap' || kind === 'sell') { removeOne(a.goods, o.give); b.goods.push(o.give); }
        if (kind === 'swap' || kind === 'buy') { removeOne(b.goods, o.get); a.goods.push(o.get); }
        if (kind === 'sell') { b.tokens = (b.tokens || 0) - price; a.tokens = (a.tokens || 0) + price; }
        if (kind === 'buy') { a.tokens = (a.tokens || 0) - price; b.tokens = (b.tokens || 0) + price; }
        const now = Date.now();
        for (const x of [a, b]) if (!x.done && x.goods.includes(x.want)) { removeOne(x.goods, x.want); x.done = true; x.doneAt = now; }
        a.trades = (a.trades || 0) + 1; b.trades = (b.trades || 0) + 1;
        delete M[them.id][r.step]; if (M[me.id]) delete M[me.id][r.step];
        save(db); return state(db, player.id, player.secret);
      },
      async host(code, secret, action, payload) {
        const db = load(), ph = db.phase, rn = db.roundNo, r = round(db);
        payload = payload || {};
        if (action === 'setup') {
          const label = String(payload.label || 'Round').trim().slice(0, 80) || 'Round', settings = payload.settings || {};
          if (ph === 'instructions') Object.assign(r, { label, settings });
          else if (['lobby', 'revealed', 'debrief'].includes(ph)) {
            db.roundNo++; db.rounds[db.roundNo] = { roundNo: db.roundNo, label, settings, step: 0, pending: false, pub: {}, result: null, nPlayers: null }; db.phase = 'instructions';
          }
        } else if (action === 'open' && ph === 'instructions') {
          const list = eligible(db, rn);
          delete db.priv[rn]; delete db.moves[rn];
          if (payload.private) {
            const keys = Object.keys(payload.private);
            if (keys.length !== list.length || !list.every(p => keys.includes(p.id))) fail('ROSTER_CHANGED');
            db.priv[rn] = JSON.parse(JSON.stringify(payload.private));
          }
          Object.assign(r, { nPlayers: list.length, step: 1, pending: false, pub: payload.pub || {}, result: null }); db.phase = 'open';
        } else if (action === 'advance' && ph === 'open' && !r.pending) { r.step++; r.pending = true; }
        else if (action === 'publish' && (ph === 'open' || ph === 'closed')) {
          if (payload.step != null && payload.step !== r.step) return state(db);
          mergeAll(db, rn, payload.private); Object.assign(r.pub, payload.pub || {}); r.pending = false;
        } else if (action === 'close' && ph === 'open') { r.pending = false; db.phase = 'closed'; }
        else if (action === 'reveal' && ph === 'closed' && r.result == null) {
          mergeAll(db, rn, payload.private); r.result = payload.result || {}; Object.assign(r.pub, payload.pub || {}); db.phase = 'revealed';
        } else if (action === 'debrief' && ph === 'revealed') db.phase = 'debrief';
        save(db); return state(db);
      },
      async hostData(code, secret, roundNo) {
        const db = load(), rn = roundNo == null ? db.roundNo : roundNo, moves = [];
        for (const pid in db.moves[rn] || {}) for (const st in db.moves[rn][pid]) moves.push({ player: pid, step: Number(st), data: db.moves[rn][pid][st].data, at: db.moves[rn][pid][st].at });
        moves.sort((a, b) => a.step - b.step || a.at - b.at);
        return JSON.parse(JSON.stringify({ roundNo: rn, players: db.players.map(p => ({ id: p.id, name: p.name, tag: p.tag, eligibleFrom: p.eligibleFrom, sim: p.sim })), private: db.priv[rn] || {}, moves }));
      },
      /* demo only */
      simPlayers() { return load().players.filter(p => p.sim).map(p => ({ code: 'DEMO', id: p.id, secret: p.secret, tag: p.tag, name: p.name })); },
      reset() { localStorage.removeItem(KEY); },
      KEY
    };
    return api;
  }

  window.ClassroomLocal = { create, check };
})();
