# Fire Sale

Mar 2 or Mar 9, Ch. 8–9. Runs on the shared toolkit. About 15–20 minutes. Supplies the
contagion between banks that Bank Run leaves out. Design: `../../APP_BUILD_PLAN.md`,
"Shortlist of new shared games".

## Rules

- Every student is a bank: **$10 cash and 90 units** of one long-term asset at $1.00, funded by
  deposits and **$6–$14 of equity** (banks differ, so the thinnest fail first). Every bank holds
  the same asset.
- **3 steps.** At the start of each step a bank sees its withdrawal ($3–$9, drawn from the
  "Withdrawals" number, so the same number gives the same shocks to the same roster in every
  round). It chooses how many units to **sell** (and, with the lender of last resort, how much
  to **borrow**). No answer = sell nothing.
- **Price rule:** every 1% of all the asset in the room sold in a step lowers the price
  **0.5%**. Voluntary sales execute at the new price and every bank's units are marked at it.
- If a bank still cannot pay its withdrawal, the shortfall is sold for it at a **20% discount**
  (forced sales also lower the price). A bank that cannot pay even after selling everything
  fails at once and its remaining units are dumped.
- If a bank's equity falls below **$4**, nervous depositors take **$8 extra** next step.
- Equity = cash + units × price − deposits − central bank loan (with 2% cost). Below zero at
  the end = failed.
- **Lender of last resort** (round 3): a bank may borrow up to 70% of its units' **pre-crisis**
  value, for 2%: Bagehot's rule of lending against good collateral at pre-panic prices.
- In step 1, every student predicts the asset's price at the end.

## Treatments (presets)

1. **Sales move the price.**
2. **Same banks, no price impact** (same balance sheets and withdrawals).
3. **Sales move the price; the central bank lends.**

The reveal also re-runs every round's **same choices with no price impact** and reports how many
banks would have failed. The gap is what the banks did to each other.

## Run

Each round: Show round → Open step 1 → End step 1 … → End the last step → Reveal. The projector
shows the price path (earlier rounds dashed), banks failed, the share of the asset sold, and the
median equity.

**Calibration (40 banks, from the model):** if every bank sells only what its withdrawals need,
the price ends near 95¢ and none fail; if 30% also sell 15 extra units each step, it ends near
88¢ and about half fail; if most sell heavily, nearly all fail. With 70% of banks borrowing
instead of selling, none fail.

**Demo (40 simulated banks, 2026-11-24):** price impact, final price 84¢, **30 of 40 failed**, 0
with the same choices and no impact; two-thirds of the units sold were beyond what withdrawals
required. No price impact: 0 failed. Central bank lends: price 94.9¢, 0 failed, $175 borrowed.
Students predicted about 83¢ in every round.

**Debrief.** Which banks failed: the ones that sold, or the ones that held? Separate the shared
shock (withdrawals) from the damage that came from other banks' selling. A lower market value is
not automatically a realized loss or a failure: why did it become one here? Why sell early when
you expect others to sell? What did lending at pre-crisis values change? Connect to First
Republic (Mar 2) or the speed of runs (Mar 9), and say what the model leaves out (one asset,
a mechanical price rule, no interbank lending, no capital rules).

**Fallback.** On the board: five banks, a price that falls 2¢ for every unit sold, and a show of
hands each step.
