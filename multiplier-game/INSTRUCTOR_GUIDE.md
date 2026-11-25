# Instructor guide: Money Multiplier

**Class:** Thursday, February 4, after 05.5–05.6 (the money multiplier and where it breaks
down). **Book:** Ch. 5 §§8–12. **Time:** about 15 minutes, before the FRED multiplier lab.

## Goal

Students have seen 1/rr in the video. The game makes every student a bank and lets the class
create deposits one loan at a time. In the first round lending pays and the multiplier climbs;
in the second the Fed pays more on reserves than loans earn after losses, and the multiplier
barely moves. Students should leave seeing the multiplier as a description of banks' and borrowers'
choices rather than a law.

## How a round works

1. **The Fed buys bonds.** The sellers deposit $1,000 at every bank, so the monetary base is
   $1,000 times the number of banks ($55,000 with 55 students).
2. **Each step** (five), a bank sees its new deposits and chooses how much to lend, from $0 up to
   new deposits × (1 − the reserve requirement). The rest stays as reserves.
3. **Borrowers spend.** They keep 10% of each loan as cash and spend the rest. The spending is
   deposited half at each of two other banks and becomes their new deposits next step.
4. **The year's profit.** Loans earn the loan rate on those repaid, minus losses; reserves earn
   interest on reserves.

Money is all deposits plus the cash borrowers hold, and the multiplier is money ÷ base.

## Rounds and timing

| Time | Round | What to say before opening |
|---|---|---|
| 2 min | Join and rules | Read the opening script. |
| 5 min | 1. Textbook banking | "Required reserves 10%. Loans pay 6%, and about 1% go bad. Reserves pay nothing." |
| 5 min | 2. Interest on reserves (one change) | "Same banks, same loans. The only change: the Fed now pays 5.4% on reserves, as it did in 2023 and 2024." |
| (5 min) | 3. Interest on reserves and riskier loans (optional) | "Two changes at once: reserves pay 4.5%, and 2% of loans go bad." Use it only if time allows, and point out that two settings changed. |
| 3 min | Debrief | Then go to the FRED lab. |

Round 2 changes only interest on reserves, so the class can attribute the difference to it. The
earlier version of round 2 changed interest on reserves and loan losses together; that is now the
optional round 3, labeled as two changes.

Each step takes 30–40 seconds. **Open step 1**, **End step** four times, **End the last step**,
then **Reveal**. After the reveal the projector also shows where the multiplier was heading if
banks had kept lending at the same rate.

## Setup

Create the session, open the projector screen on the classroom display, and wait for the joined
count to match the room.

## Opening script

"Each of you is a bank. The Fed just bought bonds, and the sellers deposited $1,000 with every
one of you. Each step you decide how much of your new deposits to lend. Whatever you lend gets
spent, and the spending lands as deposits at other banks in the room, so your loans become
somebody else's deposits."

## What to expect

This has not been run with students. With 40 simulated banks, the textbook round lent 92% of
what it could and reached a multiplier of 3.33 after five steps, heading to about 4.3. With
interest on reserves, the simulated banks lent 6% and the multiplier was 1.05; most of the base
sat as reserves. The bots in the live rehearsal produced 3.31 and 1.0. Students will probably
lend less than the bots in round 1, and some will lend in round 2 anyway, which gives you
someone to ask why.

## Debrief questions

**On screen.** **Begin debrief** puts three things on the projector and on every phone: an *explain* prompt that quotes this round's numbers, a *transfer* question, and a private exit check (one question on the phone; the reasoning and a common mistake appear after the student answers). Give pairs about two minutes for the first two, then a minute for the exit check. Exit-check answers are not recorded, graded, or timed. When you show the next round, the projector also lists what changed from the last round and what stayed fixed, and asks for a prediction before anyone plays. The questions below go deeper.

- Why did the multiplier stall in round 2? Who held reserves, and what did they earn?
- Was the multiplier 10 in round 1? What kept it below 1/rr? (Five steps, cash leakage, and
  banks that held back.)
- Is the multiplier a law or a description of choices?
- Connect to FRED: about 9 before 2008, 2.8 in 2014, about 4.3 now, and to 05.6 on interest on
  reserves.

## Fallback without the app

On the board, start with $1,000 of deposits, lend 90%, and redeposit for three rows by hand, then
write the geometric sum. Ask what happens to each row if banks lend only half of what they could.
