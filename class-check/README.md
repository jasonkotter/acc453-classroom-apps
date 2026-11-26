# Class Check (the question engine)

Short question sets run as peer instruction, on the shared classroom toolkit (`../_shared/`).
Question sets are in [sets.js](sets.js) and [sets-recession.js](sets-recession.js) (generated); adding a set needs no code.

| Set | Class day | Questions |
|---|---|---|
| Find the Accounting Error: loans and payments | Feb 2 | 5 (wrong line, correction, a payment, M1, the base) |
| Loss Ledger: provisions, charge-offs, and the allowance | Feb 11 | 5 (provision, charge-off, recovery, reading the reserve ratio, what evidence next); a made-up bank, not NYCB |
| Find the Accounting Error: the Fed buys bonds | Mar 18 | 4 (purchase, the base, a sale, the discount window) |
| Guess the Release | Jan 21 | 4 numbers; you type the actual at each reveal |
| Which Curve Shifts? | Feb 25 | 6 one-force scenarios in the Ch. 8 bond-market model |
| Recession Call | Mar 16 | 6 mystery dates (1995–2023): term and credit spreads for the prior 3 years; probability of a recession within 12 months, Brier-scored. Built from FRED by `build_recession_call.py` into `sets-recession.js` |
| Who Wins From Inflation? | Apr 13 | 7 holders under 5 points of unexpected inflation: better off, worse off, or protected |
| Retrieval: Ch. 1–4, Ch. 5–7, Ch. 8–9 | Jan 28, Feb 18, Mar 11 | 2 mixed questions each, in the class before each exam window; students write how sure they were on paper after the first vote |
| Retrieval transfer: Ch. 1–4, Ch. 5–7, Ch. 8–9 | Feb 2, Feb 23, Mar 16 | 1 new question on the last retrieval set, at the start of class, no revote |
| Retrieval: course synthesis (optional) | Apr 13 | 2 (the real rate; a peg under attack) |
| Capital layers (optional) | Mar 11 | 1 (CET1, AT1, and Tier 2 after a loss), after the Repair the Capital Ratio app |
| Shock Hearing: same inflation, different shock | Mar 30 | 5 on two made-up economies (excess demand, a supply shock): the mechanism, a rate increase, discriminating evidence, the real rate, the reconsideration trigger; then an unscored paper vote |

## How a question runs

1. **Vote.** Everyone answers on their phone; the projector shows the count.
2. **Show the split; revote.** The projector shows how the class split, without the answer.
   Neighbors argue for a minute, then everyone answers again. ("Reveal the answer now" skips this.)
3. **Reveal the answer.** The projector shows first and second votes per option, the right answer,
   why it is right, why the most popular wrong answer is wrong, and the corrected T-accounts.
4. **Next question**, and at the end **End the set → Reveal results**: first-vote and final-vote
   share right per question. Each phone shows that student's score. Nothing is graded.

The answer to the current question shows on the instructor screen only. For number questions
with no stored answer (Guess the Release), the instructor screen has an "Actual value" box; the
reveal refuses to run until it is filled.

## Rules for content

- Write fresh questions. Never copy quiz or exam questions or keys into `sets.js` (D6): it is
  public JavaScript, and a curious student can read it.
- In "which line is wrong" questions, give T-account lines an `opt` letter matching an option;
  the wrong line is struck through at the reveal, and `fixed` shows the correct entries.
- Every option gets a `why`, written for the student who chose it.
- A T-account's `right` sets the right-hand heading (default "Liabilities"; use "Liabilities and
  equity" when equity appears).
- Measure each reveal on the projector at 1280×720 with a revote. The reveal adds both vote
  bars, the `why` lines, the explanation, and `fixed`, so keep explanations to a line or two.
  Only the most popular wrong answer shows its `why`, so measure with the longest one in that slot.

## Fallback without the app

Show the question on a slide, take a show of hands (or A–D cards), discuss, show hands again,
then the answer slide.

## Probability questions

Students give a probability from 0 to 100%. At the reveal the projector shows what happened, the
distribution of answers (bars on the right side of 50% in teal), the class average, and the
class Brier score: the mean of (p − outcome)², where the outcome is 1 or 0. Zero is perfect;
always answering 50% scores 0.25. The results table at the end of the set gives each question's
Brier score.
