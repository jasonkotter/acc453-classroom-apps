# Class Check (the question engine)

Short question sets run as peer instruction, on the shared classroom toolkit (`../_shared/`).
Question sets are in [sets.js](sets.js); adding a set needs no code.

| Set | Class day | Questions |
|---|---|---|
| Find the Accounting Error: loans and payments | Feb 2 | 5 (wrong line, correction, a payment, M1, the base) |
| Find the Accounting Error: the Fed buys bonds | Mar 18 | 4 (purchase, the base, a sale, the discount window) |
| Guess the Release | Jan 21 | 4 numbers; you type the actual at each reveal |

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

## Fallback without the app

Show the question on a slide, take a show of hands (or A–D cards), discuss, show hands again,
then the answer slide.
