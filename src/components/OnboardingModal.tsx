import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, TrendingDown, TrendingUp, Target, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    color: '#16C7FF',
    title: 'Bem-vindo ao Novux! 🎉',
    desc: 'Seu copiloto financeiro inteligente. Vamos configurar tudo em menos de 2 minutos.',
    tip: null,
  },
  {
    icon: TrendingUp,
    color: '#19D38A',
    title: 'Registre suas receitas',
    desc: 'Adicione seu salário, freelances e outras entradas. Clique em "+" ou use o bot do Telegram.',
    tip: 'Dica: transações recorrentes como salário podem ser configuradas para se repetirem automaticamente todo mês.',
  },
  {
    icon: TrendingDown,
    color: '#FF5A5F',
    title: 'Controle seus gastos',
    desc: 'Lance despesas com categoria para o dashboard identificar onde seu dinheiro vai.',
    tip: 'Dica: use tags como "fixo" e "variável" para filtrar e analisar melhor.',
  },
  {
    icon: Target,
    color: '#8B5CF6',
    title: 'Defina uma meta financeira',
    desc: 'Viagem, reserva de emergência, entrada de imóvel — o Novux acompanha seu progresso.',
    tip: 'Dica: a IA analisa suas finanças e sugere como acelerar suas metas.',
  },
  {
    icon: Wallet,
    color: '#16C7FF',
    title: 'Tudo pronto!',
    desc: 'Seu painel está configurado. Explore o Dashboard, converse com a IA e conecte o Telegram.',
    tip: null,
  },
];

const STORAGE_KEY = 'novux_onboarding_done';

export function useOnboarding() {
  const done = localStorage.getItem(STORAGE_KEY) === 'true';
  return { showOnboarding: !done };
}

interface Props { onClose: () => void }

export function OnboardingModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  function finish() {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(8px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 80px hsl(0 0% 0% / 0.45)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/40' : 'w-3 bg-border'}`} />
            ))}
          </div>
          <button onClick={finish} className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 rounded-3xl flex items-center justify-center"
                  style={{ background: `${current.color}18`, border: `1px solid ${current.color}30` }}>
                  <current.icon className="h-10 w-10" style={{ color: current.color }} />
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground text-center mb-3">{current.title}</h2>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">{current.desc}</p>

              {current.tip && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-[11px] text-primary/80 leading-relaxed">{current.tip}</p>
                </div>
              )}

              {isLast && (
                <div className="mt-4 space-y-2">
                  {['Dashboard configurado', 'IA pronta para análises', 'Bot Telegram disponível'].map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
                Anterior
              </button>
            )}
            <button onClick={isLast ? finish : () => setStep(s => s + 1)}
              className="flex-1 btn-novux rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2">
              {isLast ? 'Começar agora!' : (<>Próximo <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </div>

          {!isLast && (
            <button onClick={finish} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
              Pular tour
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
