# Instructor guide: Fed Funds Market

**Class:** Tuesday, March 23, after 11.4–11.5 (the fed funds market, the floor and the ceiling).
**Book:** Ch. 11 §§7–16. **Time:** about 15 minutes, before the September 2019 repo case.

## Goal

The video shows the corridor as a diagram. The game makes every student a bank with too many or
too few reserves for the night and lets the class find the rate. When reserves are scarce,
borrowers compete and the rate rises toward the discount rate; when they are ample, lenders
compete and it sinks to interest on reserves. Raising IORB moves the rate with no change in the
quantity of reserves. Students should leave able to explain why the Fed now sets rates by moving
the floor rather than the supply of reserves.

## How a round works

1. **Every student is a bank.** When the round opens, a set share of banks get **extra
   reserves** and the rest a **shortfall**, each between $10 million and $100 million.
2. **Lenders** name the lowest rate they will lend at; reserves they do not lend stay at the Fed
   and earn **IORB**. **Borrowers** name the highest rate they will pay; what they cannot borrow
   in the market they borrow at the **discount window**.
3. **One market price.** Borrowers are sorted by bid and lenders by ask, and they are matched
   while the bid is at least the ask. Everyone trades at the single rate that clears the market.
   No order means no trade: a lender stays at the Fed, a borrower goes to the window.
4. **Gains for one night:** a lender earns the amount lent × (market rate − IORB) ÷ 360; a
   borrower saves the amount borrowed × (discount rate − market rate) ÷ 360.

## Rounds and timing

| Time | Round | What to say before opening |
|---|---|---|
| 2 min | Join and rules | Read the opening script. |
| 4 min | 1. Scarce reserves (35% lenders; IORB 4.00%, discount rate 4.50%) | Nothing more. |
| 3 min | 2. Ample reserves (75% lenders) | "The Fed has bought a lot of bonds. Most of you now have more reserves than you need." |
| 3 min | 3. IORB raised a quarter point (discount rate too) | "The Fed raised interest on reserves to 4.25% and the discount rate to 4.75%. It did not change the quantity of reserves." |
| 3 min | Debrief | |

Each round: **Open orders**, **Close orders**, **Reveal**. Give orders about a minute.

## Setup

Create the session, open the projector screen on the classroom display, and wait for the joined
count to match the room.

## Opening script

"Each of you is a bank, and tonight you either have extra reserves or you're short. If you have
extra, you can lend it to another bank or leave it at the Fed, which pays you interest on
reserves. If you're short, you can borrow from another bank or from the Fed's discount window,
which costs more. Name your rate. Everyone trades at one price."

## Reading the results screen

The reveal draws the lenders' and borrowers' orders as step curves, with IORB, the discount
rate, and the market rate marked. Point to where the curves cross and to which side of the
corridor the rate sits.

## What to expect

This has not been run with students. With 40 simulated banks, the rate was 4.32% with scarce
reserves, 4.07% with ample reserves, and 4.355% after the IORB raise; the live rehearsal with 12
bots gave 4.37%, 4.13%, and 4.36%. Some students will lend below IORB or borrow above the
discount rate, which loses money with certainty and is worth a gentle question.

## Debrief questions

**On screen.** **Begin debrief** puts three things on the projector and on every phone: an *explain* prompt that quotes this round's numbers, a *transfer* question, and a private exit check (one question on the phone; the reasoning and a common mistake appear after the student answers). Give pairs about two minutes for the first two, then a minute for the exit check. Exit-check answers are not recorded, graded, or timed. When you show the next round, the projector also lists what changed from the last round and what stayed fixed, and asks for a prediction before anyone plays. The questions below go deeper.

- Why did the rate sit near the ceiling when reserves were scarce and near the floor when they
  were ample?
- With ample reserves, what moved the rate: the quantity of reserves or IORB?
- Why would anyone lend below IORB? (Lenders that cannot earn IORB, such as the GSEs; 11.5's
  overnight reverse repo facility.)
- September 2019: what does the game say about what happens when reserves become scarce again?

## Fallback without the app

Hand out cards with reserve positions; collect rates on slips; sort the bids and asks on the board
and find where they cross.
