"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";

import { NumberField, SliderField } from "@/components/fields";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gbp, taxYear } from "@/lib/format";
import { compareOverpaying, currentRate, why, type Comparison, type Inputs, type Result } from "@/lib/loan";
import { PLANS, type PlanId } from "@/lib/rules";

// Neutral example figures; everything is editable.
const START: Inputs = {
  plan: "plan5",
  balance: 45_000,
  salary: 30_000,
  salaryGrowth: 0.04,
  rpi: 0.03,
  firstRepayYear: 2027,
  overpayment: 1_200, // £100 a month
  investReturn: 0.05,
};

const PLAN_ITEMS = Object.values(PLANS).map((p) => ({ value: p.id, label: p.name }));

const chartConfig = {
  without: { label: "Paying only what's due", color: "var(--chart-2)" },
  with: { label: "With extra payments", color: "var(--chart-1)" },
} satisfies ChartConfig;

function percent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function outcome(result: Result, inputs: Inputs): string {
  if (result.clearedIn !== null) return `Paid off in ${taxYear(result.clearedIn)}`;
  return `${gbp(result.writtenOff)} written off in ${inputs.firstRepayYear + PLANS[inputs.plan].writeOffYears}`;
}

export function Calculator() {
  const [inputs, setInputs] = useState<Inputs>(START);
  const set = (key: keyof Inputs) => (value: number) => setInputs((prev) => ({ ...prev, [key]: value }));
  const setPercent = (key: keyof Inputs) => (value: number) => set(key)(value / 100);

  const comparison = useMemo(() => compareOverpaying(inputs), [inputs]);
  const monthly = Math.round(inputs.overpayment / 12);
  const plan = PLANS[inputs.plan];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>Your loan</CardTitle>
          <CardDescription>Your balance is in your Student Loans Company account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="plan">Repayment plan</Label>
            <Select
              items={PLAN_ITEMS}
              value={inputs.plan}
              onValueChange={(value) => value && setInputs((prev) => ({ ...prev, plan: value as PlanId }))}
            >
              <SelectTrigger id="plan" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{plan.who}</p>
          </div>
          <NumberField id="balance" label="What you owe now" prefix="£" step={500} value={inputs.balance} onChange={set("balance")} />
          <SliderField
            id="salary"
            label="Salary before tax"
            prefix="£"
            suffix="a year"
            step={1_000}
            max={150_000}
            value={inputs.salary}
            onChange={set("salary")}
          />
          <SliderField
            id="extra"
            label="Extra payment"
            prefix="£"
            suffix="a month"
            step={10}
            max={1_000}
            value={monthly}
            onChange={(value) => set("overpayment")(value * 12)}
          />
          <NumberField
            id="first-repay"
            label="First April you're due to repay"
            min={1990}
            max={2040}
            value={inputs.firstRepayYear}
            onChange={set("firstRepayYear")}
            hint="Usually the April after you finish your course."
          />
          <Accordion>
            <AccordionItem value="assumptions">
              <AccordionTrigger>Assumptions</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1">
                <NumberField id="growth" label="Pay rises" suffix="% a year" step={0.5} value={inputs.salaryGrowth * 100} onChange={setPercent("salaryGrowth")} />
                <NumberField
                  id="rpi"
                  label="Inflation (RPI)"
                  suffix="% a year"
                  step={0.5}
                  value={inputs.rpi * 100}
                  onChange={setPercent("rpi")}
                  hint="Sets the interest rate and how thresholds rise."
                />
                <NumberField
                  id="return"
                  label="What the money could earn instead"
                  suffix="% a year"
                  step={0.5}
                  value={inputs.investReturn * 100}
                  onChange={setPercent("investReturn")}
                  hint="For example a savings account or index fund."
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Verdict comparison={comparison} inputs={inputs} monthly={monthly} />
        <ComparisonCard comparison={comparison} inputs={inputs} monthly={monthly} />
        <Card>
          <Tabs defaultValue="chart">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>What you owe</CardTitle>
                <CardDescription>At the end of each tax year</CardDescription>
              </div>
              <TabsList>
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="chart">
                <BalanceChart comparison={comparison} showWith={monthly > 0} />
              </TabsContent>
              <TabsContent value="table">
                <YearTable result={monthly > 0 ? comparison.with : comparison.without} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function Verdict({ comparison, inputs, monthly }: { comparison: Comparison; inputs: Inputs; monthly: number }) {
  if (monthly === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3">
          <Scale className="size-5 text-muted-foreground" />
          <p className="font-medium">Add an extra monthly payment to see whether it&apos;s worth it.</p>
        </CardContent>
      </Card>
    );
  }

  const reason = why(comparison, inputs);
  const amount = gbp(Math.abs(comparison.saving));
  const rates = `Your loan charges about ${percent(currentRate(inputs))} interest, and the money could earn ${percent(inputs.investReturn)} instead`;
  const look = {
    close: { icon: Scale, tone: "text-foreground", accent: "border-l-slate-400", title: "Overpaying makes little difference" },
    saves: { icon: TrendingUp, tone: "text-emerald-700", accent: "border-l-emerald-500", title: `Overpaying would save you about ${amount}` },
    rate: { icon: TrendingDown, tone: "text-amber-700", accent: "border-l-amber-500", title: `Overpaying would cost you about ${amount}` },
    "write-off": { icon: TrendingDown, tone: "text-amber-700", accent: "border-l-amber-500", title: `Overpaying would cost you about ${amount}` },
  }[reason];
  const explanation = {
    close: `${rates}, so the two roughly cancel out.`,
    saves: `${rates}, so clearing the loan sooner saves more than investing would earn.`,
    rate: `${rates}, so you're better off keeping the money.`,
    "write-off": `Without overpaying, ${gbp(comparison.without.writtenOff)} would be written off. Extra payments mostly cover money you'd never have had to pay.`,
  }[reason];
  const Icon = look.icon;

  return (
    <Card className={`border-l-4 ${look.accent}`}>
      <CardContent className="space-y-2">
        <div className={`flex items-center gap-2 ${look.tone}`}>
          <Icon className="size-6 shrink-0" />
          <p className="text-2xl font-semibold tracking-tight">{look.title}</p>
        </div>
        <p className="text-sm text-foreground/80">{explanation}</p>
        <p className="text-xs text-muted-foreground">
          Measured in today&apos;s money, comparing {gbp(monthly)} a month in extra payments with keeping it.
        </p>
      </CardContent>
    </Card>
  );
}

