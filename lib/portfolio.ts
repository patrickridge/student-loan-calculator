// What is a pool of student loans worth? Simulates thousands of borrowers through the real
// repayment rules, using graduate earnings by subject from HMRC tax records (lib/earnings.json),
// across many possible futures for wages and inflation. Then prices the pool, and tranches of it.
//
// Each borrower's earnings follow their subject's published profile (quartiles at 1, 3, 5 and 10
// years after graduation), with their own position in that spread that drifts over time, and
// years with no UK earnings (out of work, abroad, caring) at the rate the data shows.

import earnings from "./earnings.json";
import universities from "./universities.json";
import { INTEREST_CAP, PLAN2_UPPER_INCOME, PLANS } from "./rules";

export type PoolPlan = "plan5" | "plan2";

/** Changes to the rules a buyer might worry about. */
export type PolicyId = "current" | "freeze-2030" | "freeze-forever" | "write-off-30" | "interest-plus-3";

export const POLICIES: Record<PolicyId, { label: string; firstRise?: number | null; writeOffYears?: number; margin?: number }> = {
  current: { label: "Today's rules" },
  "freeze-2030": { label: "Threshold frozen until 2030", firstRise: 2030 },
  "freeze-forever": { label: "Threshold never rises", firstRise: null },
  "write-off-30": { label: "Written off after 30 years", writeOffYears: 30 },
  "interest-plus-3": { label: "Interest at RPI + 3%", margin: 0.03 },
};

export interface Assumptions {
  plan: PoolPlan;
  policy: PolicyId;
  /** Average balance when repayments start, £. Plan 5 default: £9,535 fees and an average
   *  maintenance loan for three years, plus interest while studying. */
  balance: number;
  /** Long-run nominal wage growth, a year. */
  wageGrowth: number;
  /** Long-run RPI inflation, a year. */
  rpi: number;
  /** Rate used to value future repayments in today's money, a year. */
  discountRate: number;
}

export interface Mix {
  /** A subject name from earnings.json, or null for all subjects in their real proportions. */
  subject: string | null;
  /** A prior attainment band, or null for all. */
  attainment: string | null;
  /** A university, or null for all. Its graduates' pay relative to the subject replaces grades. */
  university?: string | null;
}

export const DEFAULTS: Assumptions = { plan: "plan5", policy: "current", balance: 52_000, wageGrowth: 0.035, rpi: 0.03, discountRate: 0.05 };

// Graduate earnings in the data are for the 2021-22 tax year. Average earnings grew by roughly a
// quarter from then to 2026-27 (ONS average weekly earnings, with the last months forecast).
const EARNINGS_UPRATE = 1.26;
const FIRST_REPAY_YEAR = 2027; // a cohort graduating in summer 2026
const PERSISTENCE = 0.9; // how much of a borrower's place in the earnings spread carries to next year
const WORK_PERSISTENCE = 0.8; // same, for having UK earnings at all
const EXPERIENCE_FADE = 25; // years after graduation by which pay stops rising faster than average
// Later in a career pay tends to fall behind average wage growth, and more people work part-time,
// retire early or leave the UK. From 25 years after graduation (around age 47), pay drifts 1% a
// year below average and the share with UK earnings falls by 1.5 percentage points a year.
const LATE_CAREER = 25;
const LATE_PAY_DRIFT = -0.01;
const LATE_WORK_FALL = 0.015;

type Subject = (typeof earnings.subjects)[number];
const SUBJECTS: Subject[] = earnings.subjects;
const POINTS = [1, 3, 5, 10] as const;
const IQR_Z = 1.349; // width of the middle half of a normal distribution, in standard deviations

// ---------- random numbers ----------

/** Seeded generator (mulberry32), so the same inputs always give the same answer. */
function generator(seed: number) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const normal = () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = uniform();
    const r = Math.sqrt(-2 * Math.log(u));
    const theta = 2 * Math.PI * uniform();
    spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
  return { uniform, normal };
}

