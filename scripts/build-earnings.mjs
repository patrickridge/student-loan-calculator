// Builds lib/earnings.json from the Department for Education's graduate earnings data (LEO).
//
// Source: "Graduate labour market outcomes (LEO)", 2021-22 release, "Underlying data" file
// (explore-education-statistics.service.gov.uk, data set e09ea7c0-0bc8-440d-bbc6-afe692db1334).
// It comes from HMRC tax records matched to university records, so it covers real graduates.
//
//   node scripts/build-earnings.mjs path/to/underlying.csv
//
// For UK-domiciled first-degree graduates in the 2021-22 tax year, it keeps, per subject and for
// 1, 3, 5 and 10 years after graduation: earnings quartiles of those in sustained employment, and
// the share with earnings at all (the rest are out of work, studying, abroad or untraced). It also
// keeps how prior attainment (A-level grades) moves median earnings within each subject.

import { readFileSync, writeFileSync } from "node:fs";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const rows = parseCsv(readFileSync(process.argv[2], "utf8"));

const ALL = ["region_name_current", "ethnicity_major", "ethnicity_minor", "inst_type", "study_mode", "POLAR4", "FSM", "region_name_origin", "residence"];
const base = (r) =>
  r.time_period === "202122" &&
  r.qualification_level === "First-degree" &&
  r.country_of_domicile_grouped === "UK" &&
  r.sex === "Female + male" &&
  ALL.every((k) => r[k] === "Total");
const num = (v) => (v === "" || v === "x" || v === "c" || v === "z" ? null : Number(v));

const YEARS = ["1", "3", "5", "10"];
const subjects = [];
const main = rows.filter((r) => base(r) && r.age_band === "Total" && r.prior_attainment === "Total");
for (const name of [...new Set(main.map((r) => r.subject_name))].filter((n) => n !== "Total").sort()) {
  const years = {};
  for (const y of YEARS) {
    const r = main.find((x) => x.subject_name === name && x.YAG === `${y} YAG`);
    const lq = r && num(r.earnings_LQ);
    const median = r && num(r.earnings_median);
    const uq = r && num(r.earnings_UQ);
    const working = r && num(r.earnings_include) / num(r.grads_uk);
    if (lq && median && uq && working) years[y] = { lq, median, uq, working: Math.round(working * 1000) / 1000 };
  }
  const grads = num(main.find((x) => x.subject_name === name && x.YAG === "5 YAG")?.grads_uk) ?? 0;
  // Small subjects with gaps in the data are left out rather than guessed.
  if (YEARS.every((y) => years[y]) && grads >= 500) subjects.push({ name, grads, years });
}

// Prior attainment: published for graduates who started under 21, up to five years after graduation.
const attainmentRows = rows.filter((r) => base(r) && r.age_band === "Under 21" && r.YAG === "5 YAG" && r.prior_attainment !== "Total");
const GROUPS = ["4 As or more", "360 points", "300-359 points", "240-299 points", "180-239 points", "Below 180 points", "1 or 2 A level passes", "BTEC"];
const overallTotal = num(rows.find((r) => base(r) && r.age_band === "Under 21" && r.YAG === "5 YAG" && r.subject_name === "Total" && r.prior_attainment === "Total")?.earnings_median);
const attainment = { groups: GROUPS, overall: {}, bySubject: {} };
for (const g of GROUPS) {
  const r = attainmentRows.find((x) => x.subject_name === "Total" && x.prior_attainment === g);
  attainment.overall[g] = Math.round((num(r.earnings_median) / overallTotal) * 1000) / 1000;
}
for (const s of subjects) {
  // No all-grades row is published for this group, so compare each grade band with the
  // average across bands, weighted by how many graduates have earnings in each.
  const bands = GROUPS.map((g) => attainmentRows.find((x) => x.subject_name === s.name && x.prior_attainment === g))
    .filter((r) => r && num(r.earnings_median) && num(r.earnings_include) >= 100);
  const weight = bands.reduce((sum, r) => sum + num(r.earnings_include), 0);
  if (!weight) continue;
  const average = bands.reduce((sum, r) => sum + num(r.earnings_median) * num(r.earnings_include), 0) / weight;
  attainment.bySubject[s.name] = Object.fromEntries(bands.map((r) => [r.prior_attainment, Math.round((num(r.earnings_median) / average) * 1000) / 1000]));
}

writeFileSync(
  "lib/earnings.json",
  JSON.stringify({ source: "DfE, Graduate labour market outcomes (LEO), 2021-22 tax year, UK-domiciled first-degree graduates", taxYear: 2021, subjects, attainment }, null, 1) + "\n",
);
console.log(subjects.length, "subjects;", Object.keys(attainment.bySubject).length, "with attainment splits");
