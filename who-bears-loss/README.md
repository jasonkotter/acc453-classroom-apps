# Who Bears the Loss?

Mar 9, after 09.7 (Ch. 9 §§11, 14), in place of one generic insurance and moral-hazard discussion
exercise; it bridges forward to capital on Mar 11. Runs on the shared toolkit. About 8–10
minutes for two rounds. Design: [../../APP_BUILD_PLAN.md](../../APP_BUILD_PLAN.md), "Who Bears
the Loss?: a better new insurance activity." Do not schedule it on the same day as The Rescue
Fund; both would be new games on Mar 9.

Bank Run changes depositors' incentives and holds the bank's assets fixed. This activity changes
the owners' incentives. It is a diagnostic activity, not a strategic game: nothing a classmate
does changes your bank.

## Rules

- **A disclosed one-period model.** Assets cost 100, funded by deposits D and owners' equity E
  (90 and 10 by default). The **safe** portfolio pays 105 for sure; the **risky** one pays 125 or
  85, each with probability one-half. Both pay 105 on average. Owners have limited liability and
  are risk-neutral.
- Each student, as the owner, does three things in one step (each tap sends; anything can change
  until answers close): picks **safe or risky**; predicts the owners' **expected ending equity**
  for that choice (a number, to the nearest 0.5; within 0.25 counts as right); and says **who
  covers the shortfall** if the risky portfolio pays 85 (the deposit insurer, depositors or
  lenders, the owners beyond their equity, or no one because there is none).
- Both outcomes are shown for both portfolios at the reveal. No coin is flipped and no lucky
  winner is picked.
- Scored on prediction accuracy only. The choice itself is not scored; the class's split is the
  evidence.
- No answer: no portfolio is recorded, and the student is not counted in the split.

## Treatments

| Round | Funding | Safe: owners expect | Risky: owners expect | Bad state of risky |
|---|---|---|---|---|
| 1. Insured deposits, flat premium | Deposits of 90 credibly insured; premium the same whatever the bank picks | 15 (profit 5) | 17.5 (profit 7.5) | Insurer pays 5 (expected cost 2.5); depositors get 90 |
| 2. Lenders see the portfolio and price it | No insurance; lenders observe the portfolio before they lend, are risk-neutral, and need to expect 90 back | 15 (profit 5) | 15 (profit 5) | A risky bank must promise 95; lenders get 95 or 85, 90 on average |
| 3. Insured, with more capital: equity 15 (transfer) | As round 1, but owners issue 5 more equity and repay 5 of deposits (deposits 85) | 20 (profit 5) | 20 (profit 5) | Assets of 85 cover deposits of 85; the insurer pays nothing |

Round 2's pricing is a benchmark: it requires lenders to see and enforce the portfolio **before**
they lend, a zero required return, and no other frictions. Fair pricing removes this particular
subsidy and leaves owners indifferent; it does not make the safe portfolio the unique best choice.
If risk is hidden until after funding, uninsured lenders can bear shifted risk too.

Round 3 compares with round 1, not round 2. Run in order 1 → 2 → 3, the toolkit's comparison card
for round 3 lists two changes (funding and equity); say so.

## Run

Show round → Open answers → Close answers → Reveal. The reveal shows the class's split, a sentence
on where the owners' extra expected payoff came from, prediction accuracy on both questions, a
payoff table (both states of both portfolios: what the assets pay, what depositors or lenders
get, what the insurer pays or the lenders are short, and what owners get, with expected values),
and a round comparison.

**Checks (2026-11-26).** The model reproduces the plan's table for all three treatments: insured,
15 and 17.5 with an expected insurer cost of 2.5; priced, a promise of 95 and 15 either way;
equity 15, 20 either way and no insurer payment. The demo backend (same rules as the live
schema) accepts only the listed choices and a prediction from 0 to 100.

**Demo (2026-11-26).** Simulated owners pick risky 65% of the time when it pays owners more and
40% otherwise. With 20–21 students: 60% risky when insured, 38% when priced, 50% with more
capital. One student by hand on a 375-pixel phone. Every projector screen fits 1280×720,
including the reveal with three rounds compared (678 pixels). No console errors. Not yet run on
Supabase, real phones, or with students.

## Debrief

Where does the insured owners' extra 2.5 come from? (The insurer, not a higher expected asset
payoff.) What did pricing by lenders take away, and what if lenders could not see the choice
until after they lent? Why does more capital change the owners' choice? Transfer: a risk-based
premium of 2.5 charged only to risky banks, or effective supervision instead. The exit check asks
where the extra 2.5 comes from.

**Class plan:** [INSTRUCTOR_GUIDE.md](INSTRUCTOR_GUIDE.md).

**Fallback.** The payoff table on a slide, safe or risky by show of hands, and the predictions on
paper.
