"""Builds sets-fomc.js, "Be the FOMC" for Class Check (Mar 25, after 11.8 and 12.1).

Six real FOMC meetings, June 2021 to July 2023. For each, students see core PCE inflation
(12-month change, PCEPILFE) and the unemployment rate (UNRATE) as they had been published on the
meeting date (ALFRED vintages), the target range going in, and charts of both series for the
two years before. They set the upper end of the target range. The reveal gives the FOMC's actual
decision (DFEDTARU on the day after the meeting) and what the book's Taylor rule recommended with
those same real-time data (Ch. 12 Section 12: neutral real rate 1%, target 2%, output gap from
Okun's law as -2 x (unemployment - 4)).

Run with the mypython interpreter; needs FRED_API_KEY.
  C:/Users/kotterj/AppData/Local/miniconda3/envs/mypython/python.exe classroom/apps/class-check/build_fomc.py
"""
import json
import os
from datetime import date
from pathlib import Path

import pandas as pd
import requests

HERE = Path(__file__).resolve().parent
KEY = os.environ["FRED_API_KEY"]
MEETINGS = ["2021-06-16", "2021-12-15", "2022-03-16", "2022-06-15", "2022-11-02", "2023-07-26"]
NOTES = {
    "2021-06-16": "The FOMC saw the inflation as transitory, tied to reopening and supply bottlenecks, and kept rates at zero while it waited for maximum employment.",
    "2021-12-15": "Still at zero, but the FOMC doubled the pace at which it was ending its bond purchases and retired the word \"transitory\". The dot plot showed three hikes in 2022.",
    "2022-03-16": "The first increase, a quarter point, three weeks after Russia invaded Ukraine.",
    "2022-06-15": "Three-quarters of a point, the largest increase since 1994, after a hot May CPI report.",
    "2022-11-02": "A fourth straight three-quarter-point increase.",
    "2023-07-26": "A quarter point to 5.25-5.50%, the peak of the cycle. Inflation was falling and unemployment had not risen.",
}


def obs(series, vintage=None, start="2017-01-01"):
    p = dict(series_id=series, api_key=KEY, file_type="json", observation_start=start)
    if vintage:
        p.update(realtime_start=vintage, realtime_end=vintage)
    r = requests.get("https://api.stlouisfed.org/fred/series/observations", params=p, timeout=30)
    r.raise_for_status()
    d = pd.DataFrame(r.json()["observations"])
    d["value"] = pd.to_numeric(d["value"], errors="coerce")
    return d.set_index(pd.to_datetime(d["date"]))["value"].dropna()


target = obs("DFEDTARU", start="2020-01-01")
qs = []
for i, m in enumerate(MEETINGS):
    t = pd.Timestamp(m)
    pce, u = obs("PCEPILFE", m), obs("UNRATE", m)
    infl = (pce / pce.shift(12) - 1) * 100
    last_month = infl.index[-1]
    pi, ur = round(float(infl.iloc[-1]), 1), round(float(u.iloc[-1]), 1)
    before = float(target[target.index < t].iloc[-1])
    after = float(target[target.index > t].iloc[0])
    gap = -2 * (ur - 4.0)
    taylor = round(1 + pi + 0.5 * (pi - 2) + 0.5 * gap, 2)
    win0 = t - pd.DateOffset(months=24)
    ser = lambda s: [[round((d - t).days / 30.44, 1), round(float(v), 2)] for d, v in s[(s.index >= win0) & (s.index < t)].items()]
    move = after - before
    top = int(2 * -(-max(infl[infl.index >= win0].max(), u[u.index >= win0].max(), after) // 2))
    did = "held the range at" if abs(move) < 1e-9 else f"{'raised' if move > 0 else 'cut'} it by {abs(move):.2f} points to"
    qs.append({
        "type": "number", "unit": "%", "min": 0, "max": 10, "step": 0.25, "answer": after,
        "prompt": f"<b>Meeting {i + 1} of {len(MEETINGS)}.</b> Core PCE inflation over the past 12 months: <b>{pi}%</b>. "
                  f"Unemployment: <b>{ur}%</b> (latest data as published that day). The target range is now "
                  f"<b>{max(0, before - 0.25):.2f}–{before:.2f}%</b>. Set the <b>top of the range</b> for the next six weeks.",
        "lines": {"series": [{"label": "Core PCE inflation, 12 months", "color": "#eb6834", "points": ser(infl)},
                             {"label": "Unemployment rate", "color": "#2a78d6", "points": ser(u)},
                             {"label": "Top of the target range", "color": "#152f39", "points": ser(target)}],
                  "xLabel": "Months before the meeting", "yLabel": "Percent", "xMin": -24, "xMax": 0, "xTicks": [-24, -18, -12, -6, 0],
                  "yMin": 0, "yMax": top, "yTicks": list(range(0, top + 1, 2)), "aria": f"Inflation, unemployment, and the target rate before meeting {i + 1}"},
        "explain": f"This was {t.strftime('%B %d, %Y').replace(' 0', ' ')}. The FOMC {did} {max(0, after - 0.25):.2f}–{after:.2f}%. "
                   f"The book's Taylor rule, with these same data (inflation through {last_month.strftime('%B %Y')}), recommended about <b>{taylor:.1f}%</b>. "
                   + NOTES[m],
    })
    print(m, "pi", pi, "u", ur, "before", before, "after", after, "taylor", taylor)

out = {"id": "be-the-fomc", "title": "Be the FOMC", "revote": False,
       "note": "Mar 25, after 11.8 and 12.1. Six real meetings, June 2021 to July 2023, with the data published by each meeting date. "
               f"Students (or teams on one phone) set the top of the range; the reveal shows the FOMC and the Taylor rule. Built {date.today()} from FRED/ALFRED by build_fomc.py.",
       "questions": qs}
(HERE / "sets-fomc.js").write_text(
    "/* Generated by build_fomc.py; do not edit by hand. */\n(window.CLASS_CHECK_SETS = window.CLASS_CHECK_SETS || []).push("
    + json.dumps(out, indent=1, ensure_ascii=False) + ");\n", encoding="utf-8")
print("wrote sets-fomc.js")
