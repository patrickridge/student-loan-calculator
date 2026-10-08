import { describe, expect, it } from "vitest";
import { compareOverpaying, simulate, why, type Inputs } from "./loan";
import { INTEREST_CAP, PLANS, PLAN2_UPPER_INCOME, interestRate, thresholdIn } from "./rules";

const base: Inputs = {
  plan: "plan5",
  balance: 2_000,
  salary: 35_000,
  salaryGrowth: 0,
  rpi: 0,
  firstRepayYear: 2026,
  overpayment: 0,
  investReturn: 0,
};

describe("interestRate", () => {
  const t = PLANS.plan2.threshold;

  it("Plan 2 goes from RPI to RPI + 3% across the income band", () => {
    expect(interestRate("plan2", t, 0.02, t)).toBeCloseTo(0.02);
    expect(interestRate("plan2", (t + PLAN2_UPPER_INCOME) / 2, 0.02, t)).toBeCloseTo(0.035);
    expect(interestRate("plan2", PLAN2_UPPER_INCOME, 0.02, t)).toBeCloseTo(0.05);
    expect(interestRate("plan2", 10_000, 0.02, t)).toBeCloseTo(0.02);
  });

  it("matches today's published rates when RPI is 4.1%", () => {
    expect(interestRate("plan5", 40_000, 0.041, 25_000)).toBeCloseTo(0.041);
    expect(interestRate("plan2", 60_000, 0.041, t)).toBeCloseTo(INTEREST_CAP); // 7.1% capped at 6%
    expect(interestRate("postgrad", 40_000, 0.041, 21_000)).toBeCloseTo(0.06);
  });
});

describe("thresholdIn", () => {
  it("keeps Plan 2 frozen until April 2030, then rises with RPI", () => {
    expect(thresholdIn(PLANS.plan2, 2029, 0.03)).toBe(29_385);
    expect(thresholdIn(PLANS.plan2, 2030, 0.03)).toBeCloseTo(29_385 * 1.03);
    expect(thresholdIn(PLANS.plan2, 2031, 0.03)).toBeCloseTo(29_385 * 1.03 ** 2);
  });

  it("raises Plan 5 from April 2027 and keeps the Postgraduate threshold fixed", () => {
    expect(thresholdIn(PLANS.plan5, 2026, 0.03)).toBe(25_000);
    expect(thresholdIn(PLANS.plan5, 2027, 0.03)).toBeCloseTo(25_750);
    expect(thresholdIn(PLANS.postgrad, 2040, 0.03)).toBe(21_000);
  });
});

describe("simulate", () => {
  it("pays 9% above the threshold until the loan is cleared", () => {
    // 9% of (35,000 - 25,000) = 900 a year, no interest: 900, 900, then the last 200.
    const result = simulate(base);
    expect(result.years.map((y) => Math.round(y.required))).toEqual([900, 900, 200]);
    expect(result.clearedIn).toBe(2028);
    expect(result.totalPaid).toBeCloseTo(2_000);
    expect(result.writtenOff).toBe(0);
  });

  it("charges interest on the opening balance", () => {
    const result = simulate({ ...base, rpi: 0.05, salary: 25_000 }); // earns exactly the threshold
    expect(result.years[0].interest).toBeCloseTo(100);
    expect(result.years[0].balance).toBeCloseTo(2_100);
  });

  it("takes nothing before the first repayment April", () => {
    const result = simulate({ ...base, firstRepayYear: 2027 });
    expect(result.years[0].required).toBe(0);
    expect(result.years[1].required).toBeCloseTo(900);
  });

  it("writes off whatever is left after the plan's term", () => {
    // Below the threshold for good: nothing is ever paid, 40 years later it's written off.
    const result = simulate({ ...base, salary: 20_000 });
    expect(result.years).toHaveLength(40);
    expect(result.totalPaid).toBe(0);
    expect(result.writtenOff).toBeCloseTo(2_000);
    expect(result.clearedIn).toBeNull();
  });

  it("discounts payments at the investment return", () => {
    const result = simulate({ ...base, investReturn: 0.1 });
    expect(result.presentValue).toBeCloseTo(900 / 1.1 + 900 / 1.1 ** 2 + 200 / 1.1 ** 3);
  });

  it("never takes more than is owed", () => {
    const result = simulate({ ...base, overpayment: 5_000 });
    expect(result.years).toHaveLength(1);
    expect(result.years[0].required + result.years[0].extra).toBeCloseTo(2_000);
  });
});

describe("compareOverpaying", () => {
  it("saves money when you'd clear the loan anyway and interest beats the investment return", () => {
    const inputs = { ...base, plan: "postgrad" as const, balance: 10_000, salary: 60_000, rpi: 0.04, overpayment: 2_000 };
    expect(compareOverpaying(inputs).saving).toBeGreaterThan(0);
  });

  it("costs money when most of the loan would be written off", () => {
    const inputs = { ...base, balance: 60_000, salary: 27_000, rpi: 0.03, overpayment: 1_200, investReturn: 0.03 };
    const result = compareOverpaying(inputs);
    expect(result.without.writtenOff).toBeGreaterThan(0);
    expect(result.saving).toBeLessThan(0);
  });
});

describe("why", () => {
  const big = { ...base, balance: 60_000, salary: 27_000, overpayment: 1_200 };

  it("blames the interest rate when the money could earn more elsewhere", () => {
    const inputs = { ...big, rpi: 0.03, investReturn: 0.05 }; // 3% loan vs 5% elsewhere
    expect(why(compareOverpaying(inputs), inputs)).toBe("rate");
  });

  it("blames the write-off when the loan costs more than investing earns but overpaying still loses", () => {
    const inputs = { ...big, rpi: 0.05, investReturn: 0.03 }; // 5% loan vs 3% elsewhere
    expect(why(compareOverpaying(inputs), inputs)).toBe("write-off");
  });

  it("says it saves when you'd clear the loan anyway at a high rate", () => {
    const inputs = { ...base, plan: "postgrad" as const, balance: 10_000, salary: 60_000, rpi: 0.04, overpayment: 2_000 };
    expect(why(compareOverpaying(inputs), inputs)).toBe("saves");
  });

  it("calls tiny differences a close call", () => {
    const inputs = { ...base, overpayment: 10 };
    expect(why(compareOverpaying(inputs), inputs)).toBe("close");
  });
});
