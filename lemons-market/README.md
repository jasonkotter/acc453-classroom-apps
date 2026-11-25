# Lemons Market

A used-car market with hidden quality. Feb 9, after 06.1–06.4. Runs on the shared toolkit.

## Rules

- Each round the class is split at random into sellers and buyers, paired one to one (with an
  odd number, one student watches). New cars and new partners every round.
- A car is one of five qualities, equally likely: Lemon $2,000, Rough $4,000, Fair $6,000,
  Good $8,000, Peach $10,000 (value to the seller). A buyer values any car at 1.5 times that,
  so every sale would make both better off. Only the seller knows the quality.
- Steps: the buyer offers a price (whole dollars, $0–$20,000); the offer goes to the seller, who
  accepts or rejects. No offer or no answer means no sale.
- Gains: seller, price − value to the seller (less the inspection cost if paid); buyer, value to
  the buyer − price. Gains from trade realized = Σ (buyer value − seller value) over cars sold,
  less inspection costs, as a share of what all cars could have produced.
- **Inspection** (round 4): before offers, a seller may pay $500 to have the car inspected; the
  buyer then sees its quality. Uninspected cars are flagged as such.

## Run (about 20 minutes)

Three hidden-quality rounds, then inspection. Each round: Show round → Open the market →
End offers → Close the market → Reveal (inspection adds "End inspections" first). After each
reveal, point at "average quality sold": buyers use it to set the next round's offers.

**Demo (60 simulated students, 2026-11-24):** average quality sold $4,000 → $3,250 → $2,286 and
gains realized 43% → 13% → 9% over the hidden rounds; with inspection, $6,000 and 80%. Real
students will be noisier; what matters is the direction.

**Debrief.** Which cars stopped selling, and why? What did inspection change, and who paid for
it? Where do you see inspection, warranties, or reputation doing this job (CarFax, certified
pre-owned, credit scores)? How does a bank face the same problem with borrowers (06.3)? The
moral-hazard lending round follows as a separate activity: [Hidden Effort](../hidden-effort/README.md).

**Fallback.** Cards with a quality for sellers; buyers write offers on slips; tally on the board.
