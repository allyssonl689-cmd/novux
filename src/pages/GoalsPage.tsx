import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, CheckCircle2, Clock, Zap, Sparkles, Loader2 } from 'lucide-react';
import { goalService, Goal, CreateGoalInput } from '@/services/goalService';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const COLORS = ['hsl(161,100%,45%)','hsl(245,100%,72%)','hsl(43,95%,58%)','hsl(193,100%,50%)','hsl(4,86%,68%)','hsl(300,60%,65%)'];
const GOAL_ICONS: Record<string, string> = { 'Emergência':'🛡️','Viagem':'✈️','Tecnologia':'💻','Investimento':'📈','Imóvel':'🏠','Veículo':'🚗','Educação':'📚','Outro':'🎯' };

function daysLeft(deadline?: string) {
  if (!deadline) return { label: 'Sem prazo', color: 'hsl(220,12%,42%)' };
  const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (d < 0) return { label: 'Vencida', color: 'hsl(4,86%,68%)' };
  if (d === 0) return { label: 'Hoje!', color: 'hsl(43,95%,58%)' };
  if (d < 30) return { label: `${d} dias`, color: 'hsl(43,95%,58%)' };
  return { label: `${Math.round(d / 30)} meses`, color: 'hsl(220,12%,42%)' };
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', target: '', current: '', deadline: '', category: 'Outro' });

  useEffect(() => {
    goalService.list()
      .then(setGoals)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  async function addGoal() {
    if (!form.name || !form.target) return;
    setSaving(true);
    try {
      const input: CreateGoalInput = {
        title: form.name,
        targetValue: Number(form.target),
        currentValue: Number(form.current || 0),
        deadline: form.deadline || undefined,
        category: form.category,
        color: COLORS[goals.length % COLORS.length],
      };
      const created = await goalService.create(input);
      setGoals(p => [created, ...p]);
      setForm({ name: '', target: '', current: '', deadline: '', category: 'Outro' });
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: string) {
    await goalService.delete(id);
    setGoals(p => p.filter(g => g.id !== id));
  }

  const totalSaved  = goals.reduce((s, g) => s + g.currentValue, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetValue, 0);
  const completed   = goals.filter(g => g.isCompleted || g.currentValue >= g.targetValue).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne,sans-serif' }}>Metas Financeiras</h1>
            <p className="text-xs text-muted-foreground mt-1">Acompanhe seus objetivos com inteligência</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="btn-novux flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl">
            <Plus className="h-3.5 w-3.5" /> Nova Meta
          </button>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Total Guardado', v: fmt(totalSaved), s: `de ${fmt(totalTarget)}`, c: 'hsl(193,100%,50%)', Icon: Target },
          { l: 'Progresso Geral', v: `${totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%`, s: 'do objetivo total', c: 'hsl(161,100%,45%)', Icon: Zap },
          { l: 'Concluídas', v: `${completed}/${goals.length}`, s: 'metas', c: 'hsl(245,100%,72%)', Icon: CheckCircle2 },
        ].map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <s.Icon className="h-3.5 w-3.5" style={{ color: s.c }} />
              <span className="text-[11px] text-muted-foreground">{s.l}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: s.c, fontFamily: 'Outfit,sans-serif' }}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.s}</p>
          </motion.div>
        ))}
      </div>

      {/* Goals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {goals.map((goal, i) => {
            const pct  = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
            const done = goal.isCompleted || goal.currentValue >= goal.targetValue;
            const dl   = daysLeft(goal.deadline);
            const color = goal.color ?? COLORS[i % COLORS.length];
            const mo   = !done && goal.deadline ? Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (30 * 86400000))) : 0;
            const monthly = mo > 0 ? Math.ceil((goal.targetValue - goal.currentValue) / mo) : 0;

            return (
              <motion.div key={goal.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-5 card-hover group relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 80% 10%, ${color}0a 0%, transparent 60%)` }} />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                      {GOAL_ICONS[goal.category ?? 'Outro'] ?? '🎯'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Outfit,sans-serif' }}>{goal.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {done
                          ? <span className="text-[11px] text-success font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Concluída!</span>
                          : <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: dl.color }}><Clock className="h-3 w-3" />{dl.label}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-alert-muted transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-bold text-foreground mono">{fmt(goal.currentValue)}</span>
                    <span className="text-muted-foreground mono">{fmt(goal.targetValue)}</span>
                  </div>
                  <div className="progress-track h-2.5">
                    <motion.div className="progress-fill h-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: i * 0.08 }}
                      style={{ background: done ? 'linear-gradient(90deg, hsl(161,100%,45%), hsl(193,100%,50%))' : color,
                        boxShadow: done ? `0 0 10px ${color}60` : undefined }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px]">
                    <span className="font-bold" style={{ color }}>{pct}%</span>
                    {monthly > 0 && <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" />{fmt(monthly)}/mês</span>}
                  </div>
                </div>

                {!done && (
                  <div className="rounded-xl bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground text-center">
                    Faltam <span className="font-bold text-foreground">{fmt(goal.targetValue - goal.currentValue)}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowForm(true)}
          className="rounded-2xl border border-dashed border-border bg-card/30 p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-card/60 transition-all min-h-[180px]">
          <div className="h-12 w-12 rounded-xl border border-dashed border-current flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">Adicionar nova meta</p>
        </motion.button>
      </div>

      {/* AI suggestions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(245,100%,72%)]" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sugestões da IA</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: '🛡️', title: 'Reserva de emergência', text: 'Com sua renda atual, você completaria a reserva em 8 meses guardando R$ 812/mês.' },
            { icon: '✈️', title: 'Viagem econômica', text: 'Cortando delivery em 30%, economiza ~R$ 114/mês — isso é uma passagem aérea a cada 14 meses.' },
            { icon: '🏠', title: 'Entrada do imóvel', text: 'Investindo o saldo livre em CDB, você atingiria R$ 80k de entrada em 6 anos.' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-dashed border-[hsl(265_85%_70%_/0.3)] bg-[hsl(265_85%_70%_/0.04)] p-4 card-hover">
              <div className="flex items-start gap-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{s.text}</p>
                  <button onClick={() => setShowForm(true)} className="mt-2.5 text-[11px] font-semibold text-[hsl(245,100%,72%)] hover:opacity-80 transition-opacity">Criar meta →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-foreground mb-5" style={{ fontFamily: 'Outfit,sans-serif' }}>Nova Meta Financeira</h2>
              <div className="space-y-3">
                {[
                  { l: 'Nome da meta', k: 'name', type: 'text', ph: 'Ex: Fundo de emergência' },
                  { l: 'Valor alvo (R$)', k: 'target', type: 'number', ph: '10000' },
                  { l: 'Já guardei (R$)', k: 'current', type: 'number', ph: '0' },
                  { l: 'Prazo', k: 'deadline', type: 'date', ph: '' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">{f.l}</label>
                    <input type={f.type} placeholder={f.ph} value={(form as Record<string, string>)[f.k]}
                      onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Categoria</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50">
                    {Object.keys(GOAL_ICONS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-all">
                  Cancelar
                </button>
                <button onClick={addGoal} disabled={saving}
                  className="btn-novux flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Salvando...' : 'Criar Meta'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
