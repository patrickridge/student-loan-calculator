"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { SliderField } from "@/components/fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gbp } from "@/lib/format";
import { ATTAINMENT_GROUPS, type Assumptions, bySubject, DEFAULTS, type PoolPlan, SUBJECT_NAMES, valuePool, yieldAt } from "@/lib/portfolio";

const ANY = "all";
const PLAN_ITEMS = [
  { value: "plan5", label: "Plan 5 (England, from 2023)" },
  { value: "plan2", label: "Plan 2 (England, 2012 to 2023)" },
];
const SUBJECT_ITEMS = [{ value: ANY, label: "All subjects, in real proportions" }, ...SUBJECT_NAMES.map((s) => ({ value: s, label: s }))];
const GRADE_ITEMS = [{ value: ANY, label: "All grades" }, ...ATTAINMENT_GROUPS.map((g) => ({ value: g, label: g === "BTEC" ? "BTEC" : `A levels: ${g}` }))];

// The 2017 sale of older (pre-2012) English loans: 48p for every £1 of balance (National Audit Office).
const SALE_PRICE = 0.48;

const pence = (v: number) => `${Math.round(v * 100)}p`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const chartConfig = { cash: { label: "Repaid", color: "var(--chart-1)" } } satisfies ChartConfig;

export function Portfolio() {
  const [a, setA] = useState<Assumptions>(DEFAULTS);
  const [subject, setSubject] = useState<string>(ANY);
  const [grade, setGrade] = useState<string>(ANY);
  const set = (key: keyof Assumptions) => (value: number) => setA((prev) => ({ ...prev, [key]: value }));
  const setPercent = (key: keyof Assumptions) => (value: number) => set(key)(value / 100);

  const mix = useMemo(() => ({ subject: subject === ANY ? null : subject, attainment: grade === ANY ? null : grade }), [subject, grade]);
  const valuation = useMemo(() => valuePool(a, mix), [a, mix]);
  const subjects = useMemo(() => bySubject(a, mix.attainment), [a, mix.attainment]);
  const saleYield = yieldAt(valuation.averageCash, SALE_PRICE);
  const chart = valuation.averageCash.map((c, t) => ({ year: 2027 + t, cash: Math.round(c * 1000) / 10 }));
  const best = subjects[0].value;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>The pool</CardTitle>
          <CardDescription>1,500 borrowers who graduate in 2026, run through 120 possible futures for pay and inflation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Choice id="plan" label="Loan plan" items={PLAN_ITEMS} value={a.plan} onChange={(v) => setA((p) => ({ ...p, plan: v as PoolPlan }))} />
          <Choice id="subject" label="Degree subject" items={SUBJECT_ITEMS} value={subject} onChange={setSubject} />
          <Choice id="grade" label="Grades before university" items={GRADE_ITEMS} value={grade} onChange={setGrade} />
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
              <p className="text-4xl font-semibold tracking-tight tabular-nums">{pence(valuation.value)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pence(valuation.low)} in a bad future, {pence(valuation.high)} in a good one (1 in 20 either way), at a {Math.round(a.discountRate * 1000) / 10}% return.
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Stat label="Repay in full" value={pct(valuation.repaidInFull)} note="before the rest is written off" />
              <Stat label="Cash collected" value={`${valuation.cashMultiple.toFixed(2)}×`} note="the amount lent, over the loans' life" />
              <Stat label={`Return if bought at ${pence(SALE_PRICE)}`} value={`${(saleYield * 100).toFixed(1)}%`} note="the price the 2017 sale got" />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>When the money comes back</CardTitle>
            <CardDescription>Repaid each year, as a share of the amount lent, averaged over all futures.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
              <AreaChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} interval={4} />
                <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `${p?.[0]?.payload?.year}-${String(((p?.[0]?.payload?.year ?? 0) + 1) % 100).padStart(2, "0")}`} formatter={(v) => `${v}% of the amount lent`} />} />
                <Area dataKey="cash" type="monotone" stroke="var(--color-cash)" fill="var(--color-cash)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tranches</CardTitle>
            <CardDescription>
              The pool&apos;s cash paid out in order: the senior slice is paid first, the equity gets what&apos;s left, so it takes the first losses.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
                    <td className="py-2 font-medium">
                      {t.name}
                      {t.name !== "Equity" && <span className="block text-xs font-normal text-muted-foreground">{t.name === "Senior" ? "4.5%" : "7%"} a year promised</span>}
                    </td>
                    <td className="py-2">{pct(t.size)}</td>
                    <td className="py-2">{pct(t.paidInFull)}</td>
                    <td className="py-2">{pct(t.expectedLoss)}</td>
                    <td className="py-2">{pct(t.badLoss)}</td>
                    <td className="py-2 text-right">{(t.returnAtFace * 100).toFixed(1)}% a year</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              &ldquo;Paid in full&rdquo; for the equity means getting back at least its share of the pool. Returns are after losses, on the
              average cash across futures. A bad future is the worst 1 in 20. Slice sizes and promised rates are illustrative.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By degree subject</CardTitle>
            <CardDescription>
              Same assumptions, central future{mix.attainment ? `, ${GRADE_ITEMS.find((g) => g.value === mix.attainment)!.label}` : ""}. Pay is the median ten years after graduating, in 2026-27 money.
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

function Choice(props: { id: string; label: string; items: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Select items={props.items} value={props.value} onValueChange={(v) => v && props.onChange(v as string)}>
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
