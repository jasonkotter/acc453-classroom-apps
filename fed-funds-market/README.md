# Fed Funds Market

Mar 23, after 11.4–11.5 (the fed funds market, the floor and the ceiling). Runs on the shared toolkit.

## Rules

- Every student is a bank. When the round opens, a set share of banks (35% or 75%) get **extra
  reserves** and the rest a **shortfall**, each $10M–$100M.
- **Lenders** name the lowest rate they will lend at; reserves not lent stay at the Fed and earn
  **IORB**. **Borrowers** name the highest rate they will pay; what they cannot borrow in the
  market they borrow at the **discount window** at the discount rate.
- One uniform-price call market: borrowers sorted by bid, lenders by ask; matched while bid ≥ ask.
  The rate is the middle of the range that clears the market: at least the last matched ask and
  the best bid left out, at most the last matched bid and the best ask left out. Everyone trades
  at that rate. No order = no trade (lender stays at the Fed; borrower goes to the window).
- Gains for one night: lender, amount lent × (market rate − IORB) ÷ 360; borrower, amount
  borrowed × (discount rate − market rate) ÷ 360.

## Treatments

1. **Scarce reserves** (35% lenders; IORB 4.00%, discount rate 4.50%): shortfalls exceed
   extra reserves, so borrowers compete and the rate is set by the marginal borrower, high in the
   corridor; the rest go to the window.
2. **Ample reserves** (75% lenders): extra reserves exceed shortfalls, lenders compete, and the
   rate sinks toward IORB, the floor.
3. **IORB raised** by a quarter point (discount rate too): the rate follows IORB up, with no
   change in the quantity of reserves. That is how the Fed sets rates now.

Demo (40 simulated banks): unit checks put the scarce rate between the marginal bids and the ample
rate between the marginal asks; in the treatments the rate was 4.32% scarce, 4.07% ample, and
4.355% after the raise.

## Run (about 15 minutes)

Show round → Open orders → Close orders → Reveal, three times. The reveal shows the lenders'
and borrowers' orders as step curves with IORB, the discount rate, and the market rate.

**Debrief.** Why did the rate sit near the ceiling when reserves were scarce and near the floor
when they were ample? With ample reserves, what moved the rate: the quantity of reserves or IORB?
Why would a lender ever lend below IORB? (Non-banks that cannot earn IORB; 11.5's ON RRP.)

**Fallback.** Cards with reserve positions; collect rates on slips; sort them on the board.
