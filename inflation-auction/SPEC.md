# Inflation Auction — classroom specification

Revised 2026-11-24 for the whole class on phones and the shared classroom backend
(`../_shared/`). Rules are implemented in `model.js` and `game.js`; `tests.html` checks them.

## Purpose

Show the quantity theory with the book's opening economy (Ch. 2): money falls from the sky,
there is one good, and money is good only for buying it. More money chasing the same cans
raises the price; more cans for the same money lowers it; money and cans growing together
leave it about where it was. The Jan 14 debrief writes the comparison as M × V = P × Y.

## Rules

- **Budgets.** Each student gets a private cash budget when a round opens. Budgets follow a
  1/rank pattern: in a class of n, the student ranked r gets `base × n / r` (rounded, at least $1),
  so the richest gets base × n and the poorest gets base (default $2). A student's rank comes
  from a hash of the session code and their id, so it stays the same from round to round, and
  "double the money" doubles exactly what each student had. Budgets reset every round.
- **Why 1/rank.** With one can per student and worthless leftover cash, the market price is about
  the budget of the first student who misses out, base × n / (cans + 1). Spending, price × cans,
  then stays near base × n whatever the number of cans. That is the quantity theory's assumption
  that spending is pinned down by money (fixed V), built into the room. With evenly spread
  budgets, doubling the cans barely moves the price (only the marginal bidder matters), which
  would teach the wrong lesson. Simulated medians: money × 2 → price × 2.00; cans × 2 → × 0.50–0.55;
  both × 2 → × 1.00 (80 students; 10–90% range about 1.8–2.3 for money × 2 when students bid all
  their cash).
- **Goods.** Cans go to about the stated share of the students in the round (default 10%, at
  least one). Each student can win at most one can.
- **Cash is worthless after the round.** Students are told so; it makes bidding all of your cash
  sensible, which is what ties the price to the money.
- **Bids.** A whole number of dollars, at least $1 and at most the student's budget, or no bid.
  Bids are sealed and can be revised until bidding closes; the last one counts. No response
  counts as no bid. The server rejects bids above the budget.
- **Price (decided 2026-11-24): one market price.** The highest bids win, up to the number of
  cans. Every winner pays the highest losing bid; if no bid loses, the price is $1. Ties at the
  cutoff go to a random priority order drawn when the round opens (a hash of the round's seed
  and the student's id); arrival time never matters. With one can each, bidding what the can is
  worth to you is the best strategy.
- **Prediction.** In rounds with prediction on (default from round 2), students first predict
  the market price. Predictions are not scored; the projector shows the class median next to
  the actual price.

## Treatments (presets)

1. **Baseline** — base $2, money × 1, cans 10%, no prediction (played cold on Jan 12).
2. **Double the money** — money × 2, cans 10%. Price should about double.
3. **Double the cans too** — money × 2, cans 20%. Price should return to about the baseline.
4. **More cans, baseline money** (optional) — money × 1, cans 20%. Price should about halve.

Each round snapshots its settings. The treatment menu moves to the next preset after each reveal.

## Worked example

Ten students, base $2, cans 10% → one can. Budgets by rank: $20, $10, $7, $5, $4, $3, $3, $3, $2, $2
(M = $59). If everyone bids their whole budget, the $20 student wins and pays the highest losing
bid, $10: P = $10, Y = 1, spending $10, V = 10/59 = 0.17. Double the money: budgets $40, $20, …
and P = $20. Double the cans too (two cans): the $40 and $20 students win and pay $14 each
(the third budget, $7 × 2): P = $14, spending $28. (With ten students the pattern is lumpy; with
a class of 60–100 it is close to the medians above.)

## Screens

- **Student phone:** budget (large), the cans and number of bidders, the prediction box when it
  is on, the bid box, Submit bid and No bid, and a receipt of the bid on file. After the reveal:
  won or not, the market price, what they paid, and their prediction.
- **Projector:** while open, the bids received, cans (Y), money in the room (M), and bidders.
  After the reveal: the market price, the class's median prediction, Y, M, spending P × Y, bids
  received, a histogram of every bid (won or not, with the price marked), and the round
  comparison: M, Y, P, P × Y, spent ÷ money (V), and the price relative to round 1. No names,
  no individual budgets.
- **Instructor:** treatments and settings, the round controls, counts, CSV export.

## Debrief

Compare the rounds in the table. Did doubling the money double the price? Did doubling the cans
too bring it back? Spending divided by money is V; was it stable? Then write M × V = P × Y. What
does this economy leave out (production, saving, credit, more than one good, money having other
uses)? Do not claim that one auction proves the quantity theory or predicts real-world inflation.
