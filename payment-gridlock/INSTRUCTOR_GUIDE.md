# Instructor guide: Payment Gridlock

**Class:** Tuesday, January 26, after 04.1–04.2 (ACH, cards, Fedwire, and CHIPS). **Book:**
Ch. 4. **Time:** about 15–20 minutes with the debrief. Replaces Settle Up.

## Goal

Every bank in the room is owed exactly as much as it owes, and every bank has enough money to make
one payment. The system has plenty of money in total, yet if each bank waits for incoming
payments before sending its own, nothing moves. Students should leave able to explain why
gross settlement needs liquidity, why netting needs so much less of it, and why central banks
provide intraday credit.

## How a round works

1. **Every student is a bank** with a $100 balance at the central bank. Each bank owes three
   payments of $100 to three other banks and is owed three payments by three others. The network
   is a ring set by a number, so the same number gives the same obligations in every round.
2. **The day has four hours.** Each hour a bank chooses how many of its waiting payments to send.
   No answer means it holds them all.
3. **Costs.** A payment still waiting at the end of an hour costs $5. A payment never sent by the
   end of the day costs $30 and stays unpaid. Under gross settlement, a bank that sends more
   than it holds borrows intraday credit and pays 10% of its largest overdraft each hour. The
   score is total cost; lower is better.
4. **A prediction.** In hour 1, everyone also predicts the share of all payments done by the end
   of hour 2.

With 55 banks there are 165 payments of $100 and $5,500 of balances, so every bank could pay one
payment from its own money in hour 1.

## Rounds and timing

| Time | Round | What to say before opening |
|---|---|---|
| 3 min | Join and rules | Read the opening script. |
| 4 min | 1. Gross settlement, costly credit | Nothing more. |
| 4 min | 2. Same payments, netted each hour | "Same banks, same payments. Now the central bank nets every hour: you pay only what you owe after subtracting what you're owed." |
| 4 min | 3. Gross, free daylight credit | "Back to paying one payment at a time, but the central bank now lends during the day for free." |
| 5 min | Debrief | |

Give each hour about 30 seconds; the first needs a little longer for the prediction. **Open hour
1**, then **End hour 1**, and so on through **End the last hour**, then **Reveal**.

## Setup

Create the session, open the projector screen on the classroom display, and wait for the joined
count to match the room. Students who join after a round opens play from the next round.

## Opening script

"Each of you runs a bank. You have $100 at the central bank, you owe three other banks $100
each, and three banks owe you $100. Every hour you decide how many payments to send. Waiting
costs you, but if you send more than you have, you borrow from the central bank, and that costs
you too. Before you start, predict how much of the day's payments will be done after two hours."

## What to expect

This has not been run with students. In a demo with 40 simulated banks that mostly sent only
what their balance covered, gross settlement with costly credit finished 48% of payments in hour
1 and 85% by hour 2, at a total cost of $665, while banks with payments waiting held $4,800 of
balances idle after hour 1. Netting finished 97% in hour 1 at a cost of $20, and free daylight
credit finished 98% in hour 1. Students may be bolder or more cautious than the simulated banks;
what matters is that the first round is slower and more expensive than the second.

## Debrief questions

**On screen.** **Begin debrief** puts three things on the projector and on every phone: an *explain* prompt that quotes this round's numbers, a *transfer* question, and a private exit check (one question on the phone; the reasoning and a common mistake appear after the student answers). Give pairs about two minutes for the first two, then a minute for the exit check. Exit-check answers are not recorded, graded, or timed. When you show the next round, the projector also lists what changed from the last round and what stayed fixed, and asks for a prediction before anyone plays. The questions below go deeper.

- Every bank was owed exactly what it owed. Why didn't the money move in round 1?
- What did holding a payment cost you, and what did it cost the bank you owed?
- Compare the class's prediction for hour 2 with what happened. Why were we so far off (or not)?
- Netting needed almost no money. What risk does it add if a bank fails before the end of the
  day? (Settlement finality: a netted payment can be unwound.)
- Why does the Fed offer daylight overdrafts, and why does it charge for them or require
  collateral?

Netting here is not ACH, and it is not risk-free; say so. The game also leaves out payments of
different sizes, queues that release payments automatically, collateral, and a bank failing
mid-day.

## Fallback without the app

Five volunteers stand in a ring, each holding one $100 bill and owing $100 to the next. Ask who
will pay first if nobody wants to be short, then let one pay and watch the bill go around.
