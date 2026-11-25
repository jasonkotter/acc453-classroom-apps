# Instructor guide: Class Check

**Classes:** six days, one set each (table below). **Time:** about 2 minutes a question with
the revote, 1 minute without; a six-question set takes 10–15 minutes.

## Goal

Class Check runs short question sets as peer instruction. Everyone commits to an answer, sees how
the room split, argues with a neighbor, and answers again. The split is the point: a student who
picked the popular wrong answer learns that half the room made the same mistake, and the
neighbor who talks them out of it usually explains it better than a slide would. Nothing is
graded, and each phone shows only that student's own score.

| Set | Class | Questions | Revote |
|---|---|---|---|
| Guess the Release | Jan 21 | 4 numbers; you type each actual value at the reveal | no |
| Find the Accounting Error: loans and payments | Feb 2 | 5 T-account questions | yes |
| Which Curve Shifts? | Feb 25 | 6 one-force scenarios in the Ch. 8 bond-market model | yes |
| Recession Call | Mar 16 | 6 mystery dates, 1995–2023; probability of a recession within 12 months | no |
| Find the Accounting Error: the Fed buys bonds | Mar 18 | 4 open-market and discount-window questions | yes |
| Be the FOMC | Mar 25 | 6 real meetings, June 2021–July 2023; set the top of the target range | no |
| Who Wins From Inflation? | Apr 13 | 7 holders under 5 points of unexpected inflation | yes |

## How a question runs

1. **Vote.** Students answer on their phones; the projector counts answers but shows no split.
2. **Show the split; revote** (sets with a revote). The projector shows how the class split,
   without the answer. Give neighbors about a minute, then everyone answers again. **Reveal the
   answer now** skips the revote when the room is already sure.
3. **Reveal the answer.** The projector shows first and second votes, the right answer, why it is
   right, and why the most popular wrong answer is wrong; accounting questions also show the
   corrected T-accounts.
4. **Next question**, and after the last one **End the set**, then **Reveal results**: the share
   right on the first and final votes for each question.

The current question's answer shows on the instructor screen only.

## Setup

Create the session from the instructor screen (or several sessions at once from
`_shared/sessions.html`), choose the day's set under **Treatment**, open the projector screen on
the classroom display, and wait for the joined count to match the room. Students who join after
**Start the questions** play from the next set.

## Opening script

"These questions are not graded. Answer on your own first. If the class splits, I'll show you the
split but not the answer, and you'll have a minute to convince the person next to you. Then
everyone answers again."

## Notes by set

**Guess the Release (Jan 21).** Students guess a number before the release is shown. The
instructor screen has an **Actual value** box, and the reveal will not run until it is filled, so
have the four actual values open in another tab. The prompts' release dates still need to be
checked against the Jan 21 calendar before class.

**Find the Accounting Error (Feb 2, Mar 18).** Each question shows a T-account with one wrong
line; the reveal strikes it through and shows the corrected entries. Two mistakes to watch for
are recording a loan without the deposit it creates and treating a Fed purchase as a change in
M1 rather than in the base. Pause on any question where the revote does not move the room toward the
right answer.

**Which Curve Shifts? (Feb 25).** One force per scenario. Students who get the curve right but
the direction of the price wrong are the ones to call on, because they are close.

**Recession Call (Mar 16).** Students see the term spread and a credit spread for the three
years before a mystery date and give the probability of a recession within 12 months. The reveal
names the date, says what happened, and reports the class's Brier score: the average of
(probability − outcome)², where the outcome is 1 or 0. Zero is perfect, and always answering 50%
scores 0.25, which makes a good benchmark to say aloud. Expect the 2019 and 2023 inversions to
fool the room; that is the lesson about false alarms.

**Be the FOMC (Mar 25).** Each question is a real meeting with the core PCE inflation and
unemployment published by that date. Students, or teams sharing one phone, set the top of the
target range. The reveal gives the FOMC's actual decision and what the book's Taylor rule
recommended with the same data; in 2021–22 the rule was far above the actual rate. Ask the room
to explain the gap before you do.

**Who Wins From Inflation? (Apr 13).** Seven holders, each better off, worse off, or protected
under 5 points of unexpected inflation. The split on fixed-rate borrowers and on TIPS holders is
usually the useful one.

## What to expect

These sets have not yet been run with students. The live rehearsal with simulated students
showed that every question type works, including probability and number answers, but simulated
students answer at random and say nothing about how hard the questions are. Expect the first
vote on a good question to land between 30% and 70% right; a question that 90% get right on the
first vote can be skipped next time, and one that stays below 30% after the revote needs a
sentence of explanation before moving on.

## Debrief

The results table at the end shows the first and final share right for each question. Point to
the question with the largest gain and ask someone who changed their answer what convinced them.
For Recession Call, compare the class's Brier score with 0.25. For Be the FOMC, ask whether the
class or the FOMC was closer to the Taylor rule, and why that is not the same as being right.

Added 2026-11-25 after the teaching review:

- The table now has a **matched** column: among students who answered both the vote and the
  revote, the share right first and final, and how many switched to the right answer or away
  from it. Use it rather than the raw first and final shares, which can move just because
  different students answered each time.
- After a revote, the answer screen asks pairs what changed their mind, or what would have.
- **Guess the Release.** Besides the actual value, you can type a benchmark (last month's value
  or the consensus forecast) and a line naming the release, reference period, and source. The
  reveal then shows how far the class median and the benchmark each missed, in place of the
  three closest guesses, plus a note on revisions.
- **Recession Call** and **Be the FOMC** each show a short note at the reveal: one outcome cannot
  settle whether a probability was right; the FOMC's decision and the Taylor rule are benchmarks
  to argue with, with the rule's inputs stated. The notes live in `build_recession_call.py` and
  `build_fomc.py` and were also added by hand to the generated set files, so rebuilding keeps them.

## Fallback without the app

Show each question on a slide, take a show of hands or A–D cards, let neighbors talk, show hands
again, then show the answer slide.
