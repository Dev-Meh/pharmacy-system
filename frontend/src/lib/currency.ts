/** Format amount as Tanzanian Shilling — whole numbers only. */
export function formatTzs(amount: number | string): string {
  const value = Math.round(Number(amount) || 0);
  return `TZS ${value.toLocaleString("en-US")}`;
}

/** Parse user input to a whole-number amount for API payloads. */
export function parseTzsAmount(value: number | string): number {
  return Math.max(0, Math.round(Number(value) || 0));
}
