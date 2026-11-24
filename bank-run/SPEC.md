# Bank Run — classroom specification

Scheduled for Thursday, March 4 (after video 09.6). Decisions made with Jason on 2026-11-12: one app that runs as a local demo now and on phones once Supabase is configured; in the insurance round every deposit is fully covered. Revised 2026-11-13 at Jason's direction to sharpen the teaching point: some depositors need cash, the round unfolds in withdrawal windows with a public count, every depositor guesses before choosing, one bank is replayed before any policy changes, and the results lead with what the run cost.

## Purpose

Show that a bank run is a coordination problem driven by what depositors believe about each other. Every student has the same deposit in the same sound bank. A few need their money today; the rest decide whether to hold or withdraw as they watch the count of withdrawals rise. The class replays the same bank, then replays it with deposit insurance, with a lender of last resort, and with bad loans, and compares the results.

## The bank

Each depositor has $100 in the bank. With *n* depositors the bank owes $100 × *n* and holds:

- **Cash reserves**: 30% of deposits.
- **Loans**: the other 70%. Good loans are repaid later with 2% interest. If sold today they bring only 50 cents on the dollar. A set share may be bad (0% except in the bad-loans round); bad loans are never repaid.

The bank has no equity. If only the depositors who need cash withdraw, the bank pays everyone else $101 with a little left over.

## How a round is played

1. **Cash needs.** When the round opens, 20% of the depositors (rounded to a whole number) are picked at random and told privately that they need cash today. They are withdrawn in window 1 and have no choice to make. The class is told how many there are, not who.
2. **Guess.** During window 1, each depositor taps a guess, in steps of 10%, for the share of the class that will have withdrawn by the end of the round. A depositor who does not need cash must guess before the Withdraw button appears. Guesses close when window 1 ends, so they are recorded before anyone has seen a count.
3. **Windows.** There are three withdrawal windows. In each, a depositor who is holding may withdraw. A withdrawal can be undone until its window ends and is final after that. Doing nothing counts as holding. When the instructor ends a window, the number of withdrawals so far is published to every screen.
4. **Reveal.** The last window's count is shown with the results.

A depositor who joins after a round has opened plays from the next round.

## The published payout rule

The bank pays each window in turn. Within a window everyone is treated alike, so tapping faster never helps.

1. **Paying withdrawals.** The bank pays $100 per withdrawal, using money in this order:
   1. cash reserves;
   2. if the lender of last resort is on, a loan from the central bank, secured dollar for dollar by the bank's good loans;
   3. forced sales of loans at the round's sale price.
2. **While the bank can pay,** every withdrawer receives $100, whichever window they left in.
3. **If a window asks for more than the bank can raise,** the bank closes in that window. Earlier windows have already been paid in full. The depositors in that window split what is left equally. Everyone still holding receives nothing from the bank, and no further withdrawals are taken.
4. **Later (bank still open).** The loans the bank kept are repaid with interest. The central bank is repaid first, at the same 2% the loans earn. Depositors who held then receive up to $101 each. If there is not enough, they split what there is equally. Anything left over belongs to the bank's owners.
5. **Deposit insurance (when on)** tops every depositor up to the insured amount ($100 by default), whether they held or withdrew. Insurance covers the deposit, not the $1 of interest. The insurer's payment is outside money and is reported separately from the bank's assets, as is the central bank's loan.

Each round ends in one of three outcomes, shown with a symbol and words (never color alone):

- **✔ The bank survived.** Withdrawals were paid and holders receive $101.
- **▲ The bank got through today, but holders take a loss.** Withdrawals were paid, but forced sales or bad loans left too little for the holders.
- **✖ The bank ran out of money and closed.**

## Worked example

Thirty depositors. The bank holds $900 in cash and $2,100 in loans. Six depositors need cash.

- **No run.** Only the six withdraw. Cash pays them, and the bank has $300 of cash and $2,142 of loan repayments for 24 holders who are owed $2,424. Every holder receives $101. The bank pays its depositors $3,024 in total.
- **Six more leave in window 2.** Twelve have asked for $1,200. Cash covers $900; the bank sells $600 of loans for the other $300 and loses $300 doing it. All twelve receive $100. The bank keeps $1,500 of loans, which repay $1,530, and the 18 holders receive **$85 each**. Outcome ▲. The bank pays its depositors $2,730, so the run destroyed $294.
- **Twelve more leave in window 3.** Twenty-four have asked for $2,400, but cash plus every loan sold at half price is only $1,950. The bank closes in window 3. Windows 1 and 2 were paid $100 each ($1,200); the twelve in window 3 split the remaining $750, **$62.50 each**; the six holders receive $0. Outcome ✖.

