const pounds = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

/** £12,345 */
export function gbp(value: number): string {
  return pounds.format(Math.round(value));
}

/** 2026 -> "2026-27" */
export function taxYear(start: number): string {
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
