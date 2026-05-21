import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { Send, Bot, User, Sparkles, Zap, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Message { id: string; role: 'user' | 'ai'; text: string; loading?: boolean; ts: number; }

const QUICK = [
  { icon: '📊', text: 'Analise meus gastos deste mês' },
  { icon: '💰', text: 'Onde investir meu saldo livre?' },
  { icon: '🎯', text: 'Crie um orçamento ideal para mim' },
  { icon: '📉', text: 'Por que meu saldo caiu?' },
  { icon: '🔮', text: 'Projeção dos próximos 3 meses' },
  { icon: '✂️', text: 'O que posso cortar hoje?' },
];

export default function AIInsightsPage() {
  const { transactions } = useFinance();
  const [msgs, setMsgs] = useState<Message[]>([{
    id: '0', role: 'ai', ts: Date.now(),
    text: 'Olá! Sou o NovuxAI, seu copiloto financeiro pessoal 🚀\n\nTenho acesso completo ao seu histórico financeiro e posso te ajudar com:\n• Análises detalhadas de gastos\n• Estratégias de investimento\n• Orçamento personalizado\n• Projeções futuras\n\nO que você quer descobrir sobre suas finanças hoje?',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income  = thisMonth.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
  const expense = thisMonth.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);

  const byCategory: Record<string,number> = {};
  thisMonth.filter(t=>t.type==='expense').forEach(t => { byCategory[t.category]=(byCategory[t.category]||0)+t.value; });
  const topCats = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);

  async function callClaude(msg: string): Promise<string> {
    const ctx = {
      receita: fmt(income), despesa: fmt(expense), saldo: fmt(income-expense),
      taxa_poupanca: income>0 ? `${((income-expense)/income*100).toFixed(1)}%` : '0%',
      top_gastos: topCats.slice(0,5).map(([c,v])=>`${c}: ${fmt(v)}`).join(', '),
      total_transacoes: thisMonth.length,
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Você é NovuxAI, consultor financeiro pessoal inteligente e empático.
Fale sempre em português brasileiro, de forma direta e com dados concretos.
Use emojis com moderação. Respostas com quebras de linha e listas quando útil.
Seja específico com números. Dê conselhos acionáveis, não genéricos.

DADOS FINANCEIROS DO USUÁRIO (mês atual):
${JSON.stringify(ctx, null, 2)}`,
        messages: [{ role: 'user', content: msg }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || 'Não consegui processar. Tente novamente.';
  }

  async function handleSend(txt?: string) {
    const msg = txt || input.trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: msg, ts: Date.now() };
    const loadMsg: Message = { id: crypto.randomUUID(), role: 'ai', text: '', loading: true, ts: Date.now() };
    setMsgs(p => [...p, userMsg, loadMsg]);

    try {
      const text = await callClaude(msg);
      setMsgs(p => p.map(m => m.loading ? { ...m, text, loading: false } : m));
    } catch {
      setMsgs(p => p.map(m => m.loading ? { ...m, text: '⚠️ Erro ao conectar. Verifique sua conexão.', loading: false } : m));
    } finally {
      setLoading(false);
    }
  }

  const score = income > 0 ? Math.round((1 - expense/income)*1000) : 720;
  const scoreColor = score>=700 ? 'hsl(161,100%,45%)' : score>=500 ? 'hsl(43,95%,58%)' : 'hsl(4,86%,68%)';

  return (
    <div className="max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne,sans-serif' }}>IA Copiloto</h1>
          <span className="shimmer-text text-xs font-bold px-3 py-1 rounded-full border"
            style={{ borderColor: 'hsl(158 64% 52% / 0.3)', background: 'hsl(158 64% 52% / 0.06)' }}>
            Powered by Claude AI · novuxfinance.app
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Análises financeiras com inteligência artificial real</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ height: 'calc(100vh - 190px)' }}>

        {/* Chat */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border"
            style={{ background: 'linear-gradient(90deg, hsl(158 64% 52% / 0.06) 0%, transparent 100%)' }}>
            <div className="relative">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(161 100% 45%), hsl(193 100% 50%))' }}>
                <Sparkles className="h-4 w-4 text-[hsl(230_25%_6%)]" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none" style={{ fontFamily: 'Syne,sans-serif' }}>NovuxAI</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Conectado · Seus dados carregados</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>{transactions.length} transações</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${msg.role==='user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 h-7 w-7 rounded-xl flex items-center justify-center ${
                  msg.role==='ai'
                    ? 'text-[hsl(230_25%_6%)]'
                    : 'bg-secondary text-foreground'
                }`}
                  style={msg.role==='ai' ? { background: 'linear-gradient(135deg, hsl(161 100% 45%), hsl(193 100% 50%))' } : {}}>
                  {msg.role==='ai' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                  msg.role==='ai' ? 'bg-secondary text-foreground rounded-tl-sm' : 'text-[hsl(230_25%_6%)] rounded-tr-sm font-medium'
                }`}
                  style={msg.role==='user' ? { background: 'linear-gradient(135deg, hsl(161 100% 45%), hsl(193 100% 50%))' } : {}}>
                  {msg.loading
                    ? <div className="flex gap-1 items-center py-0.5">
                        {[0,1,2].map(i => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                        ))}
                      </div>
                    : msg.text}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Sugestões rápidas</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map(q => (
                <button key={q.text} onClick={() => handleSend(q.text)} disabled={loading}
                  className="rounded-xl border border-border bg-secondary/40 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40">
                  {q.icon} {q.text}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input} onChange={e=>setInput(e.target.value)} disabled={loading}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()}
              placeholder="Pergunte qualquer coisa sobre suas finanças..."
              className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
            />
            <button onClick={()=>handleSend()} disabled={loading || !input.trim()}
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
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(230 18% 15%)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                    stroke={scoreColor} strokeDasharray={`${(score/1000)*264} 264`}
                    style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold leading-none" style={{ fontFamily:'Outfit,sans-serif', color: scoreColor }}>{score}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">/1000</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  ['Controle', Math.round(score*.3),  300, 'hsl(193,100%,50%)'],
                  ['Poupança', Math.round(score*.25), 250, 'hsl(161,100%,45%)'],
                  ['Metas',    Math.round(score*.25), 250, 'hsl(245,100%,72%)'],
                  ['Regular.', Math.round(score*.2),  200, 'hsl(43,95%,58%)'],
                ].map(([l,v,mx,c]) => (
                  <div key={l as string}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-semibold text-foreground mono">{v}/{mx}</span>
                    </div>
                    <div className="progress-track h-1">
                      <div className="progress-fill" style={{ width:`${(Number(v)/Number(mx))*100}%`, background: c as string }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Month summary */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo do Mês</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Receita',      v: fmt(income),          c: 'hsl(161,100%,45%)' },
                { l: 'Despesa',      v: fmt(expense),         c: 'hsl(4,86%,68%)'   },
                { l: 'Saldo',        v: fmt(income-expense),  c: income>=expense?'hsl(193,100%,50%)':'hsl(4,86%,68%)' },
                { l: 'Transações',   v: String(thisMonth.length), c: 'hsl(245,100%,72%)' },
              ].map(s => (
                <div key={s.l} className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  <p className="text-sm font-bold mt-0.5 mono" style={{ color: s.c, fontFamily:'Outfit,sans-serif' }}>{s.v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top gastos */}
          {topCats.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Top Categorias</h3>
              <div className="space-y-2.5">
                {topCats.slice(0,5).map(([cat, val], i) => {
                  const pct = expense > 0 ? Math.round((val/expense)*100) : 0;
                  const colors = ['hsl(161,100%,45%)','hsl(245,100%,72%)','hsl(43,95%,58%)','hsl(193,100%,50%)','hsl(4,86%,68%)'];
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
