# Barter Market — classroom specification

Written 2026-11-24 for the first class (Thu Jan 7, with 01.1). Runs on the shared toolkit;
trades are executed on the server by `cls_trade` in `../_shared/schema.sql` (and by `local.js`
in the demo).

## Purpose

Make the double coincidence of wants visible. In a barter round most students cannot find a
trading partner in time; in a money round almost everyone can. Watch for students who accept a
good they do not want, to trade it on: that is the first step toward commodity money.

## Setup when a round opens

- Kinds of goods: 8 by default (bread, fish, wool, salt, eggs, milk, wood, pots; up to 10).
- Each student holds one good and privately wants a different one. Goods are dealt round-robin
  over a shuffled roster, so each good is held by about the same number of students; wants are a
  shuffle of the same goods, so every good is wanted exactly as often as it is held (everyone
  could, in principle, finish). No one wants what they hold.
- Each student has a three-character trading tag (e.g., KM4), shown large on their phone.
- Money round: everyone also gets one token. A new deal of goods and wants each round.

## Trading

- A student makes one offer at a time: a partner's tag and the terms. A new offer replaces the
  old one; it can be withdrawn.
  - **Swap** (both rounds): my good X for your good Y.
  - **Sell** (money round): my good X for one of your tokens.
  - **Buy** (money round): one of my tokens for your good Y.
- The partner sees the offer on their phone and taps Accept. The server checks that both still
  have what the offer names, then moves the goods and tokens in one step. Offers that can no
  longer be filled are dropped.
- A student who holds the good they want consumes it and is **done** (the time is recorded).
  Done students may keep trading leftover goods and tokens to help others.
- Accepting a good you do not want is allowed.
- The round has a timer (3 minutes by default) shown on every screen. The instructor closes
  trading; no trades are accepted after that.

## What the screens show

- **Student:** tag, timer, what you have, what you want, tokens; offers to you with Accept; the
  offer form; your current offer with Withdraw.
- **Projector:** while open, the timer, students done, and a live line of the share done over
  time. After the reveal: share done, trades, trades per student done, and students holding a
  good they took to trade on; then both rounds compared in a table and on one chart.
- **Instructor:** the round controls, the count done, the timer.

## Simulated students (demo and rehearsal)

Each tick a simulated student "hears" five other simulated students at random. It accepts any
offer that gets it what it wants, sometimes (15%) takes an unwanted good in a swap, offers a swap
when it hears a double coincidence, and in the money round buys its want with a token and sells
spare goods. In a 40-student rehearsal on 2026-11-24, barter finished 30% (12 students, 6 trades)
and money 93% (37 trades) in under a minute. Real students search more slowly; the contrast is
what matters.

## Debrief

Why was barter slow? (You needed someone who had what you wanted and wanted what you had.) Did
anyone take a good they did not want? Which good would you take, and why (durable, divisible,
widely wanted)? What did the token change? Connect to the functions of money in 01.2.