The limits for this bank at 30 depositors: holders are whole up to 9 withdrawals, and the bank closes beyond 19. `tests.html` checks these numbers and the rest of the rule.

## Treatments

The instructor screen lists the presets in order. Every number can be edited before the round is shown. **Show next round** replays the last treatment unless another is chosen; the plan is to play the first one two or three times.

| # | Preset | What changes from the bank above |
|---|---|---|
| 1 | The bank | nothing |
| 2 | Deposit insurance | every deposit insured up to $100 |
| 3 | Lender of last resort | the central bank lends against good loans |
| 4 | Bad loans | 30% of the loans will never be repaid |
| 5 | Video 09.6 grid (optional) | 50% cash, no buyer for loans, nobody needs cash, one simultaneous choice |

Rounds are independent: every depositor starts each round with $100, and a new random set needs cash. With full insurance, holding never pays less than withdrawing. With the backstop, a bank whose loans are good survives a run of any size without selling a loan. In the bad-loans round holders take a loss even if only the depositors who need cash withdraw (about $75 each at 30 depositors), and turning the backstop on does not change that, because the central bank lends only against what the loans are really worth.

Preset 5 is the two-depositor grid from the video at class size: $101 if everyone holds, $100 for a withdrawer the bank can pay, $50 each if everyone withdraws, $0 for a holder when the bank closes. In the video a single withdrawal takes all the cash; at class size that bank closes only when more than half withdraw.

## What the results show

The reveal leads with the cost of the run, measured against the same bank when only the depositors who needed cash withdraw:

- whether the bank was sound to begin with;
- **dollars lost to the run**: how much less the bank paid its depositors in total;
- a hindsight line: whether anyone would change their choice (holders who lost, depositors who left for no reason and gave up $1, or nobody);
- the round window by window: who left, what the bank had to do to pay them, and what each window received;
- **what depositors expected**: the average guess of those who held against those who ran (depositors who needed cash are left out), the share who actually withdrew, and the distribution of guesses;
- where the withdrawal money came from, outside money, the payout at every size of run, and a comparison of all rounds.

## Screens

- **Student phone.** Join with a display name (and the session code when live). In a round: whether you need cash, the guess, a Withdraw button with an undo until the window ends, and the count so far. After the reveal: own payout, the bank's outcome, own guess against the actual share, and a running total. No leaderboard.
- **Instructor.** Choose a treatment, show it, open withdrawals, end each window, reveal, begin the debrief, then replay or show the next treatment. Counts of depositors, guesses received, and withdrawals published so far. CSV export.
- **Projector.** Join instructions in the lobby; the rules while a round is being shown; during a round, the count so far on a meter marked with how many need cash, where holders start to lose, and where the bank closes; then the results above. No names, no instructor controls.

Round sequence, shared with the other classroom apps: lobby → instructions → withdrawals open (windows 1 to 3) → closed → results revealed → debrief.

## Privacy and authority

Only a display name is collected. Whether a student needs cash, when they withdrew, and what they guessed are sent only to that student. The class sees the number of withdrawals in each window once it has ended, and the summary of guesses after the reveal. The export, which pairs names with choices and guesses, is available only to the instructor. In live mode the server enforces this (see `supabase/schema.sql`): browsers cannot read the tables, withdrawals are accepted only while the round is open, each window's count is fixed when it ends, and instructor actions need a secret held by the browser that created the session. The server does not work out when the bank has run out of money; every screen computes that from the published counts and stops offering withdrawals.

## What is not modeled

There is one bank, one size of deposit, and at most one withdrawal per depositor per round. The rule leaves out bank equity, contagion between banks, the order of arrival within a window, deposits above the insurance limit (the SVB case, which the debrief covers in words), and any penalty rate or haircut on central bank loans. The number who need cash is announced, so the class can tell exactly how many withdrawals were unneeded; real depositors cannot. Simulated depositors in the local demo follow a simple rule and are not a forecast of what students will do.
