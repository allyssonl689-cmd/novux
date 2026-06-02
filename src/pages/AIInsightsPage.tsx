import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { apiFetch } from '@/services/api';
import { usePeriod } from '@/contexts/PeriodContext';
import { Send, Bot, User, Sparkles, Zap, RefreshCw, TrendingUp, BarChart3, Lock, Crown } from 'lucide-react';
import { CHART } from '@/lib/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { goalService, Goal } from '@/services/goalService';

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FREE_DAILY_LIMIT = 5;

interface Message { id: string; role: 'user' | 'ai'; text: string; loading?: boolean; ts: number }

const CHAT_SESSION_KEY = 'novux_ai_chat';
const WELCOME_TEXT = 'Olá! Sou o NovuxAI, seu copiloto financeiro pessoal 🚀\n\nTenho acesso completo ao seu histórico financeiro e posso te ajudar com:\n• Análises detalhadas de gastos\n• Estratégias de investimento\n• Orçamento personalizado\n• Projeções futuras\n\nO que você quer descobrir sobre suas finanças hoje?';

function makeWelcome(): Message {
  return { id: '0', role: 'ai', ts: Date.now(), text: WELCOME_TEXT };
}
function loadChat(): Message[] {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Message[];
      // Remove loading state de msgs que ficaram travadas
      return parsed.filter(m => !m.loading).length > 0
        ? parsed.filter(m => !m.loading)
        : [makeWelcome()];
    }
  } catch { /* ignore */ }
  return [makeWelcome()];
}
function saveChat(msgs: Message[]) {
  try { sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(msgs.filter(m => !m.loading))); } catch { /* ignore */ }
}

const QUICK = [
  { text: 'Analise meus gastos deste mês' },
  { text: 'Onde investir meu saldo livre?' },
  { text: 'Crie um orçamento ideal para mim' },
  { text: 'Por que meu saldo caiu?' },
  { text: 'Projeção dos próximos 3 meses' },
  { text: 'O que posso cortar hoje?' },
];

function ProGate({ onClose }: { onClose?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center gap-5">
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
        <Crown className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-base font-bold text-foreground" >
          Recurso Pro
        </p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs">
          O chat com IA é exclusivo do plano Pro. Faça upgrade para ter conversas ilimitadas com o NovuxAI e análises financeiras em tempo real.
        </p>
      </div>
      <button className="btn-novux flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl">
        <Sparkles className="h-3.5 w-3.5" />
        Seja Premium!
      </button>
      {onClose && (
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Continuar no plano gratuito
        </button>
      )}
    </motion.div>
  );
}

function LimitReachedBanner({ remaining }: { remaining: number }) {
  if (remaining > 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
      <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Limite diário atingido</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Você usou todas as {FREE_DAILY_LIMIT} mensagens gratuitas de hoje. Amanhã o limite é renovado.{' '}
          <span className="font-semibold text-primary cursor-pointer hover:opacity-80">Seja Premium! →</span>
        </p>
      </div>
    </motion.div>
  );
}

