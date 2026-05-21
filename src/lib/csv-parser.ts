import { Transaction } from './types';

export function parseCSV(text: string): Partial<Transaction>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(/[;,\t]/).map(c => c.trim());

  const dateIdx = cols.findIndex(c => /data|date/.test(c));
  const descIdx = cols.findIndex(c => /descri|description/.test(c));
  const valueIdx = cols.findIndex(c => /valor|value|amount/.test(c));

  if (dateIdx === -1 || valueIdx === -1) return [];

  const results: Partial<Transaction>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[;,\t]/);
    if (parts.length <= Math.max(dateIdx, valueIdx)) continue;

    const rawValue = parts[valueIdx].trim().replace(/["\s]/g, '').replace(',', '.');
    const value = parseFloat(rawValue);
    if (isNaN(value)) continue;

    const description = descIdx >= 0 ? parts[descIdx].trim().replace(/"/g, '') : '';
    const date = parts[dateIdx].trim().replace(/"/g, '');

    // Parse date (DD/MM/YYYY or YYYY-MM-DD)
    let isoDate: string;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [d, m, y] = date.split('/');
      isoDate = `${y}-${m}-${d}`;
    } else {
      isoDate = date;
    }

    const type = value < 0 ? 'expense' : 'income';
    const category = guessCategory(description);

    results.push({
      type,
      value: Math.abs(value),
      category,
      date: isoDate,
      description,
    });
  }

  return results;
}

function guessCategory(desc: string): string {
  const d = desc.toLowerCase();
  if (/uber|99|taxi|combust|gasolina|estacion/.test(d)) return 'Transporte';
  if (/ifood|restaur|lanche|mercado|supermercado|padaria/.test(d)) return 'Alimentação';
  if (/aluguel|condomin|luz|energia|agua|internet/.test(d)) return 'Moradia';
  if (/netflix|spotify|cinema|bar|festa|game/.test(d)) return 'Lazer';
  if (/farmacia|medic|hospital|consulta|plano/.test(d)) return 'Saúde';
  if (/curso|escola|faculdade|livro/.test(d)) return 'Educação';
  if (/salario|salário|pagamento|freelance/.test(d)) return 'Salário';
  return 'Outros';
}
