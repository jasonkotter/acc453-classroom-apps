# Money Multiplier Lab

Phone-friendly, self-contained classroom activity for Chapter 5. Open `index.html` in a
browser, or host this folder as static files and share its link with students. It needs no
packages, account, or network access after it is opened.

## Teaching flow

1. **Predict:** Students choose whether $100,000 in new reserves supports $100,000, $500,000,
   or $1,000,000 in deposits. Ask them to hold onto their answer before revealing the chain.
2. **Build the chain:** Adjust the starting reserves and reserve ratio. The bars show ten
   rounds, while the geometric-series formula gives the idealized limit.
3. **Check the books:** Connect each loan to a deposit liability and trace required reserves
   and the next loan. Emphasize that reserves stay in the banking system.
4. **Change assumptions:** Increase excess reserves or cash held by the public. Compare the
   generalized multiplier to the simple `1 / rr` result.
5. **Debrief:** Use the prompts to distinguish the accounting mechanism, the simplifying
   assumptions, and a theoretical limit from a forecast of real-world bank lending.

## Model

The first view uses a $100,000 reserve injection and a 10% reserve ratio. Under the idealized
assumptions, deposit growth is $100,000 + $90,000 + $81,000 + … = $1,000,000. The advanced
view uses `m = (1 + c) / (rr + e + c)`, where `c` is currency held by the public per dollar of
deposits and `e` is excess reserves per dollar of deposits. Rates are entered as percentages.

This is an individual activity on each device. It does not synchronize student responses or
provide an instructor dashboard, join code, or class results; those remain part of the planned
multiplayer toolkit in Workstream D.
