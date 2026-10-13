# Should you overpay your student loan?

[![CI](https://github.com/patrickridge/student-loan-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/patrickridge/student-loan-calculator/actions/workflows/ci.yml)

Live site: https://student-loan-repayment.vercel.app

A calculator for UK student loans. Put in your plan, balance and salary, and it tells you whether paying extra each month would save you money, or whether you'd just be paying off debt that gets written off anyway.

<img src="docs/screenshot.jpg" alt="The calculator: inputs on the left, verdict and comparison on the right" width="720">

## Why

Most people treat a student loan like any other debt and want it gone. But it works more like a 9% tax on earnings above a threshold, which stops when the loan is cleared or written off after 25 to 40 years. Whether overpaying makes sense depends on whether you'd ever clear it, and on whether the loan's interest is higher than what the money could earn elsewhere. That's a calculation, not a feeling, so I built it.

## How it works

**Rules.** Thresholds, repayment rates, interest and write-off terms for Plans 1, 2, 4, 5 and the Postgraduate Loan, for the 2026-27 tax year, from GOV.UK. Each figure is in `lib/rules.ts` with its source. Plan 2 and Plan 5 thresholds follow the freezes in the Department for Education's forecasts, then rise with inflation.

**Projection.** `lib/loan.ts` steps through the loan a tax year at a time: add a year's interest to what you owe, take 9% of salary above the threshold (6% for Postgraduate Loans) plus any extra payment, and stop when it's paid off or the write-off date arrives.

**The comparison.** Paying extra means paying more now and less later. To compare the two fairly, every payment is converted to today's money by discounting it at the return you could earn instead (3.5% a year by default, about what a good savings account pays in October 2026; there are quick options for a fixed saver or cash ISA at 4% and an index fund at 6%):

```
cost = Σ payment in year t / (1 + r)^t
```

Overpaying is worth it if it lowers that cost. The app also says why: if the loan's interest rate is below `r`, paying early loses whatever happens; if it's above and overpaying still loses, the write-off is the reason.

## Limitations

- Interest is added once a year, not monthly, and payments come at the end of the year.
- Inflation, pay rises and investment returns are single numbers you choose. Real ones move.
- Plans 1 and 4 actually charge the lower of RPI and the Bank of England rate plus 1%; this uses RPI.
- The 6% interest cap is assumed to stay. Write-off at age 65 for very old Plan 1 and Plan 4 loans isn't modelled.
- It's a guide, not financial advice.

## What is a pool of these loans worth?

A second page, [/portfolio](https://student-loan-repayment.vercel.app/portfolio), looks at the other side: the government owns these loans and has sold older ones, in 2017 for 48p per £1 of balance. It prices a pool of loans the way an investor would.

**Earnings by subject.** From the Department for Education's LEO data (HMRC tax records matched to university records), for UK first-degree graduates in 2021-22: earnings quartiles 1, 3, 5 and 10 years after graduation for 34 subjects, the share with any UK earnings, and how A-level grades move pay within each subject. `scripts/build-earnings.mjs` turns the published file into `lib/earnings.json`.

**Borrowers.** Each simulated borrower takes their subject's pay path, uprated to 2026-27 pay, with their own place in the pay spread that drifts from year to year, and some years with no UK earnings. After the data runs out at ten years, pay keeps rising with experience until about 25 years, then slips behind average while fewer people work.

**Futures.** The same 1,500 borrowers run through 120 futures in which long-run wage growth and inflation differ, so the spread of outcomes comes from the economy rather than from sampling noise.

**Universities.** From the provider-level LEO data, each university's graduates' median pay five years out is compared with everyone who studied the same subject; the model scales pay by that ratio and builds the pool from the university's mix of subjects (`scripts/build-universities.py`, 154 universities). It shows what a university's graduates earn, not what the university adds, so it isn't combined with grades.

**Rule changes.** The threshold frozen until 2030 or for good, write-off after 30 years instead of 40, or interest at RPI + 3%, each shown against today's rules.

**Pricing and tranches.** Each future's repayments are valued in today's money at the return an investor wants, giving a price per £1 and a range, and a curve of the return at each purchase price. The yearly cash (average, bad and good futures) downloads as CSV. The cash is then paid down three slices in order (senior, mezzanine, equity), with sizes and promised rates you can change, showing how often each is paid in full, its average loss and its loss in a bad future.

With the default settings a Plan 5 pool is worth about 62p per £1 at a 5% return, and about two-thirds of borrowers repay in full. That compares with the government's forecast of 56-65%. The model leaves out deaths, disability and borrowers who never start repaying, so it's a little optimistic. Subject matters a great deal: around 80p per £1 for Medicine or Economics, under 50p for Creative arts or Education.

## Running it locally

Needs Node 24.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Checks

```bash
npm test            # unit tests for the rules and the projection
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs all four on every push. The projection was also checked against an independent spreadsheet model and matched to the penny.

## Code layout

```
lib/rules.ts            Plan rules for 2026-27, with sources
lib/loan.ts             Year-by-year projection and the overpay comparison (no UI)
lib/loan.test.ts        Tests with hand-checkable numbers
lib/portfolio.ts        Pool of loans: borrowers, futures, pricing, tranches
lib/earnings.json       Graduate earnings by subject (built by scripts/build-earnings.mjs)
lib/universities.json   Graduate pay by university and subject (built by scripts/build-universities.py)
components/Calculator.tsx   The calculator
components/Portfolio.tsx    The portfolio page
components/fields.tsx   Number inputs and sliders
components/ui/          shadcn/ui components
app/page.tsx            Page layout and explainer
```

Built with Next.js, TypeScript, Tailwind CSS, shadcn/ui and Recharts. Everything runs in the browser, so the site is static and nothing you type is sent anywhere.

## What I'd do next

1. Monthly interest and payments, to match the Student Loans Company's own figures more closely.
2. Ranges instead of single guesses: run many paths for pay and inflation and show how often overpaying wins.
3. Let people paste their annual statement and fill in the numbers.

## Licence

MIT. See [LICENSE](LICENSE).
