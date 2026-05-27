import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';

interface Props { open: boolean; onClose: () => void }

interface ParsedRow {
  date: string;
  description: string;
  value: number;
  type: 'income' | 'expense';
}

/* Detect CSV separator */
function detectSep(line: string): string {
  return line.includes(';') ? ';' : ',';
}

/* Try to parse a date string to YYYY-MM-DD */
function parseDate(raw: string): string | null {
  raw = raw.trim().replace(/"/g, '');
  // DD/MM/YYYY or DD/MM/YY
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  return null;
}

/* Parse a value: accepts "R$ 1.234,56" or "1234.56" or "-150" */
function parseValue(raw: string): number | null {
  // Strip currency symbols, spaces, BOM
  raw = raw.trim().replace(/"/g, '').replace(/\s/g, '');
  raw = raw.replace(/[R$ ﻿]/g, ''); // strip R$, non-breaking space, BOM
  raw = raw.replace(/[^\d.,\-]/g, '');         // keep only digits, dot, comma, minus
  if (!raw) return null;
  // Brazilian: 1.234,56 → remove dots, replace comma
  if (/\d+\.\d{3},/.test(raw)) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else {
    raw = raw.replace(',', '.');
  }
  const n = parseFloat(raw);
  return isNaN(n) ? null : Math.abs(n);
}

/* Score how likely a column header maps to a field */
const DATE_KEYS  = ['data', 'date', 'dt', 'vencimento', 'competencia'];
const DESC_KEYS  = ['descricao', 'descrição', 'historico', 'histórico', 'memo', 'description', 'lancamento', 'lançamento'];
const VAL_KEYS   = ['valor', 'value', 'amount', 'quantia', 'vlr', 'debito', 'crédito', 'credito', 'débito'];
const TYPE_KEYS  = ['tipo', 'type', 'natureza'];

function scoredMatch(header: string, keys: string[]): boolean {
  const h = header.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return keys.some(k => h.includes(k));
}

function parseCSV(text: string): ParsedRow[] | string {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return 'Arquivo sem dados suficientes.';

  const sep = detectSep(lines[0]);
  // Strip UTF-8 BOM (﻿) that Excel adds to CSV files
  const firstLine = lines[0].replace(/^﻿/, '');
  const headers = firstLine.split(sep).map(h => h.trim().replace(/"/g, ''));

  const colDate  = headers.findIndex(h => scoredMatch(h, DATE_KEYS));
  const colDesc  = headers.findIndex(h => scoredMatch(h, DESC_KEYS));
  const colVal   = headers.findIndex(h => scoredMatch(h, VAL_KEYS));
  const colType  = headers.findIndex(h => scoredMatch(h, TYPE_KEYS));

  if (colDate === -1) return 'Coluna de data não encontrada. Certifique-se de que o CSV tem coluna "Data".';
  if (colVal  === -1) return 'Coluna de valor não encontrada. Certifique-se de que o CSV tem coluna "Valor".';

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cells.length < 2) continue;

    const date = parseDate(cells[colDate] ?? '');
    if (!date) continue;

    const value = parseValue(cells[colVal] ?? '');
    if (value === null || value === 0) continue;

    const description = colDesc >= 0 ? (cells[colDesc] ?? 'Importado') : 'Importado';

    // Determine type
    let type: 'income' | 'expense' = 'expense';
    if (colType >= 0) {
      const t = (cells[colType] ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (t.includes('credit') || t.includes('receb') || t.includes('entrada') || t.includes('c ') || t === 'c') type = 'income';
      // saída / debito / saida = expense (default, no change needed)
    } else {
      // If raw value was positive in a "crédito" column or negative in "débito" column
      const rawVal = (cells[colVal] ?? '').trim();
      if (!rawVal.startsWith('-')) {
        // Default: negatives = expense, positives check description
        const desc = description.toLowerCase();
        if (desc.includes('salario') || desc.includes('salário') || desc.includes('receb') || desc.includes('pix receb')) {
          type = 'income';
        }
      }
    }

    rows.push({ date, description: description.slice(0, 255), value, type });
  }

  if (rows.length === 0) return 'Nenhuma transação válida encontrada no arquivo.';
  return rows;
}

export function CSVImportModal({ open, onClose }: Props) {
  const { addTransactions } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]       = useState<ParsedRow[]>([]);
  const [error, setError]     = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone]       = useState(false);
  const [showAll, setShowAll] = useState(false);

  function reset() {
    setRows([]); setError(''); setFileName(''); setImporting(false); setDone(false); setShowAll(false);
  }

  function handleClose() { reset(); onClose(); }

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Por favor, selecione um arquivo .csv'); return;
    }
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      if (typeof result === 'string') { setError(result); setRows([]); }
      else { setRows(result); }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!rows.length) return;
    setImporting(true);
    try {
      await addTransactions(rows.map(r => ({
        type: r.type,
        value: r.value,
        category: r.type === 'income' ? 'Salário' : 'Outros',
        date: r.date,
        description: r.description,
        paid: true,
      })));
      setDone(true);
    } catch {
      setError('Erro ao importar. Tente novamente.');
    } finally {
      setImporting(false);
    }
  }

  const preview = showAll ? rows : rows.slice(0, 8);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne,sans-serif' }}>
                  Importar Extrato CSV
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Suporta extratos do Nubank, Itaú, Bradesco, Santander e outros
                </p>
              </div>
              <button onClick={handleClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Column reference */}
              {!rows.length && (
                <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Colunas aceitas no CSV</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                    <div>
                      <span className="font-semibold text-foreground">Data</span>
                      <span className="text-muted-foreground ml-1">— obrigatório</span>
                      <p className="text-muted-foreground/70 text-[10px] leading-snug mt-0.5">
                        Nomes: <code className="font-mono">data</code>, <code className="font-mono">date</code>, <code className="font-mono">vencimento</code><br/>
                        Formatos: <code className="font-mono">DD/MM/AAAA</code> ou <code className="font-mono">AAAA-MM-DD</code>
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Valor</span>
                      <span className="text-muted-foreground ml-1">— obrigatório</span>
                      <p className="text-muted-foreground/70 text-[10px] leading-snug mt-0.5">
                        Nomes: <code className="font-mono">valor</code>, <code className="font-mono">value</code>, <code className="font-mono">amount</code>, <code className="font-mono">débito</code>, <code className="font-mono">crédito</code><br/>
                        Formatos: <code className="font-mono">1.234,56</code> ou <code className="font-mono">1234.56</code>
                      </p>
                    </div>
                    <div className="mt-1">
                      <span className="font-semibold text-foreground">Descrição</span>
                      <span className="text-muted-foreground ml-1">— opcional</span>
                      <p className="text-muted-foreground/70 text-[10px] leading-snug mt-0.5">
                        Nomes: <code className="font-mono">descrição</code>, <code className="font-mono">historico</code>, <code className="font-mono">memo</code>, <code className="font-mono">lançamento</code>
                      </p>
                    </div>
                    <div className="mt-1">
                      <span className="font-semibold text-foreground">Tipo</span>
                      <span className="text-muted-foreground ml-1">— opcional</span>
                      <p className="text-muted-foreground/70 text-[10px] leading-snug mt-0.5">
                        Nomes: <code className="font-mono">tipo</code>, <code className="font-mono">type</code>, <code className="font-mono">natureza</code><br/>
                        Valores: <code className="font-mono">credito</code> / <code className="font-mono">debito</code> (ou <code className="font-mono">entrada</code> / <code className="font-mono">saída</code>)
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border">
                    Separador detectado automaticamente (<code className="font-mono">,</code> ou <code className="font-mono">;</code>). Compatível com Nubank, Itaú, Bradesco, Santander.
                  </p>
                </div>
              )}

              {done ? (
                /* Success state */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-8"
                >
                  <div className="h-14 w-14 rounded-2xl bg-success-muted flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{rows.length} transações importadas!</p>
                  <p className="text-xs text-muted-foreground text-center">
                    As transações foram adicionadas aos seus lançamentos.
                  </p>
                  <button onClick={handleClose} className="btn-novux mt-2 px-6 py-2 text-xs font-bold rounded-xl">
                    Concluir
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Drop zone */}
                  {!rows.length && (
                    <div
                      onDrop={handleDrop}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-all"
                    >
                      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">Arraste o arquivo CSV aqui</p>
                        <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
                      </div>
                      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                    </div>
                  )}

                  {/* File name badge */}
                  {fileName && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/40">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{fileName}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{rows.length} linhas</span>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{error}</p>
                    </div>
                  )}

                  {/* Preview table */}
                  {rows.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Preview — {rows.length} transações detectadas
                      </p>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-secondary/60">
                              <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Data</th>
                              <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Descrição</th>
                              <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Tipo</th>
                              <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? '' : 'bg-secondary/20'}>
                                <td className="px-3 py-2 text-muted-foreground font-mono">
                                  {new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-3 py-2 text-foreground max-w-[180px] truncate">{row.description}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    row.type === 'income'
                                      ? 'bg-success-muted text-success'
                                      : 'bg-alert-muted text-destructive'
                                  }`}>
                                    {row.type === 'income' ? 'Receita' : 'Despesa'}
                                  </span>
                                </td>
                                <td className={`px-3 py-2 text-right font-bold mono ${
                                  row.type === 'income' ? 'text-success' : 'text-destructive'
                                }`}>
                                  {row.type === 'income' ? '+' : '−'}
                                  R$ {row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {rows.length > 8 && (
                          <button
                            onClick={() => setShowAll(v => !v)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:text-foreground border-t border-border transition-colors"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                            {showAll ? 'Mostrar menos' : `Ver mais ${rows.length - 8} transações`}
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-2">
                        As categorias serão definidas como padrão. Você pode editar individualmente após a importação.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {rows.length > 0 && (
                    <div className="flex gap-3 pt-1">
                      <button onClick={reset}
                        className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                        Trocar arquivo
                      </button>
                      <button onClick={handleImport} disabled={importing}
                        className="flex-1 btn-novux py-2.5 text-xs font-bold rounded-xl disabled:opacity-60">
                        {importing ? 'Importando...' : `Importar ${rows.length} transações`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