export default function AIInsightsPage() {
  const { transactions } = useFinance();
  const { user } = useAuth();
  const IS_PREMIUM = user?.plan === 'premium';

  // Carrega metas
  const [goals, setGoals] = useState<Goal[]>([]);
  useEffect(() => {
    goalService.list().then(setGoals).catch(() => {});
  }, []);
  const [msgs, setMsgs] = useState<Message[]>(loadChat);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    saveChat(msgs);
  }, [msgs]);

  // Load today's remaining count on mount
  useEffect(() => {
    if (IS_PREMIUM) { setRemaining(null); return; }
    apiFetch<{ success: boolean; data: { remaining: number } }>('/api/ai/usage')
      .then(r => setRemaining(r.data.remaining))
      .catch(() => setRemaining(FREE_DAILY_LIMIT));
  }, []);

  const { getRange } = usePeriod();
  const now = new Date();

  // ── Mês atual ───────────────────────────────────────────────
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income  = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
  const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);

  // Despesas por categoria (todas)
  const byCatExpense: Record<string, number> = {};
  thisMonth.filter(t => t.type === 'expense').forEach(t => {
    byCatExpense[t.category] = (byCatExpense[t.category] || 0) + t.value;
  });

  // Receitas por categoria
  const byCatIncome: Record<string, number> = {};
  thisMonth.filter(t => t.type === 'income').forEach(t => {
    byCatIncome[t.category] = (byCatIncome[t.category] || 0) + t.value;
  });

  // Pendentes (não pagos) do mês
  const pendingExpenses = thisMonth.filter(t => t.type === 'expense' && !t.paid);
  const pendingTotal    = pendingExpenses.reduce((s, t) => s + t.value, 0);

  // Investimentos totais (histórico completo)
  const totalInvested = transactions
    .filter(t => t.category === 'Investimentos' && t.type === 'income')
    .reduce((s, t) => s + t.value, 0);

  // ── Histórico mensal (todos os meses) ───────────────────────
  const allMonthsSummary: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const key = t.date.slice(0, 7);
    if (!allMonthsSummary[key]) allMonthsSummary[key] = { income: 0, expense: 0 };
    if (t.type === 'income') allMonthsSummary[key].income += t.value;
    else allMonthsSummary[key].expense += t.value;
  });
  const monthlyHistory = Object.entries(allMonthsSummary)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { income: inc, expense: exp }]) => {
      const [y, m] = key.split('-');
      const label = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return `${label}: receita ${fmt(inc)}, despesa ${fmt(exp)}, saldo ${inc >= exp ? '+' : '-'}${fmt(Math.abs(inc - exp))}`;
    });

  // ── Últimas transações (10 mais recentes) ───────────────────
  const recentTxs = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(t => `${t.date} | ${t.type === 'income' ? '+' : '-'}${fmt(t.value)} | ${t.category} | ${t.description}${t.paid === false ? ' [pendente]' : ''}`);

  // ── Metas ────────────────────────────────────────────────────
  const goalsContext = goals.map(g => {
    const pct = g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0;
    const deadline = g.deadline
      ? new Date(g.deadline + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'sem prazo';
    return `"${g.title}": guardado ${fmt(g.currentValue)} de ${fmt(g.targetValue)} (${pct}%) | prazo: ${deadline} | ${g.isCompleted ? 'CONCLUÍDA' : 'em andamento'}`;
  });

  // ── Contexto completo enviado à IA ──────────────────────────
  const financialContext = {
    // Período
    mes_atual: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),

    // Mês atual — receitas
    receita_mes_atual: fmt(income),
    receitas_por_categoria: Object.entries(byCatIncome).map(([c, v]) => `${c}: ${fmt(v)}`).join(', ') || 'nenhuma',

    // Mês atual — despesas
    despesa_mes_atual: fmt(expense),
    despesas_por_categoria: Object.entries(byCatExpense)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `${c}: ${fmt(v)} (${expense > 0 ? Math.round(v / expense * 100) : 0}%)`)
      .join(', ') || 'nenhuma',

    // Saldo e poupança
    saldo_mes_atual: `${income - expense >= 0 ? '+' : '-'}${fmt(Math.abs(income - expense))}`,
    taxa_poupanca: income > 0 ? `${((income - expense) / income * 100).toFixed(1)}%` : '0%',

    // Pendentes
    despesas_pendentes_mes: pendingExpenses.length > 0
      ? `${pendingExpenses.length} lançamentos totalizando ${fmt(pendingTotal)}: ${pendingExpenses.slice(0, 5).map(t => `${t.description} (${fmt(t.value)})`).join(', ')}`
      : 'nenhuma despesa pendente',

    // Investimentos
    total_investido_historico: fmt(totalInvested),

    // Histórico
    total_transacoes_mes_atual: String(thisMonth.length),
    total_transacoes_historico: String(transactions.length),
    historico_mensal: monthlyHistory.join(' | ') || 'sem histórico',

    // Transações recentes
    ultimas_transacoes: recentTxs.join('\n') || 'nenhuma',

    // Metas
    metas: goalsContext.length > 0 ? goalsContext.join('\n') : 'nenhuma meta cadastrada',
    total_metas: String(goals.length),
    metas_concluidas: String(goals.filter(g => g.isCompleted).length),
  };

  const canSend = IS_PREMIUM || (remaining === null || remaining > 0);

  async function handleSend(txt?: string) {
    const msg = txt || input.trim();
    if (!msg || loading || !canSend) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: msg, ts: Date.now() };
    const loadMsg: Message = { id: crypto.randomUUID(), role: 'ai', text: '', loading: true, ts: Date.now() };
    setMsgs(p => [...p, userMsg, loadMsg]);

    try {
      const res = await apiFetch<{ success: boolean; data: { text: string; remaining: number | null } }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, context: financialContext, isPremium: IS_PREMIUM }),
      });
      setMsgs(p => p.map(m => m.loading ? { ...m, text: res.data.text, loading: false } : m));
      if (res.data.remaining !== null) setRemaining(res.data.remaining);
    } catch (err: unknown) {
      const apiMsg = (err as { message?: string })?.message ?? '';
      const isLimit = apiMsg.toLowerCase().includes('limite') || apiMsg.toLowerCase().includes('limit');
      const isNotConfigured = apiMsg.toLowerCase().includes('configurado') || apiMsg.toLowerCase().includes('503');
      let errText = '⚠️ Erro ao conectar com a IA. Tente novamente.';
      if (isLimit) errText = '⚠️ Você atingiu o limite de mensagens gratuitas do dia. Faça upgrade para o Pro para continuar.';
      if (isNotConfigured) errText = '⚙️ A IA ainda não foi configurada. O administrador precisa adicionar a GROQ_API_KEY no arquivo .env do servidor e reiniciá-lo.';
      setMsgs(p => p.map(m => m.loading ? { ...m, text: errText, loading: false } : m));
      if (isLimit) setRemaining(0);
    } finally {
      setLoading(false);
    }
  }

  const riskRatio = income > 0 ? expense / income : expense > 0 ? 2 : 0;
  const score = riskRatio <= 0 ? 950 : Math.max(30, Math.min(950, Math.round(500 / riskRatio)));
  const scoreColor = score >= 650 ? CHART.income : score >= 400 ? CHART.warning : CHART.expense;

  return (
    <div className="max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground" >IA Copiloto</h1>
          <span className="text-xs font-semibold px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary">
            {IS_PREMIUM ? 'Pro · Ilimitado' : `${remaining ?? '...'} mensagens restantes hoje`}
          </span>
          {IS_PREMIUM && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-1">
              <Crown className="h-3 w-3" /> Pro
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Análises financeiras com inteligência artificial real via Groq LLaMA</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ height: 'calc(100dvh - 160px)', minHeight: '500px' }}>

        {/* Chat */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none" >NovuxAI</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Powered by Groq LLaMA · Seus dados carregados</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>{transactions.length} transações</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence initial={false}>
              {msgs.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 h-7 w-7 rounded-xl flex items-center justify-center ${msg.role === 'ai' ? '' : 'bg-secondary text-foreground'}`}
                    style={msg.role === 'ai' ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : {}}>
                    {msg.role === 'ai' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${msg.role === 'ai' ? 'bg-secondary text-foreground rounded-tl-sm' : 'rounded-tr-sm font-medium'}`}
                    style={msg.role === 'user' ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : {}}>
                    {msg.loading
                      ? <div className="flex gap-1 items-center py-0.5">
                          {[0, 1, 2].map(i => (
                            <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      : msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Limit banner */}
          {!IS_PREMIUM && <LimitReachedBanner remaining={remaining ?? FREE_DAILY_LIMIT} />}

          {/* Quick actions — no mobile mostra só 2, com scroll horizontal */}
          <div className="px-3 py-2 border-t border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Sugestões rápidas</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK.map(q => (
                <button key={q.text} onClick={() => handleSend(q.text)} disabled={loading || !canSend}
                  className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary transition-all disabled:opacity-40 whitespace-nowrap shrink-0">
                  {q.text}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)} disabled={loading || !canSend}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={canSend ? 'Pergunte qualquer coisa sobre suas finanças...' : 'Limite diário atingido — faça upgrade para continuar'}
              className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors disabled:opacity-50"
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim() || !canSend}
              className="btn-novux h-10 w-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto">
          {/* Score */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Score Financeiro</h3>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <svg width="96" height="96" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                    stroke={scoreColor} strokeDasharray={`${(score / 1000) * 264} 264`}
                    style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold leading-none" style={{ fontFamily: 'Outfit,sans-serif', color: scoreColor }}>{score}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">/1000</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  ['Controle', Math.round(score * .3),  300, CHART.investment],
                  ['Poupança', Math.round(score * .25), 250, CHART.income],
                  ['Metas',    Math.round(score * .25), 250, CHART.goal],
                  ['Regular.', Math.round(score * .2),  200, CHART.warning],
                ].map(([l, v, mx, c]) => (
                  <div key={l as string}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-semibold text-foreground mono">{v}/{mx}</span>
                    </div>
                    <div className="progress-track h-1">
                      <div className="progress-fill" style={{ width: `${(Number(v) / Number(mx)) * 100}%`, background: c as string }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Plan usage */}
          {!IS_PREMIUM && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-bold text-foreground">Plano Gratuito</p>
              </div>
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="text-muted-foreground">Mensagens hoje</span>
                <span className="font-bold text-foreground">{FREE_DAILY_LIMIT - (remaining ?? FREE_DAILY_LIMIT)}/{FREE_DAILY_LIMIT}</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((FREE_DAILY_LIMIT - (remaining ?? FREE_DAILY_LIMIT)) / FREE_DAILY_LIMIT) * 100}%` }} />
              </div>
              <button className="btn-novux w-full mt-3 py-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5">
                <Crown className="h-3 w-3" /> Seja Premium!
              </button>
            </motion.div>
          )}

          {/* Month summary */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo do Mês</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Receita',    v: fmt(income),         c: CHART.income },
                { l: 'Despesa',    v: fmt(expense),        c: CHART.expense },
                { l: 'Saldo',      v: `${income - expense < 0 ? '-' : ''}${fmt(income - expense)}`, c: income >= expense ? CHART.investment : CHART.expense },
                { l: 'Transações', v: String(thisMonth.length), c: CHART.goal },
              ].map(s => (
                <div key={s.l} className="rounded-xl border border-border bg-secondary p-3">
                  <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  <p className="text-sm font-bold mt-0.5 mono" style={{ color: s.c, fontFamily: 'Outfit,sans-serif' }}>{s.v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top gastos */}
          {Object.keys(byCatExpense).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Top Categorias</h3>
              <div className="space-y-2.5">
                {Object.entries(byCatExpense).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, val], i) => {
                  const pct = expense > 0 ? Math.round((val / expense) * 100) : 0;
                  const colors = [CHART.income, CHART.goal, CHART.warning, CHART.investment, CHART.expense];
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[i] }} />
                          {cat}
                        </span>
                        <span className="text-muted-foreground mono">{pct}%</span>
                      </div>
                      <div className="progress-track h-1">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
