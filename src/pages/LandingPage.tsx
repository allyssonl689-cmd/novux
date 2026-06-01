import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BrainCircuit, BarChart3, Target, Send, Shield, Crown,
  Check, ChevronDown, Sparkles, ArrowRight, Wallet,
  TrendingUp, TrendingDown, Zap, Globe, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/* ── N Lettermark ── */
function NovuxMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="lndg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16C7FF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M8 24 L8 8 L24 24 L24 8" stroke="url(#lndg)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FEATURES = [
  { icon: BarChart3,   color: '#16C7FF', title: 'Dashboard em tempo real',   desc: 'KPIs financeiros, gráficos de fluxo de caixa e insights automáticos numa visão completa.' },
  { icon: BrainCircuit,color: '#8B5CF6', title: 'IA Copilot (LLaMA 3.3 70B)', desc: 'Converse com IA sobre seus dados financeiros. Análises, projeções e recomendações personalizadas.' },
  { icon: Target,      color: '#19D38A', title: 'Metas financeiras',          desc: 'Defina objetivos, acompanhe o progresso e receba alertas da IA quando estiver no caminho certo.' },
  { icon: Send,        color: '#F59E0B', title: 'Bot do Telegram',            desc: 'Registre despesas e receitas diretamente pelo Telegram. Sem abrir o app.' },
  { icon: Shield,      color: '#16C7FF', title: 'Segurança bancária',         desc: 'Criptografia bcrypt, JWT, 2FA, audit log e conformidade com a LGPD.' },
  { icon: Globe,       color: '#8B5CF6', title: 'Multi-moeda',               desc: 'Suporte a BRL, USD, EUR e GBP. Ideal para freelancers e quem recebe em moeda estrangeira.' },
];

const STEPS = [
  { n: '1', title: 'Crie sua conta grátis', desc: 'Cadastro em 30 segundos. Sem cartão de crédito.' },
  { n: '2', title: 'Adicione suas finanças', desc: 'Lance transações manualmente, importe CSV ou use o bot do Telegram.' },
  { n: '3', title: 'Receba insights da IA', desc: 'A IA analisa seus dados e sugere onde economizar e como crescer.' },
];

const PLANS = [
  {
    name: 'Free',
    price: 'R$ 0',
    period: 'para sempre',
    color: '#64748B',
    features: [
      'Transações ilimitadas',
      'Dashboard completo',
      'Metas financeiras',
      'Relatórios mensais',
      '5 mensagens/dia com IA',
      'Importação CSV',
      'Exportação de dados',
    ],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    name: 'Premium',
    price: 'R$ 29',
    period: '/mês',
    color: '#16C7FF',
    features: [
      'Tudo do plano Free',
      'IA ilimitada (LLaMA 3.3)',
      'Bot do Telegram',
      'Relatórios avançados',
      'Score financeiro detalhado',
      'Suporte prioritário',
      'Acesso antecipado a novidades',
    ],
    cta: 'Seja Premium!',
    highlight: true,
  },
];

