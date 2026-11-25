# Payment Gridlock

Jan 26, Ch. 4–5 (replaces Settle Up). Runs on the shared toolkit. About 15–20 minutes.
Design: `../../APP_BUILD_PLAN.md`, "Shortlist of new shared games".

## Rules

- Every student is a bank with a **$100 balance** at the central bank. Each bank owes **3
  payments of $100** to three other banks and is owed 3 payments by three others. The network is
  a shuffled ring set by the "Network" number, so the same number gives the same obligations
  (for the same roster) in every round.
- The day has **4 hours** (steps). Each hour a bank chooses how many of its waiting payments to
  send (the server rejects more than it has waiting). No answer = hold everything.
- **Gross settlement:** payments sent in an hour settle one at a time in random order. A bank
  that sends more than it holds borrows intraday credit; the fee is **10% of its largest
  overdraft in each hour** (so an overdraft carried into the next hour is charged again).
- **Netting:** payments sent in an hour are netted; only a net overdraft at the end of the hour
  is charged.
- Every payment still waiting at the end of an hour costs **$5**; a payment not sent by the end
  of the day costs **$30** and stays unpaid. Score = total cost (lower is better).
- In hour 1 every student also predicts the share of all payments done by the end of hour 2.

The tension: sending early risks paying for credit if the incoming payments have not arrived;
holding costs delay and, if everyone holds, nobody receives anything.

## Treatments (presets)

1. **Gross settlement, costly credit.**
2. **Same payments, netted each hour** (same network, same balances).
3. **Gross, free daylight credit** (credit fee 0), the central bank's fix.

## Run

Each round: Show round → Open hour 1 → End hour 1 … → End the last hour → Reveal. The projector
shows payments done, payments waiting, credit used, and idle balances at banks that still have
payments waiting, with a line of payments done by hour and the earlier rounds dashed.

**Demo (40 simulated banks, 2026-11-24):** gross with costly credit, 48% of payments done in
hour 1 and 85% by hour 2, total cost $665, while banks with payments waiting held $4,800 of
idle balances after hour 1; netting, 97% in hour 1, total cost $20; free daylight credit, 98% in
hour 1, peak credit $2,000. Simulated banks mostly send only what their balance covers when
credit is costly; real students will differ.

**Debrief.** Every bank was owed exactly as much as it owed: why didn't the money move? What did
waiting cost you, and what did it cost the banks you owed? Why does netting need so much less
money, and what risk does it add if a bank fails before the end of the day (settlement finality,
unresolved claims)? Why does the Fed provide daylight overdrafts? Netting is not ACH, and it is
not risk-free.

**Not modeled:** a participant failing mid-day, collateral for intraday credit, queues that
release payments automatically, payments of different sizes.

**Fallback.** On the board: five volunteers in a ring, each holding one $100 bill and owing $100
to the next.
