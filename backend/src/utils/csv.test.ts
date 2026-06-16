import { describe, it, expect } from 'vitest';
import { csvCell } from './csv';

describe('csvCell', () => {
  it('envolve em aspas e dobra aspas internas', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
  });

  it('neutraliza formula injection (=, +, -, @)', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
    expect(csvCell('+CALL()')).toBe('"\'+CALL()"');
    expect(csvCell('-2+3')).toBe('"\'-2+3"');
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
  });

  it('prefixa TAB/CR iniciais (vetores de injeção)', () => {
    expect(csvCell('\t=1')).toBe('"\'\t=1"');
  });

  it('deixa valores seguros intactos', () => {
    expect(csvCell('Mercado')).toBe('"Mercado"');
    expect(csvCell(123)).toBe('"123"');
  });

  it('trata null/undefined como vazio', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});
