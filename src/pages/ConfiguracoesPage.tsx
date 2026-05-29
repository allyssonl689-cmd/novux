import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useFinance } from '@/contexts/FinanceContext';
import {
  Globe, DollarSign, Bell, Download, Trash2, CheckCircle2,
  RefreshCw, AlertTriangle, PiggyBank, Sliders,
} from 'lucide-react';

/* ── Tipos ── */
interface Settings {
  currency: string;
  budgetLimits: Record<string, number>;
  notifyOverBudget: boolean;
  notifyWeeklyReport: boolean;
  notifyGoalProgress: boolean;
}

const STORAGE_KEY = 'novux_settings';
const CURRENCIES = [
  { code: 'BRL', symbol: 'R$', label: 'Real Brasileiro (BRL)' },
  { code: 'USD', symbol: '$',  label: 'Dólar Americano (USD)' },
  { code: 'EUR', symbol: '€',  label: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£',  label: 'Libra Esterlina (GBP)' },
];

const BUDGET_CATEGORIES = [
  'Alimentação', 'Restaurantes', 'Transporte', 'Moradia', 'Lazer',
  'Viagens', 'Saúde', 'Educação', 'Assinaturas', 'Streaming',
  'Vestuário', 'Pets', 'Empréstimos', 'Telefone',
];

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    currency: 'BRL',
    budgetLimits: {},
    notifyOverBudget: true,
    notifyWeeklyReport: false,
    notifyGoalProgress: true,
  };
}

function saveSettings(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/* ── Seção reutilizável ── */
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-foreground">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

/* ── Toggle ── */
function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-secondary border border-border'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { transactions } = useFinance();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved]       = useState(false);
  const [budgetInput, setBudgetInput] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* Inicializa inputs de orçamento com os valores salvos */
  useEffect(() => {
    const init: Record<string, string> = {};
    BUDGET_CATEGORIES.forEach(cat => {
      init[cat] = settings.budgetLimits[cat] ? String(settings.budgetLimits[cat]) : '';
    });
    setBudgetInput(init);
  }, []);

  function update(partial: Partial<Settings>) {
    setSettings(prev => ({ ...prev, ...partial }));
  }

  function handleSave() {
    /* Converte inputs de orçamento para números */
    const limits: Record<string, number> = {};
    Object.entries(budgetInput).forEach(([cat, val]) => {
      const n = parseFloat(val.replace(',', '.'));
      if (!isNaN(n) && n > 0) limits[cat] = n;
    });
    const final = { ...settings, budgetLimits: limits };
    saveSettings(final);
    setSettings(final);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function exportCSV() {
    const rows = ['Data,Tipo,Categoria,Descrição,Valor,Moeda,Tags',
      ...transactions.map(t =>
        `${t.date},${t.type},${t.category},"${t.description}",${t.value},${t.currency ?? 'BRL'},"${(t.tags ?? []).join('|')}"`
      ),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    a.download = `novux-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function exportJSON() {
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), transactions }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `novux-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  const selectedCurrency = CURRENCIES.find(c => c.code === settings.currency) ?? CURRENCIES[0];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground mt-1">Personalize o comportamento do Novux</p>
      </motion.div>

      {/* ── Moeda padrão ── */}
      <Section title="Moeda Padrão" icon={Globe}>
        <p className="text-xs text-muted-foreground mb-3">
          Define a moeda exibida em novos lançamentos. Não converte valores já registrados.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map(c => (
            <button key={c.code} onClick={() => update({ currency: c.code })}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                settings.currency === c.code
                  ? 'border-primary/50 bg-primary/8 text-foreground'
                  : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/25 hover:text-foreground'
              }`}>
              <span className="text-base font-bold w-5 text-center">{c.symbol}</span>
              <span className="text-xs font-medium">{c.label}</span>
              {settings.currency === c.code && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Moeda atual: <span className="text-foreground font-semibold">{selectedCurrency.symbol} — {selectedCurrency.label}</span>
        </p>
      </Section>

      {/* ── Limites de orçamento ── */}
      <Section title="Limite de Orçamento Mensal" icon={PiggyBank}>
        <p className="text-xs text-muted-foreground mb-4">
          Defina um limite de gasto por categoria. A IA e os insights usarão esses valores para alertas.
        </p>
        <div className="space-y-3">
          {BUDGET_CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-xs text-foreground w-32 shrink-0">{cat}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Sem limite"
                  value={budgetInput[cat] ?? ''}
                  onChange={e => setBudgetInput(p => ({ ...p, [cat]: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-secondary pl-8 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Notificações ── */}
      <Section title="Notificações" icon={Bell}>
        <div className="divide-y divide-border/50">
          <Toggle
            checked={settings.notifyOverBudget}
            onChange={v => update({ notifyOverBudget: v })}
            label="Alerta de orçamento excedido"
            sub="Notifica quando uma categoria ultrapassa o limite definido"
          />
          <Toggle
            checked={settings.notifyWeeklyReport}
            onChange={v => update({ notifyWeeklyReport: v })}
            label="Relatório semanal"
            sub="Resumo de gastos toda segunda-feira"
          />
          <Toggle
            checked={settings.notifyGoalProgress}
            onChange={v => update({ notifyGoalProgress: v })}
            label="Progresso de metas"
            sub="Notifica quando uma meta atinge 50% e 100%"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          As notificações dependem da permissão do navegador.
          {' '}Ative em <strong>Perfil → Notificações</strong>.
        </p>
      </Section>

      {/* ── Exportação ── */}
      <Section title="Exportação de Dados" icon={Download}>
        <p className="text-xs text-muted-foreground mb-4">
          Faça backup completo de todas as suas transações ({transactions.length} registros).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={exportCSV}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs font-semibold text-foreground hover:border-primary/30 hover:bg-secondary transition-all">
            <Download className="h-3.5 w-3.5 text-primary" />
            Exportar CSV
          </button>
          <button onClick={exportJSON}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs font-semibold text-foreground hover:border-primary/30 hover:bg-secondary transition-all">
            <Download className="h-3.5 w-3.5 text-accent" />
            Exportar JSON
          </button>
        </div>
      </Section>

      {/* ── Zona de perigo ── */}
      <Section title="Zona de Perigo" icon={AlertTriangle}>
        <p className="text-xs text-muted-foreground mb-4">
          Ações irreversíveis. Tenha certeza antes de prosseguir.
        </p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
            Limpar todas as transações
          </button>
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 space-y-3">
            <p className="text-xs font-semibold text-destructive">
              ⚠️ Isso apagará todas as {transactions.length} transações permanentemente. Não há como desfazer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
                Cancelar
              </button>
              <button
                className="flex-1 rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-all">
                Confirmar exclusão
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── Botão salvar ── */}
      <button onClick={handleSave}
        className="w-full rounded-2xl py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
        style={{ background: saved ? 'hsl(var(--success))' : 'hsl(var(--primary))' }}>
        {saved
          ? <><CheckCircle2 className="h-4 w-4" />Configurações salvas!</>
          : <><Sliders className="h-4 w-4" />Salvar configurações</>}
      </button>
    </div>
  );
}
