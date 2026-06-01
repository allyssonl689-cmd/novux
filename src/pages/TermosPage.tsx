import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicPageButtons } from '@/components/PublicPageButtons';

export default function TermosPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        className="fixed top-4 right-4 h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10">
        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
      <div className="max-w-3xl mx-auto">
        <Link to="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Termos de Uso</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: maio de 2026</p>

          <div className="space-y-8 text-foreground">

            <Section title="1. Aceitação dos Termos">
              <p className="text-muted-foreground">Ao criar uma conta e utilizar o Novux Finance, você concorda com estes Termos de Uso. Se não concordar com qualquer parte, não utilize o serviço.</p>
            </Section>

            <Section title="2. Descrição do Serviço">
              <p className="text-muted-foreground">O Novux Finance é uma plataforma SaaS de gestão financeira pessoal que oferece controle de transações, metas, relatórios e análises por inteligência artificial. O serviço é disponibilizado nos planos <strong className="text-foreground">Free</strong> e <strong className="text-foreground">Premium</strong>, com funcionalidades distintas em cada plano.</p>
            </Section>

            <Section title="3. Conta e Responsabilidades">
              <ul className="space-y-2 text-muted-foreground list-disc pl-4">
                <li>Você é responsável por manter a confidencialidade das suas credenciais de acesso</li>
                <li>É proibido compartilhar, vender ou transferir sua conta para terceiros</li>
                <li>Você é responsável por toda atividade realizada sob sua conta</li>
                <li>Deve ter ao menos 18 anos para utilizar o serviço</li>
                <li>As informações fornecidas devem ser verdadeiras e atualizadas</li>
              </ul>
            </Section>

            <Section title="4. Uso Permitido">
              <p className="text-muted-foreground">O Novux Finance destina-se exclusivamente ao uso pessoal e não comercial de gestão financeira. É proibido:</p>
              <ul className="space-y-2 text-muted-foreground list-disc pl-4 mt-2">
                <li>Utilizar o serviço para fins ilegais ou fraudulentos</li>
                <li>Tentar acessar dados de outros usuários</li>
                <li>Realizar engenharia reversa ou tentativas de invasão</li>
                <li>Utilizar bots ou automações não autorizadas</li>
              </ul>
            </Section>

            <Section title="5. Planos e Pagamentos">
              <p className="text-muted-foreground">O plano Free oferece funcionalidades básicas sem custo. O plano Premium possui recursos adicionais mediante assinatura mensal. Os valores, condições e formas de pagamento serão detalhados na página de planos. Cancelamentos podem ser realizados a qualquer momento, sem multa.</p>
            </Section>

            <Section title="6. Dados Financeiros">
              <p className="text-muted-foreground">Os dados financeiros inseridos na plataforma são de sua propriedade. O Novux Finance não utiliza seus dados financeiros para fins de marketing, venda a terceiros ou treinamento de modelos de IA sem consentimento explícito.</p>
            </Section>

            <Section title="7. Disponibilidade do Serviço">
              <p className="text-muted-foreground">O serviço é fornecido "como está". Não garantimos disponibilidade ininterrupta. Poderemos realizar manutenções programadas com aviso prévio. Não nos responsabilizamos por perdas decorrentes de interrupções temporárias.</p>
            </Section>

            <Section title="8. Limitação de Responsabilidade">
              <p className="text-muted-foreground">O Novux Finance é uma ferramenta de organização financeira e <strong className="text-foreground">não constitui assessoria financeira profissional</strong>. As análises geradas pela IA são sugestões baseadas nos dados inseridos e não devem ser consideradas como conselho de investimento.</p>
            </Section>

            <Section title="9. Encerramento de Conta">
              <p className="text-muted-foreground">Você pode encerrar sua conta a qualquer momento via Perfil → Gerenciamento de Conta. Reservamo-nos o direito de encerrar contas que violem estes termos.</p>
            </Section>

            <Section title="10. Alterações nos Termos">
              <p className="text-muted-foreground">Podemos atualizar estes Termos periodicamente. Alterações significativas serão comunicadas por e-mail ou notificação no app com 30 dias de antecedência.</p>
            </Section>

            <Section title="11. Lei Aplicável">
              <p className="text-muted-foreground">Estes Termos são regidos pelas leis brasileiras. Foro: comarca de São Paulo/SP.</p>
            </Section>

            <Section title="12. Contato">
              <p className="text-muted-foreground">Dúvidas sobre estes Termos: <a href="mailto:contato@novux.app" className="text-primary hover:underline">contato@novux.app</a></p>
            </Section>
          </div>
        </motion.div>
      </div>
      <PublicPageButtons />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}