const FAQS_LAND = [
  { q: 'O Novux é seguro para dados financeiros?', a: 'Sim. Utilizamos criptografia bcrypt para senhas, tokens JWT, HTTPS em toda comunicação, autenticação 2FA e estamos em conformidade com a LGPD.' },
  { q: 'Preciso de cartão de crédito para o plano Free?', a: 'Não. O plano Free é gratuito para sempre, sem necessidade de dados de pagamento.' },
  { q: 'Como funciona o bot do Telegram?', a: 'Após vincular sua conta, você pode enviar mensagens como "Gastei 89 no mercado" e a IA interpreta e registra a transação automaticamente.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multa ou aviso prévio. E todos os seus dados podem ser exportados antes do cancelamento.' },
];

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between py-4 text-left gap-4">
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 border-b border-border/50"
        style={{ background: 'hsl(var(--background) / 0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: 'hsl(228 42% 18%)', border: '1px solid hsl(193 100% 54% / 0.2)' }}>
              <NovuxMark size={20} />
            </div>
            <span className="font-black text-base" style={{ fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.04em' }}>
              Novux <span className="font-light text-muted-foreground">Finance</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/ajuda" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">Ajuda</Link>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Entrar</Link>
            <Link to="/register" className="btn-novux flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl">
              Começar grátis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative py-24 px-4 text-center overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, hsl(193 100% 54% / 0.08) 0%, transparent 65%)' }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 50% 40% at 80% 80%, hsl(258 87% 66% / 0.05) 0%, transparent 55%)' }} />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs text-primary font-semibold mb-6">
            <Sparkles className="h-3 w-3" /> Powered by Groq LLaMA 3.3 70B
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6" style={{ letterSpacing: '-0.03em' }}>
            Seu{' '}
            <span className="text-gradient">copiloto financeiro</span>
            {' '}inteligente
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Controle receitas, despesas e metas com IA real. Insights automáticos, bot do Telegram e design premium para quem leva finanças a sério.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register"
              className="btn-novux flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-2xl w-full sm:w-auto justify-center">
              Começar grátis — sem cartão
            </Link>
            <Link to="/login"
              className="flex items-center gap-2 px-8 py-3.5 text-sm font-semibold rounded-2xl border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-all w-full sm:w-auto justify-center">
              Já tenho conta <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-4">Grátis para sempre · Sem limite de transações · Dados seguros (LGPD)</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-8 mt-16 flex-wrap">
          {[
            { v: '100%', l: 'Gratuito para começar' },
            { v: 'IA real', l: 'LLaMA 3.3 70B via Groq' },
            { v: 'LGPD', l: 'Dados protegidos' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <p className="text-2xl font-black text-gradient">{s.v}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.l}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">Tudo que você precisa para dominar suas finanças</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Uma plataforma completa com ferramentas que fazem a diferença no dia a dia.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-card p-6 card-hover">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18` }}>
                  <f.icon className="h-5 w-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-14">Comece em 3 passos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-black"
                  style={{ background: 'linear-gradient(135deg, #16C7FF, #8B5CF6)', color: 'white', fontFamily: 'Poppins,sans-serif' }}>
                  {s.n}
                </div>
                <h3 className="text-sm font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section className="py-20 px-4" id="planos">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Planos simples e transparentes</h2>
          <p className="text-muted-foreground mb-14">Sem taxas ocultas. Cancele quando quiser.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {PLANS.map(plan => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-2xl border p-6 text-left relative ${plan.highlight ? 'border-primary/40' : 'border-border bg-card'}`}
                style={plan.highlight ? { background: 'linear-gradient(145deg, hsl(228 47% 14%), hsl(228 42% 17%))', boxShadow: '0 0 32px hsl(193 100% 54% / 0.12)' } : {}}>

                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #16C7FF, #8B5CF6)', color: 'white' }}>
                      <Crown className="h-3 w-3" /> Mais popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-bold text-muted-foreground">{plan.name}</p>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="text-4xl font-black text-foreground" style={{ fontFamily: 'Outfit,sans-serif' }}>{plan.price}</span>
                    <span className="text-sm text-muted-foreground pb-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to="/register"
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all ${plan.highlight ? 'btn-novux' : 'border border-border bg-secondary hover:bg-muted text-foreground'}`}>
                  {plan.highlight && <Crown className="h-3.5 w-3.5" />}
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-10">Perguntas frequentes</h2>
          <div className="rounded-2xl border border-border bg-card px-6">
            {FAQS_LAND.map(f => <FAQ key={f.q} {...f} />)}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Mais dúvidas?{' '}
            <Link to="/ajuda" className="text-primary hover:underline">Ver central de ajuda</Link>
          </p>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="h-16 w-16 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'hsl(228 42% 18%)', border: '1px solid hsl(193 100% 54% / 0.2)' }}>
            <NovuxMark size={36} />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Pronto para tomar controle das suas finanças?</h2>
          <p className="text-muted-foreground mb-8">Comece hoje. Grátis. Sem complicação.</p>
          <Link to="/register"
            className="btn-novux inline-flex items-center gap-2 px-10 py-4 text-sm font-bold rounded-2xl">
            Criar minha conta grátis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <Link to="/landing" className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity w-fit">
                <NovuxMark size={20} />
                <span className="text-sm font-black" style={{ fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.03em' }}>Novux</span>
              </Link>
              <p className="text-xs text-muted-foreground">Seu copiloto financeiro inteligente.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-3">Produto</p>
              <div className="space-y-2">
                <Link to="/register" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Começar grátis</Link>
                <a href="#planos" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Planos</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-3">Suporte</p>
              <div className="space-y-2">
                <Link to="/ajuda" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Central de ajuda</Link>
                <a href="mailto:suporte@novux.app" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">suporte@novux.app</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-3">Legal</p>
              <div className="space-y-2">
                <Link to="/privacidade" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Política de Privacidade</Link>
                <Link to="/termos" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Termos de Uso</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 Novux Finance. Todos os direitos reservados.</p>
            <p className="text-xs text-muted-foreground">Em conformidade com a LGPD (Lei 13.709/2018)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
