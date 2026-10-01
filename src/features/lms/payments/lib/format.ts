/** A payment amount as the course pages show prices ("ل.س 150,000" / "150,000 SYP"). */
export function formatAmount(amount: number, currency: string, ar: boolean) {
  const n = Number(amount).toLocaleString("en-US");
  if (currency === "SYP") return ar ? `‎ل.س ${n}` : `${n} SYP`;
  return `${n} ${currency}`;
}
