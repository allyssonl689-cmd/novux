import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ArrowLeft, Search, MessageCircle, Send, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { PublicPageButtons } from '@/components/PublicPageButtons';

const FAQS = [
  {
    cat: 'Conta & Acesso',
    items: [
      { q: 'Como criar uma conta no Novux Finance?', a: 'Acesse novux-export.vercel.app e clique em "Criar conta". Preencha nome, e-mail e uma senha segura. Após o cadastro, você já tem acesso ao painel.' },
      { q: 'Esqueci minha senha. O que fazer?', a: 'Na tela de login, clique em "Esqueci minha senha". Um e-mail de redefinição será enviado. (Funcionalidade em implementação — contate privacidade@novux.app)' },
      { q: 'O que é a autenticação 2FA?', a: 'A autenticação em dois fatores adiciona uma camada extra de segurança. Após ativar em Perfil → Segurança, você precisará de um código gerado por apps como Google Authenticator ou Authy.' },
      { q: 'Posso usar o Google para entrar?', a: 'Sim! O login via Google está disponível na tela de login e cadastro. Clique em "Continuar com Google".' },
    ],
  },
  {
    cat: 'Transações',
    items: [
      { q: 'Como adicionar uma transação?', a: 'Clique no botão "+" no canto superior direito, ou acesse a página Transações e clique em "Novo Lançamento". Preencha tipo (receita/despesa), valor, categoria, data e descrição.' },
      { q: 'O que são transações recorrentes?', a: 'Ao criar uma transação, selecione "Mensalmente" em recorrência e informe por quantos meses. O sistema criará automaticamente uma entrada por mês na data correspondente.' },
      { q: 'Como importar transações em CSV?', a: 'Na página Transações, clique em "Importar CSV". O arquivo deve ter colunas: data, tipo, categoria, descrição, valor. Baixe o modelo de exemplo antes de importar.' },
      { q: 'Posso editar ou excluir uma transação?', a: 'Sim. Passe o mouse sobre qualquer transação na lista para ver os botões de editar (lápis) e excluir (lixeira). No mobile, toque na transação.' },
      { q: 'O que significa "Em aberto" e "Pago"?', a: 'Você pode marcar cada transação como paga/recebida ou em aberto. Isso ajuda a controlar o que já passou pelo seu caixa real versus o que está previsto.' },
    ],
  },
  {
    cat: 'IA Copilot',
    items: [
      { q: 'Como funciona a IA do Novux?', a: 'O NovuxAI usa o modelo LLaMA 3.3 70B via Groq com acesso ao seu histórico financeiro real. Ele analisa seus dados e responde perguntas sobre gastos, economias e projeções.' },
      { q: 'Meus dados financeiros são enviados para a IA?', a: 'Apenas os dados do mês atual (totais por categoria, receita e despesa) são enviados como contexto. Transações individuais não são compartilhadas. A Groq não usa seus dados para treinamento.' },
      { q: 'Qual é o limite de mensagens no plano Free?', a: 'O plano Free permite 5 mensagens por dia com a IA. O plano Premium oferece uso ilimitado.' },
    ],
  },
  {
    cat: 'Bot do Telegram',
    items: [
      { q: 'Como conectar o Telegram ao Novux?', a: 'Vá em Perfil → Telegram Bot → Gerar código de vinculação. Abra @Novuxx_bot no Telegram e envie /conectar SEU_CODIGO.' },
      { q: 'Como registrar uma despesa pelo Telegram?', a: 'Após vincular a conta, envie uma mensagem natural como "Gastei 89 no mercado" ou "Recebi 3000 de salário". O bot vai interpretar e pedir confirmação antes de salvar.' },
      { q: 'Quais comandos o bot aceita?', a: '/saldo — saldo do mês | /extrato — últimas 5 transações | /resumo — resumo do mês | /metas — suas metas | /ajuda — lista de comandos' },
    ],
  },
  {
    cat: 'Segurança & Privacidade',
    items: [
      { q: 'Meus dados financeiros são seguros?', a: 'Sim. Utilizamos criptografia bcrypt para senhas, tokens JWT de curta duração, HTTPS em todas as comunicações, rate limiting e log de auditoria de acessos.' },
      { q: 'Como exportar todos os meus dados?', a: 'Acesse Configurações → Exportação de Dados. Você pode baixar tudo em CSV ou JSON a qualquer momento.' },
      { q: 'Como excluir minha conta?', a: 'Acesse Perfil → Gerenciamento de Conta → Excluir conta. Todos os dados são removidos permanentemente em até 30 dias, em conformidade com a LGPD.' },
      { q: 'O Novux vende meus dados?', a: 'Não. Seus dados nunca são vendidos a terceiros. Consulte nossa Política de Privacidade para detalhes completos.' },
    ],
  },
  {
    cat: 'Planos',
    items: [
      { q: 'Qual a diferença entre Free e Premium?', a: 'O Free inclui: transações ilimitadas, dashboard, metas, relatórios e 5 mensagens/dia de IA. O Premium adiciona: IA ilimitada, bot Telegram, relatórios avançados, exportação de dados e suporte prioritário.' },
      { q: 'Como assinar o plano Premium?', a: 'O sistema de pagamentos está em implementação. Acesse Perfil e clique em "Seja Premium!" para entrar na lista de espera e ser notificado quando disponível.' },
    ],
  },
];

export default function AjudaPage() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const backTo = isAuthenticated ? '/' : '/home';
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = FAQS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50"
        style={{ background: 'hsl(var(--background) / 0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> {isAuthenticated ? 'Voltar ao app' : 'Voltar'}
          </Link>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
            <HelpCircle className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Central de Ajuda</h1>
          <p className="text-muted-foreground">Encontre respostas para as dúvidas mais comuns</p>
        </motion.div>

        {/* Busca */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar na central de ajuda..."
            className="w-full rounded-2xl border border-border bg-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          {filtered.map(cat => (
            <div key={cat.cat}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{cat.cat}</p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {cat.items.map((item, i) => {
                  const key = `${cat.cat}-${i}`;
                  const open = openItem === key;
                  return (
                    <div key={key} className={i > 0 ? 'border-t border-border/60' : ''}>
                      <button onClick={() => setOpenItem(open ? null : key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/20 transition-colors gap-4">
                        <span className="text-sm font-medium text-foreground">{item.q}</span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA suporte */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
          <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground mb-1">Não encontrou o que precisava?</p>
          <p className="text-xs text-muted-foreground mb-4">Nossa equipe está disponível para ajudar.</p>
          <a href="mailto:suporte@novux.app"
            className="btn-novux inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl">
            <Send className="h-3.5 w-3.5" /> Falar com suporte
          </a>
        </motion.div>
      </div>
      </div>
      {/* hideHelp=true pois já estamos na página de ajuda */}
      <PublicPageButtons hideHelp />
    </div>
  );
}
