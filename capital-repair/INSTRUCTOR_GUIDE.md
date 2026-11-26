# Instructor guide: Repair the Capital Ratio

**Class:** Thursday, March 11, after 09.10 (capital regulation), the last class before Group Exam
2. **Book:** Ch. 9 §§15–17. **Time:** about 10–12 minutes for one round, in place of selected
capital-ratio problems. If the AT1 case runs that day, keep only its short loss-waterfall
contrast.

## Goal

Students have just learned to compute a risk-based ratio and a leverage ratio. This activity
asks them to fix a bank that fails both, and then shows what each fix is worth when a loss
arrives. Students should leave able to explain four things: shifting toward assets with lower risk
weights can raise a reported ratio without adding any capital that absorbs losses; the leverage
ratio measures something different and catches that move; shrinking and issuing equity both
repair the ratios but differ in how much lending survives and who owns the bank; and breaching a
ratio, having negative equity, and running short of cash are three different problems.

It is a diagnostic activity, not a game. Nothing a classmate does changes anyone's bank, and the
only thing scored is whether a student's predictions were right. The class's split of repairs is
what you discuss.

## The bank and the supplied rules

| Assets | | Liabilities and equity | |
|---|---|---|---|
| Cash | 10 | Deposits | 96 |
| Loans | 80 | Common equity | 4 |
| Treasuries | 10 | | |
| **Total** | **100** | **Total** | **100** |

For this exercise only, loans carry a 100% risk weight and cash and Treasuries 0%, so RWA is 80.
The floors are 8% of RWA and 5% of total assets, and a ratio exactly at a floor passes. The bank
starts at 4 ÷ 80 = 5.0% and 4 ÷ 100 = 4.0%, failing both. Say plainly that these are teaching
rules, not current regulation, and that a zero credit weight does not make Treasuries free of
interest-rate risk.

## How a round works

1. **Step 1: repair and predict (2 minutes).** Each student picks one of four repairs and predicts
   which floors the repaired bank still fails.

   | Repair | Assets / deposits / equity | Equity ÷ RWA | Equity ÷ assets | Loans kept |
   |---|---|---|---|---|
   | A. Sell 30 of loans at par; buy 30 of Treasuries | 100 / 96 / 4 | 8.0% ✓ | 4.0% ✗ | 50 |
   | B. Sell 40 of loans at par; repay 40 of deposits | 60 / 56 / 4 | 10.0% ✓ | 6.7% ✓ | 40 |
   | C. Issue 3 of common equity for cash; redeem 3 of deposits | 100 / 93 / 7 | 8.75% ✓ | 7.0% ✓ | 80 |
   | D. Borrow 3 from the central bank | 103 / 96 / 4, plus 3 owed to the central bank | 5.0% ✗ | 3.9% ✗ | 80 |

2. **End step 1** puts the four repaired ledgers on the projector side by side, with both ratios
   drawn against their floors, how many students chose each repair, and how many of them
   predicted right. Spend about 3 minutes here.
3. **Step 2: the loss (2 minutes).** The projector and phones announce a recognized credit loss of
   2% of loans at every bank. Loans and equity fall by the same amount, and cash is unchanged. Each
   student predicts which floors their own bank fails now, and whether its equity is still
   positive.
4. **Reveal.** Each bank after the loss:

   | Repair | Loss | Equity | Equity ÷ RWA | Equity ÷ assets | Cash |
   |---|---|---|---|---|---|
   | A | 1.00 | 3.00 | 6.1% ✗ | 3.0% ✗ | 10 |
   | B | 0.80 | 3.20 | 8.2% ✓ | 5.4% ✓ | 10 |
   | C | 1.60 | 5.40 | 6.9% ✗ | 5.5% ✓ | 10 |
   | D | 1.60 | 2.40 | 3.1% ✗ | 2.4% ✗ | 13 |

A student who picks no repair keeps the starting bank, counted separately on the projector. No
prediction in step 2 is simply not counted.

## Rounds and timing

