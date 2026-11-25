# Loan Officer

Feb 18, after 07.4–07.5 (the four credit-risk ratios; Ch. 7 Sections 6 and 9). Runs on the shared
toolkit. Redesigned on 2026-11-24 to pass the classroom-app test: in the brainstorm's version each
student forecast losses alone, and the result did not depend on classmates. Here the default rate
comes from the whole class's lending.

## Rules

- Every student is a bank: $100 of one-year loans, $90 of deposits at 2%, and $10 of equity.
- Each year (4 by default) a bank chooses the **share of its loans made to risky borrowers**
  (10% interest) instead of safe ones (5%, 1% default), and sets its **allowance**: the share of
  its loans it expects to charge off that year. A default loses 60% of the loan.
- The published rule for the risky default rate:
  `5% + 4 × (last year's class risky share − 30%)/10 − 1 × (this year's class risky share − 30%)/10`,
  never below 1%. Easy credit this year lets weak borrowers refinance, so fewer default now;
  last year's easy credit shows up as defaults this year.
- After the last year every surviving bank's loans roll over once more, unchanged, so the last
  year's lending is tested too. A bank whose equity falls below zero fails and stops lending.
- No answer = last year's choices (year 1: 30% risky, 3% allowance).
- Each year's result on the phone shows the bank's four Ch. 7 ratios: delinquency (non-current
  ÷ loans), net charge-offs ÷ loans, loan loss reserve (allowance ÷ loans), and NPL coverage
  (allowance ÷ non-current). Defaulted loans count as non-current at year end and are charged
  off net of the 40% recovery.

**Why it is a dilemma.** With the class at 30% risky, a risky loan earns 7% after losses against
4.4% for a safe one, so each bank alone does better by lending more. If every bank lends 100%
risky, year 1 is the best year of the game (1% default rate) and every bank fails in year 4.
The share that leaves the class with the most equity, if every bank chose it every year, is
20% ($26.92 each). The reveal reports that benchmark.

## Treatments

1. **Lending moves the economy** (the rule above).
2. **A regulator caps risky lending at 40%** (same rule).
3. **A recession arrives in year 3** (+6 points on the risky default rate, announced when year 3
   opens).

Settings also allow other caps, effects, years, and starting equity.

Demo (40 simulated banks): the class averaged 59.8% risky with a peak default rate of 17.4% and
an average final equity of $18.69; the recession round peaked at 23.9% ($17.60); under the 40% cap
the class averaged 35.9%, the default rate peaked at 7.5%, and equity was $26.32. No simulated
bank failed; a room that chases yield harder than the simulated banks will produce failures.

## Run (about 15 minutes)

Show round → Open year 1 → End year 1 … → End the last year → Reveal. The projector shows the
class risky share and the risky default rate by year, and a table of the class's average
allowance against its average net charge-offs.

**Debrief.** Why were losses lowest in the year lending was loosest? What did the low charge-off
ratio in a boom year tell you about the loans being made (Section 9: "low losses late in an
expansion prove less")? Whose behavior drove your bank's losses: yours or the class's? Did the
class's allowances anticipate the bust, and what would CECL require? Who gains and who loses
from the cap?

**Model caveat.** The rule is a disclosed teaching rule, not an estimate. The evidence that
credit booms are followed by higher losses is real; the coefficients are not.

**Fallback.** Students write a risky share and an allowance on slips each year; a spreadsheet
applies the rule.
