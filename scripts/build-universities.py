"""Builds lib/universities.json: how each university's graduates earn compared with everyone who
studied the same subject, five years after graduating.

Source: Department for Education, "LEO Graduate outcomes provider level data", 2021-22 release,
"Provider underlying data" (an .xlsx of about 60 MB). Needs openpyxl.

    python3 scripts/build-universities.py path/to/provider-underlying-data.xlsx

For each university, and each subject it teaches with enough graduates, it keeps the ratio of its
graduates' median earnings to the national median for that subject, in the 2021-22 tax year, and how
many graduates with earnings that's based on (used to build a pool with that university's mix of
subjects). The model multiplies a borrower's pay by the ratio. Comparing within subject stops a university looking
good just because it teaches subjects that pay well.
"""

import json
import sys

import openpyxl
from university_names import tidy

MIN_WITH_EARNINGS = 30  # published counts below this are too noisy to use

rows = openpyxl.load_workbook(sys.argv[1], read_only=True)["underlying_data"].iter_rows(values_only=True)
header = next(rows)
col = {name: i for i, name in enumerate(header)}


def num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


national = {}  # subject -> median
provider = {}  # (name, subject) -> (median, count)
for r in rows:
    if r[col["time_period"]] != 202122 or r[col["YAG"]] != "5 YAG" or r[col["sex"]] != "Female + male":
        continue
    if r[col["region_name_current"]] not in ("All regions in UK", "Total"):
        continue
    subject = r[col["cah2_subject_name"]]
    median = num(r[col["earnings_median"]])
    count = num(r[col["earnings_include"]])
    if median is None or count is None:
        continue
    if r[col["geographic_level"]] == "National" and r[col["provider_type"]] == "Total":
        national[subject] = median
    elif r[col["geographic_level"]] == "Provider" and r[col["provider_name"]] and count >= MIN_WITH_EARNINGS:
        provider[(tidy(r[col["provider_name"]]), subject)] = (median, count)

universities = {}
for (name, subject), (median, count) in provider.items():
    if subject == "Total" or subject not in national:
        continue
    universities.setdefault(name, {})[subject] = [round(median / national[subject], 3), int(count)]

# Each university's overall effect: its subject ratios weighted by graduates with earnings.
overall = {}
for name, subjects in universities.items():
    weights = [(count, ratio) for ratio, count in subjects.values()]
    total = sum(w for w, _ in weights)
    if total >= 100:
        overall[name] = round(sum(w * ratio for w, ratio in weights) / total, 3)

out = {
    "source": "DfE, LEO Graduate outcomes provider level data, 2021-22 tax year, five years after graduation",
    "overall": dict(sorted(overall.items())),
    "bySubject": {name: dict(sorted(universities[name].items())) for name in sorted(overall)},
}
with open("lib/universities.json", "w") as f:
    json.dump(out, f, indent=0, separators=(",", ":"))
    f.write("\n")
print(len(overall), "universities;", sum(len(v) for v in out["bySubject"].values()), "university-subject pairs;", len(national), "subjects")
