import Link from "next/link";

import { Calculator } from "@/components/Calculator";
import { REPO, SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EXPLAINERS = [
  {
    title: "Repayments follow your salary",
    body: "You repay 9% of what you earn above your plan's threshold (6% for Postgraduate Loans), taken through your payslip. The amount you owe doesn't change what you pay each month.",
  },
  {
    title: "Whatever's left is written off",
    body: "After 25 to 40 years, depending on your plan, the rest is cancelled. If you were never going to clear it, an extra pound paid now is a pound you'd never have had to pay.",
  },
  {
    title: "Money now is worth more than later",
    body: "Overpaying means less to pay in future, but that money could have been earning interest in the meantime. Every payment is converted to today's money using the return you could get instead.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader current="calculator" />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="max-w-2xl">
          <p className="text-sm font-medium text-primary">UK student loans, 2026-27 rules</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Should you overpay your student loan?</h1>
          <p className="mt-3 text-muted-foreground">
            Student loans aren&apos;t like other debt. For many people, paying extra just means paying money
            they&apos;d never have owed. Put in your numbers to see if that&apos;s you.
          </p>
        </section>

        <section className="mt-10">
          <Calculator />
        </section>

        <section id="how-it-works" className="mt-20 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {EXPLAINERS.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Rules for 2026-27 from{" "}
            <a className="underline underline-offset-2" href="https://www.gov.uk/repaying-your-student-loan/what-you-pay">
              GOV.UK
            </a>
            . Plan 2 and Plan 5 thresholds stay frozen as announced, then rise with inflation; Plan 1 and Plan 4
            thresholds rise with inflation each year; the Postgraduate threshold stays at £21,000. Interest follows
            inflation (Plan 2 adds up to 3% depending on income, as does the Postgraduate Loan), capped at 6%.
            Interest is added yearly rather than monthly and pay rises are steady, so treat results as a guide,
            not a forecast.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/portfolio" className="font-medium text-primary underline-offset-4 hover:underline">
              What are thousands of these loans worth to an investor? →
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>A personal project, not financial advice. Check your exact balance and rate in your Student Loans Company account.</p>
          <a href={REPO} className="hover:text-foreground">
            Source on GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
