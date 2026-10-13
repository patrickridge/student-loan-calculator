import { describe, expect, it } from "vitest";

import earnings from "./earnings.json";
import { bySubject, central, DEFAULTS, presentValue, profile, simulatePool, tranche, TRANCHES, valuePool, yieldAt } from "./portfolio";

const ALL = { subject: null, attainment: null };
const small = { borrowers: 400, futureCount: 30 };

describe("earnings profile", () => {
  const computing = earnings.subjects.find((s) => s.name === "Computing")!;
  const p = profile(computing, 1, 40);

  it("matches the published medians, uprated to 2026-27 pay", () => {
    for (const y of [1, 3, 5, 10] as const) {
      expect(Math.exp(p.logMedian[y]) / computing.years[y].median).toBeCloseTo(1.26, 2);
    }
  });

  it("keeps rising after ten years, then levels off and dips late in a career", () => {
    expect(p.logMedian[20]).toBeGreaterThan(p.logMedian[10]);
    expect(p.logMedian[40]).toBeLessThan(p.logMedian[25]);
    expect(p.working[40]).toBeLessThan(p.working[10]);
  });
});

describe("pricing", () => {
  it("turns a yield back into the same price", () => {
    const stream = [0.1, 0.1, 0.1, 0.1, 0.8];
    expect(presentValue(stream, yieldAt(stream, 0.9))).toBeCloseTo(0.9, 6);
  });

  it("values loans less when future money is worth less", () => {
    const at = (discountRate: number) => valuePool({ ...DEFAULTS, discountRate }, ALL, small).value;
    expect(at(0.08)).toBeLessThan(at(0.05));
    expect(at(0.05)).toBeLessThan(at(0.02));
  });

  it("values a bigger balance at less per pound, since more of it is written off", () => {
    const at = (balance: number) => valuePool({ ...DEFAULTS, balance }, ALL, small).value;
    expect(at(70_000)).toBeLessThan(at(30_000));
  });

  it("collects nothing from borrowers who never earn above the threshold", () => {
    const pool = simulatePool({ ...DEFAULTS }, ALL, 50, [{ wageGrowth: Array(40).fill(-0.5), rpi: Array(40).fill(0.03) }]);
    expect(pool.cashMultiple).toBeLessThan(0.05);
  });

  it("ranks high-earning subjects above low-earning ones", () => {
    const rows = bySubject(DEFAULTS, { attainment: null }, 200);
    const value = (name: string) => rows.find((r) => r.subject === name)!.value;
    expect(value("Medicine and dentistry")).toBeGreaterThan(value("Creative arts and design"));
    expect(value("Economics")).toBeGreaterThan(value("Performing arts"));
  });
});

describe("tranches", () => {
  const pool = simulatePool(DEFAULTS, ALL, 400, [central(DEFAULTS, 40)]);
  const results = tranche(pool.cash, TRANCHES, DEFAULTS.discountRate);

  it("hands out exactly the pool's cash, senior first", () => {
    const total = pool.cash[0].reduce((s, c) => s + c, 0);
    expect(total).toBeCloseTo(pool.cashMultiple, 6);
    expect(results[0].expectedLoss).toBeLessThanOrEqual(results[1].expectedLoss);
    expect(results[1].expectedLoss).toBeLessThanOrEqual(results[2].expectedLoss);
  });

  it("sizes the equity as whatever the debt tranches leave", () => {
    expect(results.reduce((s, t) => s + t.size, 0)).toBeCloseTo(1, 9);
  });
});

describe("rule changes", () => {
  const at = (policy: (typeof DEFAULTS)["policy"]) => valuePool({ ...DEFAULTS, policy }, ALL, small).value;
  const today = at("current");

  it("make loans worth more when borrowers pay sooner or longer", () => {
    expect(at("freeze-forever")).toBeGreaterThan(today); // more pay above a threshold that never rises
    expect(at("interest-plus-3")).toBeGreaterThan(today); // high earners repay more interest
  });

  it("make loans worth less when they're written off sooner", () => {
    expect(at("write-off-30")).toBeLessThan(today);
  });
});

describe("universities", () => {
  it("values loans to a high-earning university's graduates above a low-earning one's", () => {
    const at = (university: string) => valuePool(DEFAULTS, { subject: null, attainment: null, university }, small).value;
    expect(at("London School of Economics and Political Science")).toBeGreaterThan(at("University College Birmingham"));
  });

  it("only lists subjects a university has published figures for", () => {
    const rows = bySubject(DEFAULTS, { attainment: null, university: "London School of Economics and Political Science" }, 100);
    expect(rows.map((r) => r.subject)).not.toContain("Medicine and dentistry");
  });
});

describe("price and return", () => {
  it("gives a lower return the more a buyer pays", () => {
    const curve = valuePool(DEFAULTS, ALL, small).priceCurve;
    for (let i = 1; i < curve.length; i++) expect(curve[i].yield).toBeLessThan(curve[i - 1].yield);
  });
});
