import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicPageButtons } from '@/components/PublicPageButtons';

export default function PrivacidadePage() {
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
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Política de Privacidade</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: maio de 2026 · Em conformidade com a LGPD (Lei 13.709/2018)</p>

          <div className="prose prose-sm max-w-none space-y-8 text-foreground">

            <Section title="1. Controlador dos Dados">
              <p>O controlador responsável pelo tratamento dos seus dados pessoais é a <strong>Novux Finance</strong>, plataforma de gestão financeira pessoal. Para exercer seus direitos ou entrar em contato sobre privacidade, utilize o e-mail: <a href="mailto:privacidade@novux.app" className="text-primary hover:underline">privacidade@novux.app</a>.</p>
            </Section>

            <Section title="2. Dados Coletados">
              <ul className="space-y-2 text-muted-foreground list-disc pl-4">
                <li><strong className="text-foreground">Dados de cadastro:</strong> nome, endereço de e-mail e senha (armazenada em hash bcrypt)</li>
                <li><strong className="text-foreground">Dados financeiros:</strong> transações, categorias, metas e investimentos que você inserir</li>
                <li><strong className="text-foreground">Dados de uso:</strong> logs de acesso, IP, data e hora das operações (finalidade de segurança)</li>
                <li><strong className="text-foreground">Integração Telegram:</strong> chat_id e username do Telegram, se você optar pela integração</li>
                <li><strong className="text-foreground">Cookies:</strong> apenas cookies técnicos essenciais ao funcionamento da plataforma</li>
              </ul>
            </Section>

            <Section title="3. Finalidade do Tratamento">
              <ul className="space-y-2 text-muted-foreground list-disc pl-4">
                <li>Prestação do serviço de gestão financeira pessoal</li>
                <li>Geração de insights e análises por inteligência artificial</li>
                <li>Segurança da conta e prevenção a acessos não autorizados</li>
                <li>Cumprimento de obrigações legais e regulatórias</li>
                <li>Comunicação sobre atualizações do serviço</li>
              </ul>
            </Section>

            <Section title="4. Base Legal">
              <p className="text-muted-foreground">O tratamento dos dados é realizado com base no <strong className="text-foreground">consentimento explícito</strong> fornecido no momento do cadastro (LGPD, Art. 7º, I) e na <strong className="text-foreground">execução de contrato</strong> para prestação do serviço (LGPD, Art. 7º, V).</p>
            </Section>

            <Section title="5. Compartilhamento de Dados">
              <p className="text-muted-foreground">Seus dados <strong className="text-foreground">não são vendidos</strong> a terceiros. Compartilhamos dados apenas com:</p>
              <ul className="space-y-2 text-muted-foreground list-disc pl-4 mt-2">
                <li><strong className="text-foreground">Supabase (PostgreSQL):</strong> armazenamento do banco de dados, servidores nos EUA</li>
                <li><strong className="text-foreground">Groq (IA):</strong> processamento das mensagens do chat IA — dados não são usados para treinamento</li>
                <li><strong className="text-foreground">Render:</strong> hospedagem do servidor backend</li>
              </ul>
            </Section>

            <Section title="6. Seus Direitos (LGPD Art. 18)">
              <ul className="space-y-2 text-muted-foreground list-disc pl-4">
                <li><strong className="text-foreground">Acesso:</strong> visualizar todos os seus dados na plataforma</li>
                <li><strong className="text-foreground">Retificação:</strong> editar transações e informações de perfil a qualquer momento</li>
                <li><strong className="text-foreground">Portabilidade:</strong> exportar todos os dados em CSV ou JSON via Configurações</li>
                <li><strong className="text-foreground">Exclusão:</strong> apagar todos os dados da conta via Perfil → Gerenciamento de Conta</li>
                <li><strong className="text-foreground">Revogação do consentimento:</strong> a qualquer momento, sem prejuízo ao tratamento anterior</li>
              </ul>
            </Section>

            <Section title="7. Retenção de Dados">
              <p className="text-muted-foreground">Os dados são mantidos enquanto a conta estiver ativa. Após a exclusão da conta, os dados são removidos permanentemente em até 30 dias, exceto onde a lei exigir retenção por prazo maior.</p>
            </Section>

            <Section title="8. Segurança">
              <p className="text-muted-foreground">Adotamos medidas técnicas de segurança incluindo criptografia de senhas (bcrypt), tokens JWT com curta validade, rate limiting, auditoria de acessos e comunicação via HTTPS.</p>
            </Section>

            <Section title="9. Controlador dos Dados — Informações de Contato">
              <div className="rounded-xl border border-border bg-card/50 p-4 space-y-1 text-sm text-muted-foreground">
                <p><strong className="text-foreground">Produto:</strong> Novux Finance</p>
                <p><strong className="text-foreground">Responsável pelo tratamento de dados (DPO):</strong> Allysson Lima</p>
                <p><strong className="text-foreground">E-mail para privacidade:</strong>{' '}
                  <a href="mailto:allyssonl689@gmail.com" className="text-primary hover:underline">allyssonl689@gmail.com</a>
                </p>
                <p><strong className="text-foreground">Canal de suporte:</strong>{' '}
                  <a href="mailto:suporte@novux.app" className="text-primary hover:underline">suporte@novux.app</a>
                </p>
                <p className="text-xs pt-1 text-muted-foreground/70">
                  Para exercer seus direitos previstos na LGPD (acesso, retificação, exclusão, portabilidade),
                  entre em contato pelos canais acima. Respondemos em até 15 dias úteis.
                </p>
              </div>
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
