/**
 * Escapa uma célula de CSV com segurança:
 * - envolve o valor em aspas e dobra aspas internas (`"` → `""`);
 * - previne CSV formula injection: células iniciadas por `=`, `+`, `-`, `@`,
 *   TAB ou CR recebem um apóstrofo na frente, neutralizando a fórmula quando o
 *   arquivo é aberto em Excel/Sheets.
 */
export function csvCell(val: unknown): string {
  const str = String(val ?? '').replace(/"/g, '""');
  const safe = str.replace(/^[=+\-@\t\r]/, "'$&");
  return `"${safe}"`;
}