function ComparisonCard({ comparison, inputs, monthly }: { comparison: Comparison; inputs: Inputs; monthly: number }) {
  const columns = [
    { title: "Paying only what's due", result: comparison.without },
    ...(monthly > 0 ? [{ title: `With ${gbp(monthly)} a month extra`, result: comparison.with }] : []),
  ];
  return (
    <Card>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="w-1/3 pb-3 font-normal" />
              {columns.map((c) => (
                <th key={c.title} className="pb-3 font-medium text-foreground">
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-t">
              <td className="py-3 text-muted-foreground">Cost in today&apos;s money</td>
              {columns.map((c) => (
                <td key={c.title} className="py-3 text-lg font-semibold">
                  {gbp(c.result.presentValue)}
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <td className="py-3 text-muted-foreground">Total actually paid</td>
              {columns.map((c) => (
                <td key={c.title} className="py-3">
                  {gbp(c.result.totalPaid)}
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <td className="py-3 text-muted-foreground">How it ends</td>
              {columns.map((c) => (
                <td key={c.title} className="py-3">
                  {outcome(c.result, inputs)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function BalanceChart({ comparison, showWith }: { comparison: Comparison; showWith: boolean }) {
  const data = comparison.without.years.map((year, i) => ({
    year: year.taxYear,
    without: Math.round(year.balance),
    with: Math.round(comparison.with.years[i]?.balance ?? 0),
  }));
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} minTickGap={32} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `£${Math.round(v / 1000)}k`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => taxYear(Number(payload?.[0]?.payload?.year))}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig].label}</span>
                  <span className="font-medium tabular-nums">{gbp(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Area dataKey="without" type="monotone" stroke="var(--color-without)" fill="var(--color-without)" fillOpacity={0.12} strokeWidth={2} />
        {showWith && (
          <Area dataKey="with" type="monotone" stroke="var(--color-with)" fill="var(--color-with)" fillOpacity={0.12} strokeWidth={2} />
        )}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}

function YearTable({ result }: { result: Result }) {
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-right text-sm tabular-nums">
        <thead className="sticky top-0 bg-card text-muted-foreground">
          <tr>
            <th className="py-2 text-left font-medium">Tax year</th>
            <th className="py-2 font-medium">Salary</th>
            <th className="py-2 font-medium">Interest</th>
            <th className="py-2 font-medium">Paid</th>
            <th className="py-2 font-medium">Owed after</th>
          </tr>
        </thead>
        <tbody>
          {result.years.map((y) => (
            <tr key={y.taxYear} className="border-t">
              <td className="py-1.5 text-left">{taxYear(y.taxYear)}</td>
              <td className="py-1.5">{gbp(y.salary)}</td>
              <td className="py-1.5">{gbp(y.interest)}</td>
              <td className="py-1.5">{gbp(y.required + y.extra)}</td>
              <td className="py-1.5">{gbp(y.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
