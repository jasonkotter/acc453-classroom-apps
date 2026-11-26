# Repair the Capital Ratio

Mar 11, after 09.10 (Ch. 9 §§15–17), in place of selected capital-ratio problems. Runs on the
shared toolkit. About 10–12 minutes for one round. Rules and ledgers:
[../../specs/capital-repair.md](../../specs/capital-repair.md) and
`../../specs/calibration/capital_repair.py`.

A diagnostic activity, not a strategic game: nothing a classmate does changes your bank. The
class's split of repairs and its predictions are what get discussed.

## Rules

- **Starting bank:** cash 10, loans 80, Treasuries 10 (assets 100); deposits 96, common equity 4.
- **Supplied rules for this exercise:** loans carry a 100% risk weight, cash and Treasuries 0%.
  Floors: 8% of risk-weighted assets (RWA) and 5% of total assets; a ratio exactly at a floor
  passes. Ending assets stand in for average assets, loans sell at par, and a zero credit weight
  does not remove the Treasuries' interest-rate risk. The bank starts at 5.0% and 4.0% and fails
  both.
- **Step 1:** pick one repair and predict which floors the repaired bank still fails (neither,
  risk-based only, leverage only, or both). Tapping a repair or a prediction sends it; either can
  change until the step ends. A prediction needs a repair first.
  - A. Sell 30 of loans at par; buy 30 of Treasuries → 8.0% and 4.0% (fails leverage).
  - B. Sell 40 of loans at par; repay 40 of deposits → 10.0% and 6.7% (passes both).
  - C. Issue 3 of new common equity for cash; redeem 3 of deposits → 8.75% and 7.0% (passes both).
  - D. Borrow 3 from the central bank → 5.0% and 3.9% (fails both: liquidity, not capital).
- **End step 1** puts all four balanced ledgers on the projector, with a bar for each ratio, the
  floor marked, how many chose each repair, and how many of them predicted right.
- **Step 2:** a recognized credit loss of L% of loans (2% by default, announced before anyone
  answers) hits every bank. Loans and equity fall by the same amount; cash does not change.
  Predict which floors your bank fails now and whether its equity is still positive.
- **No repair** in step 1 keeps the starting bank, counted separately; that student predicts for
  the starting bank in step 2.
- Scored on prediction accuracy only. There is no leaderboard of repairs: B and C are both
  feasible, and neither is the right answer unless a goal such as keeping all 80 of loans is added.

## Treatments

1. **Repair, then a 2% loss** (the default). After the loss: A 6.1% and 3.0%, B 8.2% and 5.4%
   (passes both), C 6.9% and 5.5%, D 3.1% and 2.4%. No bank has negative equity; none is short of
   cash.
2. **Repair, then a 6% loss** (optional). Every repair fails a floor, and D's equity is −0.8. Better
   for the solvency point, worse for comparing the repairs. Run it as a second round only if time
   allows; the bank, repairs, weights, and floors are the same.

## Run

Show round → Open step 1 → End step 1: show the four ledgers → Close step 2 → Reveal. The reveal
shows each bank after the loss (loss in dollars, equity before and after, both ratio bars, RWA, and
cash), how many predicted right on the floors and on positive equity, and a round comparison.

**Checks (2026-11-26).** The model reproduces every number in the spec's two tables: all four
repaired ledgers balance (assets = deposits + central-bank debt + equity), and the 2% and 6% losses
give the ratios above. The demo backend (same rules as the live schema) accepts only the listed
choices.

**Demo (2026-11-26).** 20 simulated students plus one by hand on a 375-pixel phone, two rounds.
Every projector screen fits 1280×720, including the reveal with two rounds compared (666 pixels)
and the opening screen of a later round, where the toolkit adds its comparison card. No console
errors. Not yet run on Supabase, real phones, or with students.

## Debrief

How did A reach 8.0% without a dollar of new equity? What did the leverage ratio see that RWA
missed? Why did C, with the largest dollar loss, keep the most equity? What does the economy lose
when banks repair by shrinking, and who gives something up when they issue equity? The exit check
is the spec's transfer bank (cash 5, loans 60, Treasuries 35; deposits 95, equity 5; a 10% loss):
it breaches both floors and its equity is −1, but nothing shows a cash shortfall.

**Optional follow-up:** the Class Check set `capital-layers` (one question on CET1, AT1, and Tier
2). Skip it if the AT1 case runs that day.

**Class plan:** [INSTRUCTOR_GUIDE.md](INSTRUCTOR_GUIDE.md).

**Fallback.** The paper kit in [../../pilots/capital-repair/](../../pilots/capital-repair/PILOT_GUIDE.md).
