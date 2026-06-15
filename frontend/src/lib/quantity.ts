/** Parse user input to a whole-number quantity for API payloads. */
export function parseQuantity(value: number | string): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

/** Keep only digits while typing — allows an empty field (no stuck zero). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Display quantity as a whole number (no decimals). */
export function formatQuantity(value: number | string): string {
  return Math.round(Number(value) || 0).toLocaleString("en-US");
}

/** Suggested restock amount to bring stock up to a target level. */
export function suggestRestockQuantity(currentStock: number, targetStock = 50): number {
  return Math.max(1, targetStock - parseQuantity(currentStock));
}
