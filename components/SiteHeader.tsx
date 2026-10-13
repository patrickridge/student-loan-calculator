import Link from "next/link";

export const REPO = "https://github.com/patrickridge/student-loan-calculator";

/** Header shared by the calculator and the portfolio page. */
export function SiteHeader({ current }: { current: "calculator" | "portfolio" }) {
  const link = (active: boolean) => (active ? "text-foreground" : "hover:text-foreground");
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">£</span>
          <span className="hidden sm:inline">Overpay or not?</span>
        </Link>
        <nav className="flex gap-5 text-sm text-muted-foreground">
          <Link href="/" className={link(current === "calculator")}>
            Calculator
          </Link>
          <Link href="/portfolio" className={link(current === "portfolio")}>
            Loan portfolio
          </Link>
          <a href={REPO} className="hover:text-foreground">
            Source
          </a>
        </nav>
      </div>
    </header>
  );
}
