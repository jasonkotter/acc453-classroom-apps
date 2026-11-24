# Instructor guide: Bank Run

**Class:** Thursday, March 4, after students have watched 09.6 (bank runs as a coordination game). **Book:** Ch. 9 §10. **Time:** about 25 minutes with the debrief.

## Goal

Students have seen the two-depositor grid in the video. The game puts them inside a bank with the whole class, where some depositors really do need their money and everyone else has to decide whether the withdrawals on the screen are ordinary or the start of a run. They should leave able to explain why a sound bank can fail, why what a depositor believes about the others matters more than the bank's loans, why deposit insurance changes the incentive to run, and why a lender of last resort helps a bank that is short of cash but not one whose loans are bad.

## How a round works

Every round uses the same bank unless you change it: $30 of cash and $70 of loans for each $100 of deposits, with loans that sell today for only 50 cents on the dollar.

1. **Some depositors need cash.** When the round opens, 20% of the class is picked at random and told privately that they need their money today. Their withdrawal goes in automatically. The bank's cash covers them with room to spare.
2. **Everyone guesses.** Before choosing, each student taps a guess for the share of the class that will have withdrawn by the end of the round.
3. **Three withdrawal windows.** A student who is holding can withdraw in any window. When you end a window, the count so far goes on the projector, next to markers for how many needed cash, where holders start to lose, and where the bank closes. A withdrawal is final once its window ends.
4. **The bank pays each window in turn.** While it can pay, every withdrawer gets $100. If a window asks for more than the bank can raise, the bank closes: that window splits what is left, and everyone still holding gets nothing.

With 30 depositors, 6 need cash, the cash covers 9, and the bank closes if more than 19 withdraw. It takes only four depositors leaving without a reason to start costing the holders money.

## Setup

Open the instructor screen on your laptop and the projector screen in a second window on the classroom display. Check that the projector shows the join instructions. In the local demo, add the simulated depositors first; in live mode, create the session and wait for the joined count to match the room. Students who join after a round has opened play from the next round, so leave a minute for stragglers before the first round.

## Opening script

"Every one of you has $100 in the same bank. If you leave it there, you get $101. If you take it out, you get your $100 today. A few of you are going to need your money today; your phone will tell you, and nobody else will know. The bank has plenty of cash for those people. It does not have enough for everyone. There are three chances to withdraw, and after each one I'll show you how many people have taken their money out. I'm not going to tell you what to do. Before you choose, your phone will ask you to guess how many of your classmates will withdraw."

## Rounds and timing

| Time | Round | What to say before opening |
|---|---|---|
| 3 min | Join and rules | Read the opening script. |
| 4 min | 1. The bank | Nothing more. Let them play. |
| 3 min | 2. The bank again | "Same bank, same rules. A different set of you will need cash." |
| 3 min | 3. The bank, once more (optional) | Play it if rounds 1 and 2 ended differently, or if a run is building. |
| 3 min | 4. Deposit insurance | "Same bank. Now every deposit is insured. Whatever happens, you get at least your $100." |
| 3 min | 5. Lender of last resort | "No insurance. But if the bank runs short of cash, the central bank will lend to it against its good loans." |
| 3 min | 6. Bad loans | "No insurance, no central bank. And some news: 30% of this bank's loans are never going to be repaid." |
| 5 min | Debrief | Use the comparison table and the questions below. |

**Show next round** replays the treatment you just ran unless you pick another one, and the replays are the point of the design. Students need a round or two of history before they have a reason to doubt each other. If time is short, drop round 6 and describe it during the debrief.

In each round, give the first window about 30 seconds (students are also guessing) and the later windows about 15 seconds each. The instructor screen shows how many guesses are in. If the bank runs out of money before the last window, the button changes to **End round**.

## Reading the results screen

The reveal leads with one number: how much less the bank paid its depositors than it would have if only those who needed cash had withdrawn. Under it is a sentence saying whether anyone would change their choice in hindsight. Read both aloud. If nobody ran, the screen says so, and that is worth a minute too: ask what would have had to happen for someone to leave.

The right side shows the round window by window, and then the guesses. Students who ran should, on average, have expected more withdrawals than students who held. If that gap shows up, it is the best evidence in the room that beliefs drove the outcome, because the bank was the same for everyone.

## What to expect

I have not yet run this with students, so treat these as predictions and correct this section after the first class. The first round may well be quiet. When I played the two-person version with candy, the pairs held, and here the bank looks safe until a few people test it. A run is more likely in the second or third play, once someone has seen holders lose money. Published classroom and laboratory versions of this game report the same pattern: runs are uncommon in a single simultaneous round and much more common when some depositors are forced to withdraw and the others can watch. I am recalling that literature from memory and have not rechecked it.

Insurance should bring unneeded withdrawals close to zero, since holding can no longer pay less than withdrawing. With the lender of last resort a run costs the holders nothing, so there is little reason to start one. In the bad-loans round the bank cannot repay everyone even if nobody runs, and getting out early is simply the right call.

None of this is guaranteed. If the class holds together through three plays, that is a result too. The meter still shows how thin the margin was, and you can ask why nobody moved.

## Debrief questions

- Those of you who withdrew without needing to: what did you see, or expect, that made you leave? (Look for answers about other depositors, not about the bank.)
- Look at the guesses. Why did the students who ran expect more withdrawals than the students who held, when they were all looking at the same bank?
- When the count went past the number who needed cash, what did you conclude? Could you tell a depositor who needed money from one who was nervous?
- Who paid for the loans the bank had to sell at half price? Why does that give the next depositor a reason to leave?
- Deposit insurance paid out very little, or nothing at all. Why does a promise that is rarely used change behavior so much? What might it do to the risks a bank is willing to take? (This sets up moral hazard in 09.7.)
- Anything the central bank lends in the lender-of-last-resort round is repaid in full. Would that loan have saved the bank with bad loans? What is the difference between a bank that is illiquid and one that is insolvent?
- Silicon Valley Bank lost more than $40 billion of deposits in a single day in March 2023. Most of its deposits were above the $250,000 insurance limit. Which round is SVB closest to? Students usually see pieces of two rounds: uninsured depositors watching each other leave, and real losses on the balance sheet.

Point out what the game leaves out: there is one bank, everyone has the same deposit, and the count arrives in three tidy steps. Real runs spread across banks and move at the speed of a group text.

## Fallback without the app

Before class, mark one in five slips of paper with a small X. Hand out the slips; a student with an X needs cash and must write W. Everyone else writes H or W, folded. Collect the slips, count the W's, and write the number on the board next to the number of X's. Then ask the students who wrote H whether they want to change to W, by a show of hands with eyes closed, and add those to the count. If the total is more than 30% of the class, the holders lose money; if it is more than about 65%, the bank closes and they get nothing. Repeat once after announcing deposit insurance and compare the two counts.

## The video's grid

The last treatment in the list, **Video 09.6 grid**, is the two-depositor game at class size: half the deposits in cash, no buyer for the loans, nobody needs cash, and one simultaneous choice. It is there if you want to connect the game back to the video's four payoffs ($101, $100, $50, $0). It is not part of the main sequence.

## Local demo note

The simulated depositors each guess how many others will withdraw, starting from the last round's result and then from the count on the screen, and leave when holding looks likely to pay less than the deposit. They make the screens come alive for rehearsal, and they panic easily. They are not evidence about how students behave.