/** Standard normal cumulative distribution (Abramowitz and Stegun 26.2.17). */
function phi(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// ---------- a subject's earnings over a career ----------

export interface Profile {
  /** By years after graduation (index 1 onwards): log median pay in 2026-27 money before wage growth, spread, and share with UK earnings. */
  logMedian: number[];
  sigma: number[];
  working: number[];
}

export function profile(subject: Subject, attainmentRatio: number, years: number): Profile {
  const at = (y: (typeof POINTS)[number]) => subject.years[String(y) as "1" | "3" | "5" | "10"];
  const known = POINTS.map((y) => ({
    y,
    logMedian: Math.log(at(y).median * EARNINGS_UPRATE * attainmentRatio),
    sigma: (Math.log(at(y).uq) - Math.log(at(y).lq)) / IQR_Z,
    working: at(y).working,
  }));
  // Pay growth from experience alone, from the gap between 5 and 10 years after graduation.
  const lateGrowth = (known[3].logMedian - known[2].logMedian) / 5;
  const out: Profile = { logMedian: [], sigma: [], working: [] };
  for (let t = 1; t <= years; t++) {
    let k: { logMedian: number; sigma: number; working: number };
    if (t <= 10) {
      const i = known.findIndex((p) => p.y >= t);
      const hi = known[i];
      const lo = known[Math.max(0, i - 1)];
      const w = hi.y === lo.y ? 1 : (t - lo.y) / (hi.y - lo.y);
      k = {
        logMedian: lo.logMedian + w * (hi.logMedian - lo.logMedian),
        sigma: lo.sigma + w * (hi.sigma - lo.sigma),
        working: lo.working + w * (hi.working - lo.working),
      };
    } else {
      const prev = out.logMedian[t - 1];
      const fade = Math.max(0, (EXPERIENCE_FADE - t) / (EXPERIENCE_FADE - 10));
      const late = Math.max(0, t - LATE_CAREER);
      k = {
        logMedian: prev + lateGrowth * fade + (t > LATE_CAREER ? LATE_PAY_DRIFT : 0),
        sigma: known[3].sigma,
        working: Math.max(0.3, known[3].working - LATE_WORK_FALL * late),
      };
    }
    out.logMedian[t] = k.logMedian;
    out.sigma[t] = k.sigma;
    out.working[t] = k.working;
  }
  return out;
}

// ---------- possible futures ----------

export interface Future {
  wageGrowth: number[]; // by year index 0..
  rpi: number[];
}

/** Long-run wage growth and inflation vary between futures, and wobble year to year within one. */
export function futures(a: Assumptions, count: number, years: number, seed = 7): Future[] {
  const rng = generator(seed);
  const out: Future[] = [];
  for (let s = 0; s < count; s++) {
    const shared = rng.normal();
    const wageLevel = a.wageGrowth + 0.01 * shared;
    const rpiLevel = a.rpi + 0.01 * (0.5 * shared + 0.87 * rng.normal());
    const f: Future = { wageGrowth: [], rpi: [] };
    for (let y = 0; y < years; y++) {
      f.wageGrowth.push(wageLevel + 0.01 * rng.normal());
      f.rpi.push(Math.max(-0.01, rpiLevel + 0.01 * rng.normal()));
    }
    out.push(f);
  }
  return out;
}

/** The central future: assumptions exactly, every year. */
export const central = (a: Assumptions, years: number): Future => ({ wageGrowth: Array(years).fill(a.wageGrowth), rpi: Array(years).fill(a.rpi) });

// ---------- borrowers ----------

type University = Record<string, [number, number]>; // subject -> [pay ratio, graduates with earnings]
const UNIVERSITIES = universities.bySubject as unknown as Record<string, University>;
const UNIVERSITY_OVERALL = universities.overall as Record<string, number>;

function pickSubjects(mix: Mix, count: number, uniform: () => number): Subject[] {
  if (mix.subject) return Array(count).fill(SUBJECTS.find((s) => s.name === mix.subject)!);
  // All subjects in their real proportions, nationally or at the chosen university.
  const uni = mix.university ? UNIVERSITIES[mix.university] : null;
  const weights = SUBJECTS.map((s) => (uni ? (uni[s.name]?.[1] ?? 0) : s.grads));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return Array.from({ length: count }, () => {
    let r = uniform() * total;
    for (let i = 0; i < SUBJECTS.length; i++) if ((r -= weights[i]) < 0) return SUBJECTS[i];
    return SUBJECTS.at(-1)!;
  });
}

/** Pay relative to the subject's national figures, from the university or else from grades. */
function payRatio(subject: Subject, mix: Mix) {
  if (mix.university) return UNIVERSITIES[mix.university]?.[subject.name]?.[0] ?? UNIVERSITY_OVERALL[mix.university] ?? 1;
  return attainmentRatio(subject, mix.attainment);
}

function attainmentRatio(subject: Subject, attainment: string | null) {
  if (!attainment) return 1;
  const bySubject = earnings.attainment.bySubject as Record<string, Record<string, number>>;
  const overall = earnings.attainment.overall as Record<string, number>;
  return bySubject[subject.name]?.[attainment] ?? overall[attainment] ?? 1;
}

export interface PoolResult {
  /** Cash repaid each year across the pool, as a share of the starting balance, per future. */
  cash: number[][];
  /** Share of borrowers who clear the loan before write-off (central future). */
  repaidInFull: number;
  /** Repaid in cash over the life of the loans, as a share of the starting balance (central future). */
  cashMultiple: number;
}

/**
 * Runs `borrowers` borrowers through every future. Borrowers are the same in each future (same
 * subjects and personal luck), so differences between futures come from the economy alone.
 */
export function simulatePool(a: Assumptions, mix: Mix, borrowers: number, worlds: Future[], seed = 1): PoolResult {
  const plan = PLANS[a.plan];
  const policy = POLICIES[a.policy];
  const years = writeOffYears(a);
  const firstRise = policy.firstRise === undefined ? plan.firstRise : policy.firstRise;
  const margin = policy.margin ?? 0;
  const rng = generator(seed);
  const subjects = pickSubjects(mix, borrowers, rng.uniform);
  const profiles = new Map<Subject, Profile>();
  const profileOf = (s: Subject) => {
    if (!profiles.has(s)) profiles.set(s, profile(s, payRatio(s, mix), years));
    return profiles.get(s)!;
  };
  // Personal luck: a path of positions in the pay spread, and of being in UK work at all.
  const luck = subjects.map(() => {
    const pay: number[] = [];
    const work: number[] = [];
    let z = rng.normal();
    let u = rng.normal();
    for (let t = 0; t < years; t++) {
      pay.push(z);
      work.push(phi(u));
      z = PERSISTENCE * z + Math.sqrt(1 - PERSISTENCE ** 2) * rng.normal();
      u = WORK_PERSISTENCE * u + Math.sqrt(1 - WORK_PERSISTENCE ** 2) * rng.normal();
    }
    return { pay, work };
  });

  const face = borrowers * a.balance;
  const cash: number[][] = [];
  let repaidInFull = 0;
  let cashMultiple = 0;

  worlds.forEach((world, w) => {
    const yearly = new Array(years).fill(0);
    subjects.forEach((subject, b) => {
      const p = profileOf(subject);
      let balance = a.balance;
      let threshold = plan.threshold;
      let level = 0; // cumulative log wage growth since 2026-27
      for (let t = 0; t < years && balance > 0; t++) {
        const taxYear = FIRST_REPAY_YEAR + t;
        level += Math.log(1 + world.wageGrowth[t]);
        if (firstRise !== null && taxYear >= firstRise) threshold *= 1 + world.rpi[t];
        const working = luck[b].work[t] < p.working[t + 1];
        const income = working ? Math.exp(p.logMedian[t + 1] + level + p.sigma[t + 1] * luck[b].pay[t]) : 0;
        let rate = world.rpi[t] + margin;
        if (a.plan === "plan2") rate += 0.03 * Math.min(Math.max((income - threshold) / (PLAN2_UPPER_INCOME - threshold), 0), 1);
        balance *= 1 + Math.min(rate, INTEREST_CAP);
        const paid = Math.min(balance, Math.max(0, (income - threshold) * plan.repayRate));
        balance -= paid;
        yearly[t] += paid;
        if (balance <= 0.01 && w === 0) repaidInFull++;
      }
    });
    cash.push(yearly.map((c) => c / face));
    if (w === 0) cashMultiple = yearly.reduce((s, c) => s + c, 0) / face;
  });

  return { cash, repaidInFull: repaidInFull / borrowers, cashMultiple };
}

/** Years until write-off, under the plan and any policy change. */
export const writeOffYears = (a: Assumptions) => POLICIES[a.policy].writeOffYears ?? PLANS[a.plan].writeOffYears;

// ---------- pricing ----------

/** Value today of a stream of yearly cash (paid at the end of each year). */
export const presentValue = (stream: number[], rate: number) => stream.reduce((sum, c, t) => sum + c / (1 + rate) ** (t + 1), 0);

/** The yearly return that makes a stream worth `price` today (bisection). */
export function yieldAt(stream: number[], price: number) {
  let lo = -0.5;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (presentValue(stream, mid) > price) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
};

export interface Tranche {
  name: string;
  /** Size, as a share of the pool's starting balance. Null for the equity, which takes what's left. */
  size: number | null;
  /** Yearly interest promised on what's still owed to the tranche. */
  coupon: number;
}

export const TRANCHES: Tranche[] = [
  { name: "Senior", size: 0.3, coupon: 0.045 },
  { name: "Mezzanine", size: 0.2, coupon: 0.07 },
  { name: "Equity", size: null, coupon: 0 },
];

export interface TrancheResult {
  name: string;
  size: number;
  /** Futures in which the tranche is paid everything it's owed. */
  paidInFull: number;
  /** Average share of what's owed (principal and interest) that's never paid. */
  expectedLoss: number;
  /** Same, in a bad future: the worst one in twenty. */
  badLoss: number;
  /** Value today per £1 of the tranche, at the pool's discount rate. */
  value: number;
  /** Yearly return on the average cash, if bought at face value (after losses). */
  returnAtFace: number;
}

/**
 * Pays each year's cash down the tranches in order: senior interest and principal first, then
 * mezzanine, and whatever is left to the equity. Losses therefore hit the equity first.
 */
export function tranche(cash: number[][], tranches: Tranche[], discountRate: number): TrancheResult[] {
  const debt = tranches.filter((t) => t.size !== null);
  const equitySize = 1 - debt.reduce((s, t) => s + t.size!, 0);
  const perFuture = cash.map((stream) => {
    const owed = debt.map((t) => t.size!);
    const promised = debt.map((t) => t.size!);
    const paid = debt.map(() => [] as number[]);
    const equity: number[] = [];
    for (const c of stream) {
      let left = c;
      debt.forEach((t, i) => {
        owed[i] *= 1 + t.coupon;
        promised[i] += owed[i] - owed[i] / (1 + t.coupon);
        const pay = Math.min(left, owed[i]);
        owed[i] -= pay;
        left -= pay;
        paid[i].push(pay);
      });
      equity.push(left);
    }
    return { owed, promised, paid, equity };
  });

  const average = (streams: number[][]) => streams[0].map((_, y) => streams.reduce((s, st) => s + st[y], 0) / streams.length);
  const results: TrancheResult[] = debt.map((t, i) => {
    const losses = perFuture.map((f) => f.owed[i] / f.promised[i]);
    return {
      name: t.name,
      size: t.size!,
      paidInFull: perFuture.filter((f) => f.owed[i] < 1e-9).length / perFuture.length,
      expectedLoss: losses.reduce((s, l) => s + l, 0) / losses.length,
      badLoss: quantile(losses, 0.95),
      value: perFuture.reduce((s, f) => s + presentValue(f.paid[i], discountRate), 0) / perFuture.length / t.size!,
      returnAtFace: yieldAt(average(perFuture.map((f) => f.paid[i])), t.size!),
    };
  });
  const equityValues = perFuture.map((f) => presentValue(f.equity, discountRate) / equitySize);
  results.push({
    name: tranches.find((t) => t.size === null)!.name,
    size: equitySize,
    paidInFull: perFuture.filter((f) => f.equity.reduce((s, c) => s + c, 0) >= equitySize).length / perFuture.length,
    expectedLoss: perFuture.reduce((s, f) => s + Math.max(0, 1 - f.equity.reduce((x, c) => x + c, 0) / equitySize), 0) / perFuture.length,
    badLoss: quantile(perFuture.map((f) => Math.max(0, 1 - f.equity.reduce((x, c) => x + c, 0) / equitySize)), 0.95),
    value: equityValues.reduce((s, v) => s + v, 0) / equityValues.length,
    returnAtFace: yieldAt(average(perFuture.map((f) => f.equity)), equitySize),
  });
  return results;
}

export interface Valuation {
  /** Value today per £1 of loans, average over futures. */
  value: number;
  /** Cash each year in a bad future and a good one (5th and 95th percentile of each year). */
  lowCash: number[];
  highCash: number[];
  /** Yearly return for a range of purchase prices per £1. */
  priceCurve: { price: number; yield: number }[];
  /** Value in a bad future (5th percentile) and a good one (95th). */
  low: number;
  high: number;
  repaidInFull: number;
  cashMultiple: number;
  /** Weighted average life: on average, how many years until a pound repaid comes back. */
  averageLife: number;
  /** Average cash per year as a share of the starting balance, for a chart. */
  averageCash: number[];
  tranches: TrancheResult[];
}

export function valuePool(a: Assumptions, mix: Mix, { borrowers = 1500, futureCount = 120, seed = 1, tranches = TRANCHES } = {}): Valuation {
  const years = writeOffYears(a);
  // The first future is the central one, used for the per-borrower figures.
  const worlds = [central(a, years), ...futures(a, futureCount - 1, years, seed + 100)];
  const pool = simulatePool(a, mix, borrowers, worlds, seed);
  const values = pool.cash.map((stream) => presentValue(stream, a.discountRate));
  const averageCash = pool.cash[0].map((_, t) => pool.cash.reduce((s, stream) => s + stream[t], 0) / pool.cash.length);
  const yearly = (q: number) => pool.cash[0].map((_, t) => quantile(pool.cash.map((stream) => stream[t]), q));
  return {
    value: values.reduce((s, v) => s + v, 0) / values.length,
    lowCash: yearly(0.05),
    highCash: yearly(0.95),
    priceCurve: Array.from({ length: 15 }, (_, i) => 0.3 + i * 0.05).map((price) => ({ price, yield: yieldAt(averageCash, price) })),
    low: quantile(values, 0.05),
    high: quantile(values, 0.95),
    repaidInFull: pool.repaidInFull,
    cashMultiple: pool.cashMultiple,
    averageLife: averageCash.reduce((s, c, t) => s + c * (t + 1), 0) / averageCash.reduce((s, c) => s + c, 0),
    averageCash,
    tranches: tranche(pool.cash, tranches, a.discountRate),
  };
}

export interface SubjectRow {
  subject: string;
  value: number;
  repaidInFull: number;
  medianPay10: number;
}

/** Value per £1 by subject, in the central future, for comparing degrees. */
export function bySubject(a: Assumptions, mix: Omit<Mix, "subject">, borrowers = 400): SubjectRow[] {
  const world = [central(a, writeOffYears(a))];
  const uni = mix.university ? UNIVERSITIES[mix.university] : null;
  // At a university, only the subjects it has published figures for.
  return SUBJECTS.filter((s) => !uni || uni[s.name])
    .map((s) => {
      const m = { ...mix, subject: s.name };
      const pool = simulatePool(a, m, borrowers, world, 3);
      return {
        subject: s.name,
        value: presentValue(pool.cash[0], a.discountRate),
        repaidInFull: pool.repaidInFull,
        medianPay10: Math.round((s.years["10"].median * EARNINGS_UPRATE * payRatio(s, m)) / 100) * 100,
      };
    })
    .sort((x, y) => y.value - x.value);
}

/** Universities with enough published figures, by name. */
export const UNIVERSITY_NAMES = Object.keys(UNIVERSITY_OVERALL).sort((a, b) => a.localeCompare(b));

export const SUBJECT_NAMES = SUBJECTS.map((s) => s.name);
export const ATTAINMENT_GROUPS: string[] = earnings.attainment.groups;
