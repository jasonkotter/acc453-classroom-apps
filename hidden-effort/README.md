# Hidden Effort

The moral-hazard round after Lemons Market. Feb 9, after 06.2–06.4 (hidden type vs. hidden
action; screening and monitoring). Runs on the shared toolkit. Built from the plan's Hidden
Choice spec (a lender facing a borrower's hidden effort, played in pairs). Lemons is hidden
*type*; this is hidden *action*.

## Rules

- Each round the class splits at random into **lenders** and **borrowers**, paired one to one
  (with an odd number, one student watches). New partners every round.
- A borrower needs $100 for a project that pays **$160** if it succeeds and **$0** if it fails.
- Step 1: the lender sets the **interest rate** (0–60%; no rate = no loan). Lenders also guess
  the share of borrowers who will slack; borrowers guess the average rate.
- Step 2: the borrower sees the terms and chooses, **hidden from the lender**: **work** (costs
  the borrower $10; the project succeeds 90% of the time), **slack** (free; 50%), or **decline**
  (no answer = decline).
- Success: the borrower repays $100 × (1 + rate) and keeps the rest. Failure: the borrower repays
  nothing (limited liability).
- Each pair's luck is one draw from the session's seed, so a working borrower's project fails
  only on a bad draw (the 10%). Gains are shown as realized and as expected (before luck); the
  projector uses expected gains so luck does not drive the comparison.

**The model's answer.** Working beats slacking only if 0.4 × ($160 − repayment) ≥ $10, i.e. at
rates up to **35%**. Above that, a higher rate makes slacking pay, and a lender's expected gain
falls off a cliff (at 35%: +$21.50 if the borrower works; at 36% and slacking: −$32). This is why
lenders ration credit rather than raise the rate (Stiglitz–Weiss), shown on the projector as the
class's choices by the rate charged.

## Treatments

1. **Hidden effort**, then the same again with new partners (lenders have now seen which rates
   got effort).
2. **Lenders can monitor** for $5: a monitored borrower who slacks is caught and the loan is
   called back, so a monitored borrower works at rates up to 48%. Why banks monitor (06.4).
3. **Borrowers post $30 of collateral**, kept by the lender on a failure: working beats slacking
   at every allowed rate. Skin in the game.

## Demo (40 simulated students, 2026-11-24)

| Round | Average rate | Borrowers who slacked | Lender gain (expected) | Value created |
|---|---|---|---|---|
| Hidden effort | 29% | 20% | $4.36 | 68% |
| Hidden effort, new partners | 33% | 30% | $3.07 | 52% |
| Lenders can monitor | 33% | 5% | $13.79 | 83% |
| Borrowers post collateral | 31% | 0% | $20.68 | 100% |

"Value created" is the pairs' combined expected gain as a share of what it would be if every
borrower worked ($34 a loan). Simulated borrowers choose their best option 80% of the time.

## Run (about 10–15 minutes)

Show round → Open: lenders set terms → End terms; send them to borrowers → Close the round →
Reveal. Two or three rounds fit after Lemons; the PPP or LendingClub case may replace it.

**Debrief.** At what rate did borrowers start slacking, and did lenders see it coming (their
guess against the result)? Why can't a lender fix the problem by charging more? What did
monitoring buy, and why is it cheaper for one bank to monitor than for many small lenders
(06.3)? How is collateral different from monitoring? Where else does a lender limit what it
cannot see (covenants, down payments, deductibles)?

**Fallback.** Pairs on paper: the lender writes a rate on a slip, the borrower circles work or
slack, a die roll decides success (1–9 of 10 for work, 1–5 for slack).
