"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts";

import { NumberField, SliderField } from "@/components/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gbp, taxYear } from "@/lib/format";
import {
  ATTAINMENT_GROUPS,
  type Assumptions,
  bySubject,
  DEFAULTS,
  POLICIES,
  type PolicyId,
  type PoolPlan,
  SUBJECT_NAMES,
  type Tranche,
  UNIVERSITY_NAMES,
  valuePool,
  yieldAt,
} from "@/lib/portfolio";

const ANY = "all";
const PLAN_ITEMS = [
  { value: "plan5", label: "Plan 5 (England, from 2023)" },
  { value: "plan2", label: "Plan 2 (England, 2012 to 2023)" },
];
const POLICY_ITEMS = Object.entries(POLICIES).map(([value, p]) => ({ value, label: p.label }));
const SUBJECT_ITEMS = [{ value: ANY, label: "All subjects, in real proportions" }, ...SUBJECT_NAMES.map((s) => ({ value: s, label: s }))];
const GRADE_ITEMS = [{ value: ANY, label: "All grades" }, ...ATTAINMENT_GROUPS.map((g) => ({ value: g, label: g === "BTEC" ? "BTEC" : `A levels: ${g}` }))];
const UNIVERSITY_ITEMS = [{ value: ANY, label: "All universities" }, ...UNIVERSITY_NAMES.map((u) => ({ value: u, label: u }))];

// The 2017 sale of older (pre-2012) English loans: 48p for every £1 of balance (National Audit Office).
const SALE_PRICE = 0.48;

const pence = (v: number) => `${Math.round(v * 100)}p`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const rate = (v: number) => `${(v * 100).toFixed(1)}%`;
const cashConfig = {
  cash: { label: "Average", color: "var(--chart-1)" },
  range: { label: "Bad to good future", color: "var(--chart-1)" },
} satisfies ChartConfig;
const priceConfig = { yield: { label: "Return", color: "var(--chart-2)" } } satisfies ChartConfig;

