# Information Market

Mar 16, Ch. 10 (replaces Recession Call or part of the March 2020 corporate-bond case; lower
priority because Mar 16 is the heaviest preparation day). Runs on the shared toolkit, with a
call market like the auction's. About 15–20 minutes. Design: `../../APP_BUILD_PLAN.md`,
"Shortlist of new shared games".

## Rules

- A borrower will **repay** (a claim pays $100) or **default** (pays $0), equally likely.
- Every student starts with **$100 cash and one claim**, and may get a private **clue** ("sales
  rose" or "sales fell") that is right a set share of the time.
- **Two markets** (steps). In each, a student enters a probability that the borrower repays and
  one order: buy one claim at up to a price, sell one at no less than a price, or sit out. A buy
  needs the cash; a sell needs a claim.
- **Call market:** one clearing price, the one at which the most claims trade (the midpoint of
  the range if several), all trades at that price. With no trades, the screens show where the
  orders stood (best bid, best ask).
- Between the markets a **rating change** (upgrade or downgrade) is announced, right 70% of the
  time.
- At the end claims pay off. Score = cash + claims × payoff, compared with not trading.
- **The outcome is kept off students' phones.** The outcome, clues, and rating are drawn from the
  instructor's private session secret, so only the instructor's browser can compute them; the
  outcome is published at the reveal. (Use the same browser that created the session.)

## Treatments (presets)

1. **Everyone gets a weak clue** (right 65%).
2. **A new borrower: a few insiders** (1 in 5 get a clue, right 90%).
3. **A new borrower: no clues** (only the rating change).

Each round is a new borrower with a new outcome.

## Run

Each round: Show round → Open market 1 → Clear market 1 (this announces the rating change) →
Close market 2 → Reveal. The reveal shows the outcome, how many clues pointed each way, what all
the clues together implied (Bayes from 50/50), both market prices, and a chart of prices against
the pooled clues and the payoff.

**Checks (2026-11-24):** over 200 simulated draws the borrower repaid 53% of the time and clues
were right 65% of the time; the clearing rule was checked by hand on small order books.

**Demo (40 simulated traders):** weak clues (23 of 40 said repay; together they implied $98):
market 1 at $53, then after an upgrade buyers bid up to $72; it repaid. Insiders (6 clues, all
"default"): $46, then sellers asked $34; it defaulted. No clues: $53, then a wrong downgrade sent
asks to $38 on a borrower that repaid. In the demo, market 2 had no trades because simulated
traders all agreed after the news; real students will disagree more. If no one trades, the
quotes still show where the price went, and "why did nobody trade?" is a good question.

**Debrief.** No one in the room knew the answer: how close did the price get, and how? Whose
information reached the price, and who sat out? Did the rating change add information, or just
move everyone the same way? What besides default risk moves a bond price? Use March 2020 to
discuss an expected future buyer (the Fed's facilities) without attributing the whole price move
to the announcement.

**Fallback.** Index cards with clues; buy and sell slips; find the clearing price on the board.
