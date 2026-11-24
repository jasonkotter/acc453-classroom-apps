# Money Multiplier (classroom game)

Every student is a bank. Feb 4, after 05.5–05.6. Runs on the shared toolkit (`../_shared/`).
The older single-player explainer is in `../money-multiplier/`.

## Rules

- The Fed buys bonds; the sellers deposit **$1,000 at every bank**. The monetary base is
  $1,000 × the number of banks.
- Each step (5 by default), every bank sees its **new deposits** and chooses how much to lend:
  from $0 to new deposits × (1 − required reserve ratio). The rest stays as reserves. No answer
  means it all stays as reserves. The server rejects loans above the limit.
- Borrowers keep a share of each loan as cash (10% by default) and spend the rest. The spending
  is deposited half at each of two other banks, picked at random (seeded, so it is reproducible),
  and becomes those banks' new deposits next step.
- Money = all deposits created + cash held by borrowers. The multiplier is money ÷ base.
- Profit for the year: loans earn the loan rate on the loans that are repaid, minus the ones
  that are not (net = rate × (1 − loss) − loss); reserves earn interest on reserves.
- After the reveal the projector also shows where the multiplier was heading. If banks keep
  lending a share λ of what they could, each step's new deposits are g = λ(1 − rr)(1 − cash share)
  times the last, so money ÷ base → (1 + λ(1 − rr)·cash share) / (1 − g). The textbook 1/rr is
  the case λ = 1 and no cash.

## Treatments

1. **Textbook banking:** rr 10%, cash 10%, loans 6% with 1% losses (about 4.9% net), reserves 0%.
   Lending pays. Demo (40 simulated banks): lent 92%, multiplier 3.33 after five steps,
   heading to 4.3.
2. **Interest on reserves, riskier loans:** reserves pay 4.5%; loans 6% with 2% losses (about
   3.9% net). Holding reserves pays more. Demo: lent 6%, multiplier 1.05, extra reserves $35,585
   of $40,000.

## Run (about 15 minutes)

Show round → Open step 1 → End step (each step takes 30–40 seconds) → End the last step →
Reveal. Then Show next round for the second treatment.

**Debrief.** Why did the multiplier stall in round 2? Who chose to hold reserves, and why? Is the
multiplier a law or a description of choices? Connect to the FRED multiplier lab (about 9 before
2008, 2.8 in 2014, 4.3 now) and to 05.6.

**Fallback.** On the board: start with $1,000, lend 90%, redeposit; three rows by hand, then the
geometric sum.
