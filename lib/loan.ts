import { FIRST_TAX_YEAR, PLANS, type PlanId, interestRate, thresholdIn } from "./rules";

export interface Inputs {
  plan: PlanId;
  balance: number; // £ owed now
  salary: number; // £ a year now
  salaryGrowth: number; // a year, e.g. 0.03
  rpi: number; // inflation assumption, a year
  firstRepayYear: number; // the April you were (or will be) first due to repay, e.g. 2027
  overpayment: number; // extra £ a year, on top of what's taken from your pay
  investReturn: number; // what the money could earn instead, a year
}

export interface Year {
  taxYear: number; // starting year, e.g. 2026 for 2026-27
  salary: number;
  interest: number;
  required: number;
  extra: number;
  balance: number; // at the end of the year
}

export interface Result {
  years: Year[];
  totalPaid: number;
  writtenOff: number;
  clearedIn: number | null; // tax year the balance reached zero
  presentValue: number; // all payments, discounted at investReturn
}

/**
 * Year-by-year projection. Simplifications: interest is charged once a year on the opening
 * balance, and payments are taken at the end of the year.
 */
export function simulate(inputs: Inputs): Result {
  const plan = PLANS[inputs.plan];
  const writeOff = inputs.firstRepayYear + plan.writeOffYears; // written off in this April
  const years: Year[] = [];
  let balance = inputs.balance;
  let salary = inputs.salary;
  let totalPaid = 0;
  let presentValue = 0;
  let clearedIn: number | null = null;

  for (let taxYear = FIRST_TAX_YEAR; taxYear < writeOff && balance > 0; taxYear++) {
    const threshold = thresholdIn(plan, taxYear, inputs.rpi);
    const interest = balance * interestRate(plan.id, salary, inputs.rpi, threshold);
    const owed = balance + interest;
    const due = taxYear >= inputs.firstRepayYear ? Math.max(0, (salary - threshold) * plan.repayRate) : 0;
    const required = Math.min(due, owed);
    const extra = Math.min(inputs.overpayment, owed - required);
    balance = owed - required - extra;

    const paid = required + extra;
    totalPaid += paid;
    presentValue += paid / (1 + inputs.investReturn) ** (taxYear - FIRST_TAX_YEAR + 1);
    if (balance <= 0.005 && clearedIn === null) clearedIn = taxYear;
    years.push({ taxYear, salary, interest, required, extra, balance: Math.max(balance, 0) });
    salary *= 1 + inputs.salaryGrowth;
  }

  return { years, totalPaid, writtenOff: Math.max(balance, 0), clearedIn, presentValue };
}

export interface Comparison {
  without: Result;
  with: Result;
  /** Positive: overpaying saves you this much in today's money. Negative: it costs you. */
  saving: number;
}

/**
 * Overpaying vs keeping (and investing) the money. Both are valued in today's money by
 * discounting every payment at the investment return: a pound paid later is worth less,
 * because until then it could have been invested.
 */
export function compareOverpaying(inputs: Inputs): Comparison {
  const without = simulate({ ...inputs, overpayment: 0 });
  const withExtra = simulate(inputs);
  return { without, with: withExtra, saving: without.presentValue - withExtra.presentValue };
}

// Below this (in today's money), overpaying makes too little difference to call either way.
export const CLOSE_CALL = 500;

export type Why = "close" | "saves" | "rate" | "write-off";

/**
 * The main reason overpaying wins or loses. If the loan's interest is below what the money could
 * earn, paying early loses whatever happens ("rate"). If it's above and overpaying still loses,
 * the only thing that explains it is the write-off.
 */
export function why(comparison: Comparison, inputs: Inputs): Why {
  if (Math.abs(comparison.saving) < CLOSE_CALL) return "close";
  if (comparison.saving > 0) return "saves";
  return currentRate(inputs) < inputs.investReturn ? "rate" : "write-off";
}

/** The interest rate on the loan this year, at today's salary. */
export function currentRate(inputs: Inputs): number {
  const plan = PLANS[inputs.plan];
  return interestRate(plan.id, inputs.salary, inputs.rpi, thresholdIn(plan, FIRST_TAX_YEAR, inputs.rpi));
}
