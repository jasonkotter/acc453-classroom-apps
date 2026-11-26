# Bond Desk

Feb 23, after 08.1–08.3 (Ch. 8 §§6–9). Runs on the shared toolkit. About 12–14 minutes for
round 1 and 5 more for round 2. Rules and calibration: [../../specs/bond-desk.md](../../specs/bond-desk.md).

## Rules

- Everyone values **the same note**: 3 years, $1,000 face value, 5% annual coupon ($50, $50,
  $1,050). Each phone shows a private **required return**, the student's opportunity cost.
- Required returns run from 3.0% to 7.0% in half points. New students get the least-used level,
  in an order that spreads the range; a student keeps their level in later rounds, so round 2
  raises each student's own return.
- **Step 1:** the student enters the note's PV at their required return and predicts the price.
  When the step ends, each phone shows the correct PV and whether the answer was within $1. The
  PV is not on the phone before then.
- **Step 2:** a whole-dollar bid from the minimum ($950) to $1,100, or no bid. The server rejects
  anything outside that range.
- Notes for sale: 40% of the students in the round (at least one). The highest bids win; ties at
  the cutoff go to a seeded priority. **Every winner pays the larger of the minimum and the
  highest losing bid.** If there are fewer eligible bids than notes, every bidder wins at the
  minimum.
- Score: a winner gets PV minus the price; everyone else gets 0. Cash ($1,100) keeps its value.

## Treatments

1. **Baseline:** required returns 3.0–7.0%.
2. **Every required return one point higher:** the same students and levels, 4.0–8.0%. Same notes
   and minimum.

## Run

Show round → Open step 1 → End step 1 (each phone sees its PV) → Close bidding → Reveal, twice.
The reveal shows the price, the market yield (the YTM at that price), the first bidder left out
and their required return, a demand curve (bids from highest to lowest, against each student's
PV), and counts of overbidding winners and of profitable notes missed.

**Checks (2026-11-26).** The model reproduces the spec's worked examples: ten truthful bidders and
four notes clear at $1,000 (5.00%), and at $973 (6.01%) with every return one point higher. A
tie at the cutoff goes to the lower priority, as in the paper kit's tally test. The demo backend
(same rules as the live schema) rejected a bid below $950. Not yet run on Supabase or real phones.

**Demo (2026-11-26).** Simulated students mostly shade their bids below PV. With 40 of them, round
1 cleared at $1,000 (5.00%). With 20 plus one student by hand, round 1 cleared at $990 (5.37%) and
round 2 at $960 (6.51%).

## Debrief

Whose required return set the price? Where does a winner's score come from? Transfer: a pension
fund needing 4% against a bank whose money earns 6%. The exit check asks whether a 6% investor
should buy at $1,000 (no: the PV is $973.27).

**Class plan:** [INSTRUCTOR_GUIDE.md](INSTRUCTOR_GUIDE.md).

**Fallback.** The paper kit in [../../pilots/bond-desk/](../../pilots/bond-desk/PILOT_GUIDE.md).
