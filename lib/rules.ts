// Repayment rules for each loan plan, 2026-27 tax year.
// Sources (checked 8 Oct 2026):
//   gov.uk/repaying-your-student-loan/what-you-pay (thresholds, rates, current interest)
//   gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled
//   DfE forecast of repayment thresholds by plan type (explore-education-statistics.service.gov.uk)

export type PlanId = "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";

export interface Plan {
  id: PlanId;
  name: string;
  who: string;
  threshold: number; // £ a year, 2026-27
  firstRise: number | null; // tax year (by its starting year) the threshold first rises with RPI; null = fixed
  repayRate: number; // share of income above the threshold
  writeOffYears: number; // after the April you were first due to repay
}

export const FIRST_TAX_YEAR = 2026; // 2026-27

export const PLANS: Record<PlanId, Plan> = {
  plan1: {
    id: "plan1",
    name: "Plan 1",
    who: "Started in England or Wales before Sept 2012, or from Northern Ireland",
    threshold: 26_900,
    firstRise: 2027,
    repayRate: 0.09,
    writeOffYears: 25, // for loans first paid on or after 1 Sept 2006
  },
  plan2: {
    id: "plan2",
    name: "Plan 2",
    who: "Started in England or Wales between Sept 2012 and July 2023",
    threshold: 29_385,
    firstRise: 2030, // frozen until April 2030
    repayRate: 0.09,
    writeOffYears: 30,
  },
  plan4: {
    id: "plan4",
    name: "Plan 4 (Scotland, SAAS)",
    who: "Students from Scotland with a loan through SAAS",
    threshold: 33_795,
    firstRise: 2027,
    repayRate: 0.09,
    writeOffYears: 30, // for loans first paid on or after 1 Aug 2007
  },
  plan5: {
    id: "plan5",
    name: "Plan 5",
    who: "Started in England from Aug 2023",
    threshold: 25_000,
    firstRise: 2027,
    repayRate: 0.09,
    writeOffYears: 40,
  },
  postgrad: {
    id: "postgrad",
    name: "Postgraduate Loan",
    who: "Master's or doctoral loan, England or Wales",
    threshold: 21_000,
    firstRise: null, // has stayed at £21,000; assumed fixed
    repayRate: 0.06,
    writeOffYears: 30,
  },
};

// Plan 2 interest goes from RPI to RPI + 3% between these incomes (2026-27). Assumed to stay
// frozen alongside the Plan 2 repayment threshold.
export const PLAN2_UPPER_INCOME = 52_885;

// Rates are capped at a "prevailing market rate"; it's 6% at the moment. Assumed to stay.
export const INTEREST_CAP = 0.06;

/** Annual interest rate for a plan, given income and an RPI assumption. */
export function interestRate(plan: PlanId, income: number, rpi: number, threshold: number): number {
  let rate: number;
  switch (plan) {
    case "plan2": {
      const share = Math.min(Math.max((income - threshold) / (PLAN2_UPPER_INCOME - threshold), 0), 1);
      rate = rpi + 0.03 * share;
      break;
    }
    case "postgrad":
      rate = rpi + 0.03;
      break;
    default:
      // Plans 1 and 4 use the lower of RPI and base rate + 1%; Plan 5 uses RPI. We use RPI.
      rate = rpi;
  }
  return Math.min(rate, INTEREST_CAP);
}

/** Repayment threshold in a given tax year (by its starting year). */
export function thresholdIn(plan: Plan, taxYear: number, rpi: number): number {
  if (plan.firstRise === null || taxYear < plan.firstRise) return plan.threshold;
  const rises = taxYear - plan.firstRise + 1;
  return plan.threshold * (1 + rpi) ** rises;
}
