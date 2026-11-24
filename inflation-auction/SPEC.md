# Inflation Auction — first classroom specification

## Purpose

Show how a larger quantity of money can raise the price of a fixed supply of goods. Students make one simultaneous sealed bid for a can of Diet Coke. The class compares bids and prices as cash and goods supply change.

## Rules

- Each participant receives a private cash budget for the round. Budgets are assigned by the instructor and reset at the start of each round.
- The class auctions a fixed number of identical cans. Each participant may win at most one can.
- A bid is a whole dollar, at least $1, and no more than the participant's cash budget. A blank submission is no bid. No loans or credit are available.
- Bids stay hidden while submissions are open. Participants may revise their bid until the instructor closes the round. The last accepted bid is used.
- Highest bids win, up to the available supply. Each winner pays their own bid (first-price auction); ties at the supply cutoff are resolved by a shuffled priority list created when the round opens and recorded with the round.
- A winner's cash payoff is starting cash less the bid. Non-winners and non-bidders keep their cash. A can has the same fixed classroom value in every treatment; it is not needed to calculate the auction price and is not used to reward speed.
- A nonresponse is treated as no bid. The phone confirms receipt and shows the submitted bid, but never shows others' bids before reveal.
- The server accepts one current submission per participant per round and resolves a closed round once. Closed-round inputs and settings are immutable.

## Treatment sequence

1. **Baseline:** one can; instructor-set starting cash (demo default: $2–$8, assigned reproducibly).
2. **More money:** same participants and one can; reset budgets to twice each participant's baseline cash.
3. **More goods:** keep the round 2 budgets; increase supply (demo default: four cans).

These are defaults, not mandatory settings. The instructor may edit cash, supply, and budget multiplier before opening a round. Each round snapshots its settings. A new round never carries forward spent cash.

## Worked example

With one can and bids of $2, $5, $5, and $3, one of the two $5 bidders wins by the recorded tie priority, pays $5, and the other three bidders pay nothing. Quantity sold is one, mean winning price is $5, and aggregate unspent cash is the sum of all starting budgets minus $5. If both tied bids are at the supply cutoff, the displayed tie-priority rule decides the winner; arrival time does not.

## What the screens show

- **Student phone:** join code and display name, round instructions, starting cash, one bid field, remaining cash, submit/revise button, receipt confirmation, and personal outcome after reveal. No leaderboard is shown during submissions.
- **Instructor:** private controls for session creation, game/settings, open/close/reveal, replay with new settings, participant/submission counts, and CSV export. Instructor authority must be checked by the backend.
- **Projector:** session code/QR and join count in the lobby; submission count while open; after reveal, bid distribution, winning bids, mean winning price, quantity sold, aggregate unspent cash, and a compact round comparison. No instructor controls, display names, or private budgets are shown.

## Local demo behavior

The first build includes a self-contained local demo with simulated bidders, all three views, a visible phase sequence, adjustable treatments, round comparison, and CSV export. Local demo data is stored only in that browser. It is for design review and rehearsal; it does not synchronize devices or provide production access control. The shared classroom release requires Supabase session persistence, row-level security, server-side validation/resolution, recovery on refresh, and real-phone playtesting.

## Debrief

Compare the bid distribution and transaction price across rounds. Ask whether doubling cash doubled the winning price, why it did or did not, and what changed when supply rose. Connect the result to nominal spending and fixed real output, then introduce MV = PY. Do not claim that one auction proves the quantity theory or predicts real-world inflation.
