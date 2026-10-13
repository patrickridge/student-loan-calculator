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
    title: "Universities",
    body: "For a chosen university, each subject's pay is scaled by how its graduates earned compared with everyone who studied that subject, five years after graduating (provider-level LEO data), and the pool follows its mix of subjects.",
  },
  {
    title: "Pricing",
    body: "Repayments are valued in today's money at the return an investor wants. The same borrowers run through 120 futures where long-run wage growth and inflation differ, which gives the range and the losses in a bad future.",
  },
];

const QUESTIONS = [
  {
    q: "Why a 5% return?",
    a: "It's a starting point, not a market price. A buyer sets the return they want: close to what UK government bonds pay if they see the loans as safe and government-backed, more if they're worried about the 40-year wait, rule changes or how little is known about later careers. The government values its own loans with a lower rate set by the Treasury, which is one reason its valuations come out higher than sale prices. Move the slider to see how much the answer depends on it.",
  },
  {
    q: "Why does it show more people repaying in full than the government expects?",
    a: "The earnings data stops at ten years after graduation, so everything after that is an assumption. The model also leaves out deaths, disability write-offs, borrowers who move abroad for good (beyond the share the data shows with no UK earnings) and those who never start repaying. The government models age, part-time work and career breaks in much more detail. So treat this as a little optimistic.",
  },
  {
    q: "Does a university cause its graduates to earn more?",
    a: "Not necessarily. Comparing within subject removes the effect of which subjects a university teaches, but its graduates still differ in grades, family background and where they live afterwards (London pay is higher). So a university's figure shows what its graduates earn, not what it adds. That's also why grades and university can't be used together here: it would count the same thing twice.",
  },
  {
    q: "Where does the earnings data come from?",
    a: "The Department for Education's Longitudinal Education Outcomes (LEO) data: university records matched to HMRC tax records, including self-employment. It covers UK earnings only. The quartiles are for graduates in sustained employment; the rest (out of work, studying, abroad, caring) are counted as earning nothing that year, at the rate the data shows.",
  },
  {
    q: "How were the real loan sales structured?",
    a: "In December 2017 about £3.5bn of pre-2012 loans were securitised: asset-backed securities backed by the loans' repayments, arranged by Barclays, which raised about £1.7bn. A second sale followed in 2018. The tranches here are illustrative rather than copies of those deals.",
  },
  {
    q: "What's different about Plan 2?",
    a: "A higher threshold, interest of up to RPI + 3% for higher earners, and write-off after 30 years rather than 40. Fewer borrowers clear the loan, but those who do pay more interest, so the price per £1 ends up similar while the cash comes from a narrower group of high earners.",
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

        <section className="mt-16 max-w-3xl space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Assumptions and questions</h2>
          <div className="divide-y rounded-xl border bg-card">
            {QUESTIONS.map(({ q, a }) => (
              <div key={q} className="px-4 py-3">
                <h3 className="font-medium">{q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
