/* Inflation Auction — the published rules as pure functions (see SPEC.md).
   Every winner pays one market price: the highest losing bid ($1 if no bid loses). */
(function (root) {
  'use strict';
  const hash = s => {   // FNV-1a with a final mix, so ids that differ only at the end still spread out
    let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  };

  /* Budgets fall from the sky in a 1/rank pattern: the student ranked r of n gets
     base × n / r (rounded), so the richest gets base × n and the poorest gets base.
     With one can per student and worthless leftover cash, the market price is about the
     budget of the first student who misses out, base × n / (cans + 1), so spending,
     price × cans, stays about base × n whatever the number of cans. That makes the
     auction behave like M × V = P × Y: doubling the money doubles P, doubling the cans
     halves it, and doubling both leaves it steady. Ranks come from a hash of the session
     code and the student's id, so a student keeps the same rank from round to round. */
  function budgets(ids, code, base, mult) {
    const n = ids.length, order = [...ids].sort((a, b) => hash(code + ':' + a) - hash(code + ':' + b) || (a < b ? -1 : 1)), out = {};
    order.forEach((id, i) => { out[id] = Math.max(1, Math.round(base * n / (i + 1))) * mult; });
    return out;
  }
  const cansFor = (n, pct) => Math.max(1, Math.round(n * pct / 100));

  function clean(v) {
    const n = (x, d, lo, hi) => { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return { base: Math.round(n(v.base, 2, 1, 100)), moneyMult: n(v.moneyMult, 1, 1, 10), cansPct: n(v.cansPct, 10, 1, 100), predict: !!v.predict };
  }

  /* bids: [{id, bid (null = no bid), prio}]. Highest bids win, up to `cans`; ties at the
     cutoff go to the lower priority number (a shuffle drawn when the round opened). */
  function clear(bids, cans) {
    const live = bids.filter(b => Number.isInteger(b.bid) && b.bid >= 1)
      .sort((a, b) => b.bid - a.bid || a.prio - b.prio);
    const winners = live.slice(0, cans), losers = live.slice(cans);
    const price = winners.length ? (losers.length ? losers[0].bid : 1) : null;
    return { winners: new Set(winners.map(b => b.id)), price, sold: winners.length, nBids: live.length, cutoffBid: winners.length ? winners[winners.length - 1].bid : null };
  }

  root.AuctionModel = { hash, budgets, cansFor, clean, clear };
})(typeof window !== 'undefined' ? window : globalThis);
