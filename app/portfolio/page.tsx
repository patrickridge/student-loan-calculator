import type { Metadata } from "next";

import { Portfolio } from "@/components/Portfolio";
import { REPO, SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULTS, valuePool, yieldAt } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "What is a pool of student loans worth?",
  description: "Prices a pool of UK student loans, and tranches of it, by simulating graduates with real earnings by subject from HMRC tax records.",
};

const STEPS = [
  {
    title: "Real graduate pay",
    body: "Earnings 1, 3, 5 and 10 years after graduating, by subject, from the government's LEO data: tax records matched to university records. It includes how many have no UK earnings at all, and how A-level grades shift pay within each subject.",
  },
  {
    title: "Each borrower's career",
    body: "Each borrower keeps a place in their subject's pay spread that drifts year to year, and some years earn nothing. Pay keeps rising for about 25 years after graduating, then slips behind average and fewer people are working.",
  },
  {
    title: "The loan rules",
    body: "9% of pay above the threshold, interest at RPI (Plan 2 adds up to 3% for higher earners, capped at 6%), thresholds rising with RPI, and write-off after 40 years for Plan 5 or 30 for Plan 2.",
  },
  {
    title: "Pricing",
    body: "Repayments are valued in today's money at the return an investor wants. The same borrowers run through 120 futures where long-run wage growth and inflation differ, which gives the range and the losses in a bad future.",
  },
];

export default function PortfolioPage() {
  // The default case, for comparing with the government's own figures below.
  const base = valuePool(DEFAULTS, { subject: null, attainment: null });
  const saleYield = yieldAt(base.averageCash, 0.48);

  return (
    <>
      <SiteHeader current="portfolio" />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="max-w-2xl">
          <p className="text-sm font-medium text-primary">UK student loans as an investment</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">What is a pool of student loans worth?</h1>
          <p className="mt-3 text-muted-foreground">
            The government owns England&apos;s student loans, and has sold older ones before, for 48p in the pound. This simulates
            thousands of graduates using real earnings by subject from HMRC tax records, and prices the pool, and slices of it,
            the way an investor would.
          </p>
        </section>

        <section className="mt-10">
          <Portfolio />
        </section>

        <section className="mt-20 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">How this compares</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">The government&apos;s sales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  In December 2017 the government sold £3.5bn of pre-2012 loans for £1.7bn, 48p per £1, and £3.9bn more in 2018 for £1.9bn.
                  The National Audit Office found the Department for Education&apos;s own valuation of the first batch was £2.6bn.
                </p>
                <p>
                  Those were older loans with lower repayment thresholds and many already repaid, so they aren&apos;t directly comparable,
                  but the price shows the high return buyers wanted. Buying this model&apos;s default Plan 5 pool at 48p would return about{" "}
                  {(saleYield * 100).toFixed(1)}% a year.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">The government&apos;s forecasts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  The Department for Education forecasts that around 30–33% of new Plan 5 lending won&apos;t be repaid in today&apos;s money, and
                  its estimate of how many recent starters repay in full has been 56–65%.
                </p>
                <p>
                  With the default settings this model has {Math.round(base.repaidInFull * 100)}% repaying in full. Its earnings data stops at ten
                  years after graduation, so later careers are an assumption, and it leaves out deaths, disability and borrowers who
                  never start repaying, which all push the government&apos;s figure lower.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-16 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <Card key={s.title}>
                <CardHeader>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
              </Card>
            ))}
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Sources: Department for Education, Graduate labour market outcomes (LEO), 2021-22 tax year, uprated by about 26% to 2026-27
            pay; National Audit Office, The sale of student loans (2018); Department for Education, Student loan forecasts for England.
            Tranche sizes and promised returns are illustrative. A model, not investment advice.
          </p>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>A personal project, not financial advice.</p>
          <a href={REPO} className="hover:text-foreground">
            Source on GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