export function Portfolio() {
  const [a, setA] = useState<Assumptions>(DEFAULTS);
  const [subject, setSubject] = useState<string>(ANY);
  const [grade, setGrade] = useState<string>(ANY);
  const [university, setUniversity] = useState<string>(ANY);
  const [slices, setSlices] = useState({ senior: 0.3, seniorRate: 0.045, mezz: 0.2, mezzRate: 0.07 });
  const set = (key: keyof Assumptions) => (value: number) => setA((prev) => ({ ...prev, [key]: value }));
  const setPercent = (key: keyof Assumptions) => (value: number) => set(key)(value / 100);

  const mix = useMemo(
    () => ({ subject: subject === ANY ? null : subject, attainment: grade === ANY ? null : grade, university: university === ANY ? null : university }),
    [subject, grade, university],
  );
  const tranches: Tranche[] = useMemo(
    () => [
      { name: "Senior", size: slices.senior, coupon: slices.seniorRate },
      { name: "Mezzanine", size: slices.mezz, coupon: slices.mezzRate },
      { name: "Equity", size: null, coupon: 0 },
    ],
    [slices],
  );
  const valuation = useMemo(() => valuePool(a, mix, { tranches }), [a, mix, tranches]);
  const baseline = useMemo(() => (a.policy === "current" ? null : valuePool({ ...a, policy: "current" }, mix, { tranches })), [a, mix, tranches]);
  const subjects = useMemo(() => bySubject(a, { attainment: mix.attainment, university: mix.university }), [a, mix.attainment, mix.university]);
  const saleYield = yieldAt(valuation.averageCash, SALE_PRICE);
  const best = subjects[0]?.value ?? 1;

  const cashChart = valuation.averageCash.map((c, t) => ({
    year: 2027 + t,
    cash: Math.round(c * 1000) / 10,
    range: [Math.round(valuation.lowCash[t] * 1000) / 10, Math.round(valuation.highCash[t] * 1000) / 10],
  }));
  const priceChart = valuation.priceCurve.map((p) => ({ price: Math.round(p.price * 100), yield: Math.round(p.yield * 1000) / 10 }));

  const download = () => {
    const rows = [
      ["tax_year", "average_repaid_per_1_lent", "bad_future_per_1_lent", "good_future_per_1_lent"],
      ...valuation.averageCash.map((c, t) => [taxYear(2027 + t), c.toFixed(5), valuation.lowCash[t].toFixed(5), valuation.highCash[t].toFixed(5)]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n") + "\n"], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "student-loan-pool-cash-flows.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>The pool</CardTitle>
          <CardDescription>1,500 borrowers who graduate in 2026, run through 120 possible futures for pay and inflation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Choice id="plan" label="Loan plan" items={PLAN_ITEMS} value={a.plan} onChange={(v) => setA((p) => ({ ...p, plan: v as PoolPlan }))} />
          <Choice id="policy" label="Rules" items={POLICY_ITEMS} value={a.policy} onChange={(v) => setA((p) => ({ ...p, policy: v as PolicyId }))} />
          <Choice id="subject" label="Degree subject" items={SUBJECT_ITEMS} value={subject} onChange={setSubject} />
          <Choice
            id="university"
            label="University"
            items={UNIVERSITY_ITEMS}
            value={university}
            onChange={(v) => {
              setUniversity(v);
              if (v !== ANY) setGrade(ANY);
            }}
          />
          <Choice
            id="grade"
            label="Grades before university"
            items={GRADE_ITEMS}
            value={grade}
            onChange={setGrade}
            disabled={university !== ANY}
            hint={university !== ANY ? "Not used with a university: its figures already reflect who it admits." : undefined}
          />
          <SliderField
            id="balance"
            label="Average balance"
            prefix="£"
            value={a.balance}
            onChange={set("balance")}
            min={10_000}
            max={100_000}
            step={1_000}
            hint="When repayments start. Around £52,000 for three years of fees and maintenance."
          />
          <SliderField id="discount" label="Return an investor wants" suffix="% a year" value={Math.round(a.discountRate * 1000) / 10} onChange={setPercent("discountRate")} min={0} max={15} step={0.5} />
          <SliderField id="wages" label="Wage growth" suffix="% a year" value={Math.round(a.wageGrowth * 1000) / 10} onChange={setPercent("wageGrowth")} min={0} max={8} step={0.1} />
          <SliderField id="rpi" label="Inflation (RPI)" suffix="% a year" value={Math.round(a.rpi * 1000) / 10} onChange={setPercent("rpi")} min={0} max={8} step={0.1} />
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-6">
        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Worth today, per £1 lent</p>
              <p className="flex flex-wrap items-baseline gap-x-3 text-4xl font-semibold tracking-tight tabular-nums">
                {pence(valuation.value)}
                {baseline && (
                  <span className={`text-base font-medium ${Math.round(valuation.value * 100) === Math.round(baseline.value * 100) ? "text-muted-foreground" : valuation.value < baseline.value ? "text-red-700" : "text-emerald-700"}`}>
                    {Math.round(valuation.value * 100) === Math.round(baseline.value * 100)
                      ? "same as today's rules"
                      : `${valuation.value < baseline.value ? "−" : "+"}${pence(Math.abs(valuation.value - baseline.value))} on today's rules`}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pence(valuation.low)} in a bad future, {pence(valuation.high)} in a good one (1 in 20 either way), at a {rate(a.discountRate)} return.
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Repay in full" value={pct(valuation.repaidInFull)} note="before the rest is written off" />
              <Stat label="Cash collected" value={`${valuation.cashMultiple.toFixed(2)}×`} note="the amount lent, over the loans' life" />
              <Stat label="Average life" value={`${valuation.averageLife.toFixed(1)} years`} note="until a pound repaid comes back" />
              <Stat label={`Return if bought at ${pence(SALE_PRICE)}`} value={rate(saleYield)} note="the price the 2017 sale got" />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>When the money comes back</CardTitle>
              <CardDescription>Repaid each year, as a share of the amount lent. The band runs from a bad future to a good one.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={download}>
              <Download />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cashConfig} className="aspect-auto h-56 w-full">
              <ComposedChart data={cashChart} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} interval={4} />
                <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, p) => taxYear(p?.[0]?.payload?.year ?? 2027)}
                      formatter={(v, name) => (Array.isArray(v) ? `${v[0]}% to ${v[1]}% in bad to good futures` : `${v}% of the amount lent${name === "cash" ? ", on average" : ""}`)}
                    />
                  }
                />
                <Area dataKey="range" type="monotone" stroke="none" fill="var(--color-range)" fillOpacity={0.12} />
                <Line dataKey="cash" type="monotone" stroke="var(--color-cash)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price and return</CardTitle>
            <CardDescription>The yearly return a buyer would make at each price per £1, on the average cash. The dot is the 2017 sale price.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={priceConfig} className="aspect-auto h-52 w-full">
              <LineChart data={priceChart} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="price" type="number" domain={[30, 100]} ticks={[30, 40, 50, 60, 70, 80, 90, 100]} tickFormatter={(v: number) => `${v}p`} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Bought at ${p?.[0]?.payload?.price}p`} formatter={(v) => `${v}% a year`} />} />
                <Line dataKey="yield" type="monotone" stroke="var(--color-yield)" strokeWidth={2} dot={false} />
                <ReferenceDot x={48} y={Math.round(saleYield * 1000) / 10} r={5} fill="var(--foreground)" stroke="white" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tranches</CardTitle>
            <CardDescription>
              The pool&apos;s cash paid out in order: the senior slice first, then the mezzanine, and the equity gets what&apos;s left, so it takes the first losses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField id="senior" label="Senior size" suffix="% of pool" value={Math.round(slices.senior * 100)} onChange={(v) => setSlices((s) => ({ ...s, senior: Math.min(v, 90 - s.mezz * 100) / 100 }))} max={90} />
              <NumberField id="seniorRate" label="Senior rate" suffix="% a year" step={0.5} value={Math.round(slices.seniorRate * 1000) / 10} onChange={(v) => setSlices((s) => ({ ...s, seniorRate: v / 100 }))} max={20} />
              <NumberField id="mezz" label="Mezzanine size" suffix="% of pool" value={Math.round(slices.mezz * 100)} onChange={(v) => setSlices((s) => ({ ...s, mezz: Math.min(v, 90 - s.senior * 100) / 100 }))} max={90} />
              <NumberField id="mezzRate" label="Mezzanine rate" suffix="% a year" step={0.5} value={Math.round(slices.mezzRate * 1000) / 10} onChange={(v) => setSlices((s) => ({ ...s, mezzRate: v / 100 }))} max={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Slice</th>
                    <th className="pb-2 font-medium">Share of pool</th>
                    <th className="pb-2 font-medium">Paid in full</th>
                    <th className="pb-2 font-medium">Average loss</th>
                    <th className="pb-2 font-medium">Loss in a bad future</th>
                    <th className="pb-2 text-right font-medium">Return, bought at face value</th>
                  </tr>
                </thead>
                <tbody className="divide-y tabular-nums">
                  {valuation.tranches.map((t) => (
                    <tr key={t.name}>
                      <td className="py-2 font-medium">{t.name}</td>
                      <td className="py-2">{pct(t.size)}</td>
                      <td className="py-2">{pct(t.paidInFull)}</td>
                      <td className="py-2">{pct(t.expectedLoss)}</td>
                      <td className="py-2">{pct(t.badLoss)}</td>
                      <td className="py-2 text-right">{rate(t.returnAtFace)} a year</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              &ldquo;Paid in full&rdquo; for the equity means getting back at least its share of the pool. Returns are after losses, on the average cash
              across futures. A bad future is the worst 1 in 20.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By degree subject</CardTitle>
            <CardDescription>
              Same assumptions, central future
              {mix.university ? `, graduates of ${mix.university}` : mix.attainment ? `, ${GRADE_ITEMS.find((g) => g.value === mix.attainment)!.label}` : ""}. Pay is the median ten years
              after graduating, in 2026-27 money.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Pay after 10 years</th>
                  <th className="pb-2 font-medium">Repay in full</th>
                  <th className="pb-2 text-right font-medium">Worth per £1</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {subjects.map((s) => (
                  <tr key={s.subject} className={s.subject === mix.subject ? "bg-muted/60" : undefined}>
                    <td className="py-1.5 pr-3">{s.subject}</td>
                    <td className="py-1.5">{gbp(s.medianPay10)}</td>
                    <td className="py-1.5">{pct(s.repaidInFull)}</td>
                    <td className="py-1.5 text-right">
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 rounded-full bg-primary/70 sm:block" style={{ width: `${Math.round((s.value / best) * 400) / 100}rem` }} aria-hidden />
                        {pence(s.value)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Choice(props: { id: string; label: string; items: { value: string; label: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Select items={props.items} value={props.value} onValueChange={(v) => v && props.onChange(v as string)} disabled={props.disabled}>
        <SelectTrigger id={props.id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {props.hint && <p className="text-xs text-muted-foreground">{props.hint}</p>}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{note}</dd>
    </div>
  );
}
