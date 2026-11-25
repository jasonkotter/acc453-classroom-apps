"""Builds sets-recession.js, the Recession Call question set for Class Check (Mar 16, after 10.3).

For six dates it pulls, from FRED, the monthly average 10-year minus 3-month Treasury spread
(T10Y3M) and the Baa corporate minus 10-year Treasury spread (BAA10Y) for the 36 months up to
the date, and NBER recession months (USREC). Market spreads are not revised, so these are the
numbers people saw at the time (as monthly averages). The question: will a recession begin in
the next 12 months? The answer uses NBER business-cycle peaks (the month before USREC turns on).

Run with the mypython interpreter; needs FRED_API_KEY.
  C:/Users/kotterj/AppData/Local/miniconda3/envs/mypython/python.exe classroom/apps/class-check/build_recession_call.py
"""
import json
import math
import os
from datetime import date
from pathlib import Path

import pandas as pd
import requests

HERE = Path(__file__).resolve().parent
KEY = os.environ["FRED_API_KEY"]

# date, the letter students see, and a short note for the reveal
DATES = [
    ("2000-11", "A", "The dot-com bust: the recession began in March 2001, four months later. The curve had inverted that summer and credit spreads were widening."),
    ("1995-06", "B", "No recession: the Fed had raised rates sharply in 1994 and then held, and the economy slowed without falling (a soft landing). The curve stayed positive."),
    ("2019-08", "C", "A recession began in February 2020, six months later, but the cause was the pandemic, which no spread could foresee. Did the curve call it, or get lucky?"),
    ("1998-10", "D", "No recession. Credit spreads jumped in the Russian default and Long-Term Capital Management crisis, the Fed cut three times, and the expansion went on to 2001."),
    ("2023-06", "E", "No recession, despite the deepest inversion since 1981. The curve's best-known false alarm, so far."),
    ("2007-09", "F", "The Great Recession began in December 2007, three months later. The curve had inverted in 2006 and was already back above zero; credit spreads were widening fast."),
]


def get(series):
    r = requests.get("https://api.stlouisfed.org/fred/series/observations", timeout=30, params=dict(
        series_id=series, api_key=KEY, file_type="json", frequency="m", aggregation_method="avg",
        observation_start="1985-01-01"))
    r.raise_for_status()
    d = pd.DataFrame(r.json()["observations"])
    d["value"] = pd.to_numeric(d["value"], errors="coerce")
    return d.set_index(pd.to_datetime(d["date"]))["value"]


term, credit, rec = get("T10Y3M"), get("BAA10Y"), get("USREC")
peaks = [rec.index[i - 1] for i in range(1, len(rec)) if rec.iloc[i] == 1 and rec.iloc[i - 1] == 0]
month = lambda t: t.strftime("%B %Y")

questions = []
for d, letter, note in DATES:
    t = pd.Timestamp(d + "-01")
    window = pd.date_range(t - pd.DateOffset(months=36), t, freq="MS")
    pts = lambda s: [[i - 36, round(float(s.get(m)), 2)] for i, m in enumerate(window) if pd.notna(s.get(m))]
    lo = min(-2, math.floor(min(term[window].min(), credit[window].min()))); hi = max(3, math.ceil(max(term[window].max(), credit[window].max())))
    hit = [pk for pk in peaks if t < pk <= t + pd.DateOffset(months=12)]
    questions.append({
        "type": "prob",
        "prompt": f"<b>Mystery date {letter}.</b> The 10-year minus 3-month spread is now {term[t]:.2f} points "
                  f"(its low over the past year: {term[t - pd.DateOffset(months=12):t].min():.2f}); the Baa minus 10-year spread is "
                  f"{credit[t]:.2f} (a year ago: {credit[t - pd.DateOffset(months=12)]:.2f}). "
                  "What is the probability that a recession <b>begins in the next 12 months</b>?",
        "lines": {"series": [{"label": "10-year minus 3-month", "color": "#2a78d6", "points": pts(term)},
                             {"label": "Baa minus 10-year", "color": "#eb6834", "points": pts(credit)}],
                  "xLabel": "Months before the mystery date", "yLabel": "Percentage points", "xMin": -36, "xMax": 0,
                  "xTicks": [-36, -24, -12, 0], "yMin": lo, "yMax": hi, "yTicks": list(range(lo, hi + 1)), "aria": f"Spreads over the 36 months before mystery date {letter}"},
        "answer": bool(hit),
        "outcome": (f"Yes. This was {month(t)}; a recession began in {month(hit[0])}." if hit else f"No. This was {month(t)}; no recession began in the next 12 months."),
        "explain": note,
    })

out = {"id": "recession-call", "title": "Recession Call", "revote": False,
       "keyNote": "One outcome cannot show whether a probability was right: a 30% call should be followed by a recession about 3 times in 10. Judge forecasts by the Brier score over the whole set, against the 0.25 you get by always saying 50%. Recessions are dated by the NBER, often many months after they begin, and the spreads are monthly averages as published today. Nearby dates have overlapping 12-month windows, so six dates are less evidence than they look.",
       "note": "Mar 16, after 10.1-10.3. Six mystery dates; each shows the term spread and the credit spread for the three years before. "
               f"Students give a probability; scored with the Brier score. Built {date.today()} from FRED by build_recession_call.py.",
       "questions": questions}
(HERE / "sets-recession.js").write_text(
    "/* Generated by build_recession_call.py; do not edit by hand. */\n(window.CLASS_CHECK_SETS = window.CLASS_CHECK_SETS || []).push("
    + json.dumps(out, indent=1, ensure_ascii=False) + ");\n", encoding="utf-8")
print("wrote sets-recession.js:", [(q["outcome"][:60]) for q in questions])
