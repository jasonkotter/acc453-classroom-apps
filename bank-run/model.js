/* Bank Run — payoff model (pure functions, no DOM, no network).
   The rules are written out in SPEC.md. Every screen and every check calls resolveBank(),
   so the phone, the projector, the CSV export, and tests.html can never disagree.
   Loaded as a plain script: attaches BankRunModel to the global object. */
(function (root) {
  'use strict';

  var DEFAULTS = {
    deposit: 100,       // dollars per depositor
    holdBonus: 1,       // interest paid to a depositor who holds, if the bank can pay it
    loanRatePct: 2,     // interest the bank's good loans pay when they are repaid later
    cashPct: 50,        // share of deposits kept as cash reserves
    salePricePct: 0,    // cents received today per $1 of good loans sold (0 = no buyer today)
    lossPct: 0,         // share of the loan book that will never be repaid
    insurance: false,   // deposit insurance on/off
    insuranceLimit: 100,// coverage per depositor, in dollars of principal
    backstop: false,    // lender of last resort on/off
    needPct: 0,         // share of depositors who need cash today and must withdraw
    windows: 1          // withdrawal windows per round; the bank pays each window in turn
  };

  /* One bank, replayed. Every later treatment changes exactly one thing about it. */
  var BANK = { cashPct: 30, salePricePct: 50, needPct: 20, windows: 3 };
  function plus(extra) { var o = {}, k; for (k in BANK) o[k] = BANK[k]; for (k in extra) o[k] = extra[k]; return o; }

  var PRESETS = [
    { id: 'bank',     label: 'The bank',               note: '30% cash, 20% of depositors need cash today, loans sell at 50 cents on the dollar, three withdrawal windows. Replay it two or three times before changing anything.',
      settings: plus({}) },
    { id: 'insured',  label: 'Deposit insurance',      note: 'The same bank, with every deposit insured.',
      settings: plus({ insurance: true }) },
    { id: 'backstop', label: 'Lender of last resort',  note: 'The same bank, no insurance. The central bank lends against good loans.',
      settings: plus({ backstop: true }) },
    { id: 'badloans', label: 'Bad loans',              note: 'The same bank, but 30% of its loans will never be repaid. No insurance, no backstop.',
      settings: plus({ lossPct: 30 }) },
    { id: 'video',    label: 'Video 09.6 grid',        note: 'Optional. The two-depositor grid at class size: half the deposits in cash, no buyer for loans, nobody needs cash, one simultaneous choice.',
      settings: { cashPct: 50, salePricePct: 0, needPct: 0, windows: 1 } }
  ];

  function num(v, lo, hi, fallback) {
    var n = Number(v);
    if (v === null || v === undefined || v === '' || !isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, n));
  }

  /* Fill in defaults and clamp every setting to a legal range. */
  function cleanSettings(s) {
    s = s || {};
    return {
      deposit: num(s.deposit, 1, 100000, DEFAULTS.deposit),
      holdBonus: num(s.holdBonus, 0, 1000, DEFAULTS.holdBonus),
      loanRatePct: num(s.loanRatePct, 0, 100, DEFAULTS.loanRatePct),
      cashPct: num(s.cashPct, 0, 100, DEFAULTS.cashPct),
      salePricePct: num(s.salePricePct, 0, 100, DEFAULTS.salePricePct),
      lossPct: num(s.lossPct, 0, 100, DEFAULTS.lossPct),
      insurance: !!s.insurance,
      insuranceLimit: num(s.insuranceLimit, 0, 1000000, DEFAULTS.insuranceLimit),
      backstop: !!s.backstop,
      needPct: num(s.needPct, 0, 100, DEFAULTS.needPct),
      windows: Math.round(num(s.windows, 1, 5, DEFAULTS.windows))
    };
  }

  function presetSettings(id) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return cleanSettings(PRESETS[i].settings);
    return cleanSettings({});
  }

  var EPS = 1e-7;

  /* Resolve one round.
     settings: see DEFAULTS. n: depositors in the round. w: how many of them withdraw.
     Returns every dollar amount the screens show. */
  function resolveBank(settings, n, w) {
    var s = cleanSettings(settings);
    n = Math.max(0, Math.floor(Number(n) || 0));
    w = Math.max(0, Math.min(n, Math.floor(Number(w) || 0)));
    var h = n - w;
    var d = s.deposit, rate = s.loanRatePct / 100, price = s.salePricePct / 100;

    var deposits = n * d;
    var cash = deposits * s.cashPct / 100;
    var loansFace = deposits - cash;
    var loanLoss = loansFace * s.lossPct / 100;   // loans that will never be repaid
    var loansGood = loansFace - loanLoss;         // what the loan book is really worth, before interest

    // --- Today: pay withdrawals from cash, then the central bank, then forced sales.
    var requested = w * d;
    var cashUsed = Math.min(cash, requested);
    var need = requested - cashUsed;

    var fedLoan = 0;                              // secured by good loans, dollar for dollar
    if (s.backstop && need > EPS) { fedLoan = Math.min(need, loansGood); need -= fedLoan; }

    var unpledged = loansGood - fedLoan;
    var saleProceeds = 0, loansSold = 0;
    if (need > EPS && price > 0) {
      saleProceeds = Math.min(need, unpledged * price);
      loansSold = saleProceeds / price;
      need -= saleProceeds;
    }

    var closed = need > EPS;                      // could not meet withdrawals today
    if (closed) {
      // The bank is shut. Whatever is not pledged is liquidated today at the forced-sale price.
      loansSold = unpledged;
      saleProceeds = unpledged * price;
    }
    var saleLoss = loansSold - saleProceeds;
    var paidToday = cashUsed + fedLoan + saleProceeds;
    var perWithdrawBank = w > 0 ? Math.min(d, paidToday / w) : null;

    // --- Later: loans the bank kept are repaid with interest. The central bank is repaid
    //     first, at the loan rate, so pledged loans exactly cover what was borrowed.
    var cashLeft = closed ? 0 : cash - cashUsed;
    var loansKept = closed ? 0 : unpledged - loansSold;
    var loanInterest = loansKept * rate;
    var fedRepaid = fedLoan * (1 + rate);
    var availableLater = cashLeft + loansKept + loanInterest;
    var owedHolders = h * (d + s.holdBonus);
    var paidHolders = Math.min(owedHolders, availableLater);
    var perHoldBank = h > 0 ? paidHolders / h : null;
    var ownersResidual = availableLater - paidHolders;

    var status = closed ? 'closed' : (paidHolders < owedHolders - 1e-6 ? 'short' : 'sound');

    // --- Deposit insurance: tops each depositor up to the covered part of the deposit.
    var covered = s.insurance ? Math.min(s.insuranceLimit, d) : 0;
    var topW = (w > 0 && s.insurance) ? Math.max(0, covered - perWithdrawBank) : 0;
    var topH = (h > 0 && s.insurance) ? Math.max(0, covered - perHoldBank) : 0;
    var fdicPaid = topW * w + topH * h;

    return {
      settings: s, n: n, w: w, h: h,
      share: n > 0 ? w / n : 0,
      deposits: deposits, cash: cash, loansFace: loansFace, loanLoss: loanLoss, loansGood: loansGood,
      requested: requested, cashUsed: cashUsed, fedLoan: fedLoan, loansSold: loansSold,
      saleProceeds: saleProceeds, saleLoss: saleLoss, paidToday: paidToday, unpaidToday: Math.max(0, requested - paidToday),
      cashLeft: cashLeft, loansKept: loansKept, loanInterest: loanInterest, fedRepaid: fedRepaid,
      availableLater: availableLater, owedHolders: owedHolders, paidHolders: paidHolders, ownersResidual: ownersResidual,
      closed: closed, status: status,
      perWithdrawBank: perWithdrawBank, perHoldBank: perHoldBank,
      insuranceTopWithdraw: topW, insuranceTopHold: topH, fdicPaid: fdicPaid,
      perWithdraw: w > 0 ? perWithdrawBank + topW : null,
      perHold: h > 0 ? perHoldBank + topH : null
    };
  }

  /* Resolve a round played in withdrawal windows.
     byWindow[i] is the number of new withdrawals in window i+1. The bank pays each window in
     turn. While it can pay, every withdrawer gets the full deposit, so the result is the same
     as resolveBank() on the total. If a window asks for more than the bank can raise, the bank
     closes in that window: earlier windows have been paid in full, that window's withdrawers
     split what is left equally, and everyone else (holders, and anyone who asks after the
     doors shut) gets nothing from the bank. */
  function resolveWindows(settings, n, byWindow) {
    var s = cleanSettings(settings), counts = [], cum = 0, i;
    n = Math.max(0, Math.floor(Number(n) || 0));
    byWindow = byWindow || [];
    for (i = 0; i < byWindow.length; i++) {
      var c = Math.max(0, Math.min(n - cum, Math.floor(Number(byWindow[i]) || 0)));
      counts.push(c); cum += c;
    }
    var total = cum, before = 0, closeAt = 0;
    cum = 0;
    for (i = 0; i < counts.length; i++) {
      before = cum; cum += counts[i];
      if (resolveBank(s, n, cum).closed) { closeAt = i + 1; break; }
    }
    var r, perWindow = [], perWindowBank = [];
    if (!closeAt) {
      r = resolveBank(s, n, total);
      for (i = 0; i < counts.length; i++) {
        perWindowBank.push(counts[i] > 0 ? r.perWithdrawBank : null);
        perWindow.push(counts[i] > 0 ? r.perWithdraw : null);
      }
      r.late = 0;
    } else {
      r = resolveBank(s, n, cum);                 // w = everyone who asked up to the closing window
      var d = s.deposit, covered = s.insurance ? Math.min(s.insuranceLimit, d) : 0, fdicW = 0;
      for (i = 0; i < counts.length; i++) {
        var bank = i < closeAt - 1 ? d : (i === closeAt - 1 ? (r.paidToday - before * d) / counts[i] : 0);
        var top = s.insurance ? Math.max(0, covered - bank) : 0;
        perWindowBank.push(counts[i] > 0 ? bank : null);
        perWindow.push(counts[i] > 0 ? bank + top : null);
        if (i < closeAt) fdicW += top * counts[i];
      }
      r.late = total - cum;                       // asked after the bank closed; counted with the holders
      r.fdicPaid = fdicW + r.insuranceTopHold * r.h;
      r.perWithdrawBank = r.paidToday / cum;      // averages across windows
      r.perWithdraw = (r.paidToday + fdicW) / cum;
    }
    r.byWindow = counts; r.closedInWindow = closeAt; r.perWindow = perWindow; r.perWindowBank = perWindowBank;
    return r;
  }

  /* What one depositor receives. window = the window they withdrew in (1, 2, …), or
     null/undefined if they held. Doing nothing counts as holding. */
  function payoutFor(result, window) {
    if (!window) return result.perHold;
    var v = result.perWindow ? result.perWindow[window - 1] : result.perWithdraw;
    return v == null ? result.perWithdraw : v;
  }
  /* The part of that payout that came from the bank itself (the rest is deposit insurance). */
  function bankPayoutFor(result, window) {
    if (!window) return result.perHoldBank;
    var v = result.perWindowBank ? result.perWindowBank[window - 1] : result.perWithdrawBank;
    return v == null ? result.perWithdrawBank : v;
  }

  /* Two markers for the projector: the most withdrawals that still leave every holder whole,
     and the most the bank can pay without closing. maxSafe is -1 if holders lose even when
     nobody withdraws. */
  function thresholds(settings, n) {
    var maxSafe = -1, maxMet = 0, ok = true;
    for (var k = 0; k <= n; k++) {
      var r = resolveBank(settings, n, k);
      if (ok && r.status === 'sound') maxSafe = k; else ok = false;
      if (!r.closed) maxMet = k;
    }
    return { maxSafe: maxSafe, maxMet: maxMet };
  }

  /* What the run cost. The comparison is the same bank when only the depositors who needed
     cash withdraw. "destroyed" is how much less the bank paid its depositors in total. */
  function runCost(settings, n, nNeed, result) {
    nNeed = Math.max(0, Math.min(n, Math.floor(Number(nNeed) || 0)));
    var base = resolveBank(settings, n, nNeed);
    function tot(x) { return Math.min(x.paidToday, x.requested) + x.paidHolders; }
    return {
      base: base, baseSound: base.status === 'sound',
      destroyed: Math.max(0, tot(base) - tot(result)),
      ran: Math.max(0, result.w + (result.late || 0) - nNeed)
    };
  }

  /* The payoff schedule the projector draws: for each possible number of withdrawers k,
     what a withdrawer receives and what a holder receives. */
  function payoffCurve(settings, n) {
    var pts = [];
    for (var k = 0; k <= n; k++) {
      var r = resolveBank(settings, n, k);
      pts.push({ k: k, share: n ? k / n : 0, withdraw: r.perWithdraw, hold: r.perHold, status: r.status });
    }
    return pts;
  }

  /* Largest number of withdrawals the bank can meet today without closing. */
  function maxWithdrawalsMet(settings, n) {
    var best = 0;
    for (var k = 0; k <= n; k++) if (!resolveBank(settings, n, k).closed) best = k;
    return best;
  }

  root.BankRunModel = {
    DEFAULTS: DEFAULTS, PRESETS: PRESETS,
    cleanSettings: cleanSettings, presetSettings: presetSettings,
    resolveBank: resolveBank, resolveWindows: resolveWindows, payoutFor: payoutFor, bankPayoutFor: bankPayoutFor,
    payoffCurve: payoffCurve, maxWithdrawalsMet: maxWithdrawalsMet, thresholds: thresholds, runCost: runCost
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
