# The Rescue Fund (Panic of 1907)

Mar 9, after 09.7–09.9 (Ch. 9 §§11–13), in place of "You're Morgan." Runs on the shared toolkit.
About 15–18 minutes. Rules and calibration: [../../specs/rescue-fund.md](../../specs/rescue-fund.md).

## Rules

- Commonwealth Trust is **solvent but short of cash** by T. Every student is a bank: **large**
  (free cash 30, loses 40 if Commonwealth fails) or **small** (cash 10, loses 8). About 20% are
  large, and at least two. Roles carry over to later rounds; new students fill in.
- T = 50% of all free cash in the room (420 with 60 students).
- **Window 1:** a hidden pledge (0 to the bank's cash) and a prediction of total pledges as a
  percentage of T. **Window 2:** the bank may raise its pledge, not lower it. The server enforces
  both limits from each phone's private data. No answer in window 2 leaves the pledge where it
  was.
- **All or nothing.** If total pledges P < T, every pledge is refunded, Commonwealth fails, and
  every bank takes its loss. If P ≥ T, every bank lends T ÷ P of its pledge, and lending costs
  15¢ per dollar lent (the loan is repaid with interest).
- Score: points lost = 0.15 × amount lent + the loss if Commonwealth failed. Lower is better.

## Treatments

1. **Private pledges:** no one sees a total until the reveal.
2. **Morgan in the library:** the same banks, cash, losses, T, cost, and two windows; after window
   1, the projector and every phone show the total pledged and the gap.

The instructor screen shows the window 1 total in both rounds, marked as shown or not shown.

## Run

Show round → Open window 1 → End window 1 → Close pledges → Reveal, twice. The reveal shows saved
or failed, a meter of pledges against T with the window 1 total, pledges by role (nothing, some,
all), points lost by role, the room's total, and what the room would have lost under the other
outcome.

**Checks (2026-11-26).** The model matches the spec's payoff table (others pledge 410, a large bank
pledges 15: it lends 14.82 and loses 2.22) and the paper kit's tally tests (T = 70: 65 pledged
fails with 144 points lost; 75 pledged succeeds, each bank lends 93% of its pledge, and the room
loses 10.5). The demo backend (same rules as the live schema) rejected a pledge above a bank's
cash and a window 2 pledge below the window 1 pledge. Not yet run on Supabase or real phones.

**Demo (simulated students, 2026-11-26).** Simulated banks decide once per window: large banks
pledge in full 80% of the time, small banks 20%. With 21 students the private round failed (125
of 145). With 80 students both rounds succeeded; small banks pledged 21% of their cash in private
and 41% once the gap was shown. Real students will differ; the paper kit's run sheet has a branch for each
outcome.

## Debrief

Who pledged, as a share of their cash? Why would a small bank that loses 8 pledge nothing? What
did seeing the gap change? Transfer: a central bank lending against collateral at a penalty rate,
and an insolvent Commonwealth. The exit check is the gap-of-6 question (pledge exactly 6).

**Before class:** check the Knickerbocker and Trust Company of America details in the spec
against Ch. 9 §13 and the Mar 17 lecture.

**Class plan:** [INSTRUCTOR_GUIDE.md](INSTRUCTOR_GUIDE.md).

**Fallback.** The paper kit in [../../pilots/rescue-fund/](../../pilots/rescue-fund/PILOT_GUIDE.md).