| Time | Step | What to say |
|---|---|---|
| 1.5 min | Orient | Read the opening script; point to the starting bank and the two floors. |
| 2 min | Step 1 | "Pick the repair you would make, and predict which floors it still fails." |
| 3 min | Four ledgers | Ask a student who chose A how A reached 8%, then ask what the leverage ratio sees. |
| 2 min | Step 2 | "A loss of 2% of loans hits every bank. Your bank: which floors now, and is equity positive?" |
| 2 min | Reveal and transfer | Exit check on phones; debrief questions below. |

Use the *Repair, then a 2% loss* preset. The *6% loss* preset is optional: at 6% every repair
fails a floor and D's equity goes to −0.8, which makes the solvency point but erases the contrast
between repairs. Run it only as a quick second round, after students have predicted what changes.

## Opening script

"Your bank fails both of its capital floors. The regulator wants it fixed, and you have four
choices on your phone. Pick the one you would make, then tell me which floors your bank will still
fail afterward. After that, we'll see what each fix is worth when some loans go bad."

## What to expect

This has not been run with students. A and C will probably be popular: A because it is the cheapest
way to hit 8%, and C because "raise capital" is the textbook answer. D catches students who confuse
liquidity with capital; borrowing adds cash and debt, not equity, so both ratios fall. In the demo,
20 simulated students split about evenly, and about half predicted the step 2 result correctly.

**If most of the room picks A,** stay on the leverage bar: A's equity did not change, and the
leverage ratio is the one measure that notices. **If most pick C,** ask what the old owners gave
up, and whether B would have worked too. **If nobody picks D,** ask why not; mixing up liquidity and
capital is a common mistake.

## Debrief questions

**On screen.** **Begin debrief** puts three things on the projector and on every phone: an *explain* prompt that quotes this round's numbers, a *transfer* question, and a private exit check (one question on the phone; the reasoning and a common mistake appear after the student answers). Give pairs about two minutes for the first two, then a minute for the exit check. Exit-check answers are not recorded, graded, or timed. When you show the next round, the projector also lists what changed from the last round and what stayed fixed, and asks for a prediction before anyone plays. The questions below go deeper.

- How did A reach 8.0% without a dollar of new equity? What did the leverage ratio see that RWA
  missed?
- Why did C, with the largest dollar loss (1.60), keep the most equity (5.40)?
- B and C both pass. What does the economy lose when banks repair by shrinking (40 of lending
  gone), especially if many banks shrink at once? Who gives something up when banks repair by
  issuing equity?
- Why do regulators watch a risk-based ratio and a leverage ratio together (§16)?
- Retained earnings are another way to build equity. Why are they not an instant fix? (The profit
  has to be earned and recognized first.)

Do not score shareholder wealth or dilution. There are no issue prices or valuation model here, so
the only claim to make is that the old owners' percentage falls.

**Exit check:** a new bank with cash 5, loans 60, and Treasuries 35, funded by deposits 95 and
equity 5, passes both floors (8.3% and 5.0%). A loss of 10% of loans (6) hits. It breaches both
floors, and its equity is −1, so it is insolvent on these values. But cash is still 5 and no
payment is due, so nothing here shows a cash shortfall. The common mistakes are treating a ratio
breach, insolvency, and illiquidity as one problem, and thinking strong ratios mean a bank cannot
fail.

**Optional follow-up (2 minutes):** the Class Check set *Capital layers: which one takes the
loss?* One question with CET1 4, AT1 2, and Tier 2 2 against RWA of 80: after a loss of 1.5, CET1
and Tier 1 fail and total capital still passes, because Tier 2 counts but absorbed nothing. In the
first bank, CET1, Tier 1, and total capital are the same number, so this is the only place the
activity practices different numerators. Skip it if the AT1 case runs that day.

## Fallback without the app

The paper kit in [../../pilots/capital-repair/](../../pilots/capital-repair/PILOT_GUIDE.md) shows
the ledgers one at a time on slides, with A–D cards for the choice and the predictions, and runs
the transfer on paper.
