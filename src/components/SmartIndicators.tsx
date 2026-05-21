import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, Lock, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import { buildFinancialIndicators } from '@/lib/financial-indicators';
import { UpgradeModal } from '@/components/UpgradeModal';

function fmt(value: number) {
  return `R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;
}

const riskConfig = {
  high: {
    border: 'border-alert',
    badge: '🔴 Alto risco',
    badgeClass: 'text-alert',
    panelClass: 'bg-alert/10',
    iconClass: 'text-alert',
    meterClass: 'bg-alert',
    icon: ShieldAlert,
  },
  medium: {
    border: 'border-warning',
    badge: '🟡 Atenção',
    badgeClass: 'text-warning',
    panelClass: 'bg-warning/10',
    iconClass: 'text-warning',
    meterClass: 'bg-warning',
    icon: ShieldQuestion,
  },
  healthy: {
    border: 'border-success',
    badge: '🟢 Controle',
    badgeClass: 'text-success',
    panelClass: 'bg-success/10',
    iconClass: 'text-success',
    meterClass: 'bg-success',
    icon: ShieldCheck,
  },
};

const projectedConfig = {
  positive: {
    border: 'border-success',
    iconClass: 'text-success',
    panelClass: 'bg-success/10',
  },
  negative: {
    border: 'border-alert',
    iconClass: 'text-alert',
    panelClass: 'bg-alert/10',
  },
};

function IndicatorCard({ children, index, className = '' }: { children: React.ReactNode; index: number; className?: string }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', bounce: 0 }}
      className={`rounded-2xl border bg-card p-5 shadow-card ${className}`}
    >
      {children}
    </motion.article>
  );
}

function LockedIndicatorCard({
  index,
  icon: Icon,
  title,
  description,
  onUnlock,
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onUnlock: () => void;
}) {
  return (
    <IndicatorCard index={index} className="border-dashed border-border bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-background p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">{description}</p>
          </div>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-background/80 p-4">
        <p className="text-sm font-semibold text-foreground">🔒 Desbloqueie insights avançados para entender melhor suas finanças</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Veja impacto no saldo, tendência e oportunidades de economia com mais clareza.</p>
        <Button className="mt-4 w-full" size="sm" type="button" onClick={onUnlock}>
          Desbloquear versão completa
        </Button>
      </div>
    </IndicatorCard>
  );
}

export function SmartIndicators() {
  const { transactions, isPremiumPreview } = useFinance();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const data = buildFinancialIndicators(transactions);

  if (!data) return null;

  const risk = riskConfig[data.riskLevel];
  const RiskIcon = risk.icon;
  const projectedStyle = data.projectedBalanceLevel ? projectedConfig[data.projectedBalanceLevel] : null;
  const openUpgrade = () => setUpgradeOpen(true);

  let index = 0;

  return (
    <>
    <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Indicadores Inteligentes</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <IndicatorCard index={index++} className={`border-l-4 ${risk.border} ${risk.panelClass} md:col-span-2 lg:col-span-2`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <RiskIcon className={`h-5 w-5 ${risk.iconClass}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${risk.badgeClass}`}>{risk.badge}</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-foreground">Risco financeiro</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/85">{data.riskText}</p>
            </div>
            <div className="rounded-2xl bg-card/80 px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Renda comprometida</p>
              <p className="mt-1 text-3xl font-extrabold text-foreground">{Math.round(data.riskRatio * 100)}%</p>
            </div>
          </div>

          <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-background/90">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(data.riskRatio * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${risk.meterClass}`}
            />
          </div>
        </IndicatorCard>

        {isPremiumPreview ? (
          data.projectedBalanceText && projectedStyle && data.projectedBalance !== null && (
            <IndicatorCard index={index++} className={`border-l-4 ${projectedStyle.border} ${projectedStyle.panelClass}`}>
              <div className="flex items-center gap-2">
                <Wallet className={`h-4 w-4 ${projectedStyle.iconClass}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${projectedStyle.iconClass}`}>💰 Saldo projetado</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">{data.projectedBalanceText}</p>
              <p className="mt-4 text-3xl font-extrabold text-foreground">{fmt(data.projectedBalance)}</p>
            </IndicatorCard>
          )
        ) : (
          <LockedIndicatorCard
            index={index++}
            icon={Wallet}
            title="💰 Saldo projetado"
            description="Descubra com antecedência como seu saldo pode terminar no fim do mês antes que isso vire um problema."
            onUnlock={openUpgrade}
          />
        )}

        {data.forecastText && data.forecast !== null && (
          <IndicatorCard index={index++} className="border-l-4 border-primary">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">📉 Previsão mensal</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">{data.forecastText}</p>
            <p className="mt-4 text-3xl font-extrabold text-foreground">{fmt(data.forecast)}</p>
          </IndicatorCard>
        )}

        {isPremiumPreview ? (
          data.actionText && data.actionAmount !== null && data.actionProjectedBalance !== null && (
            <IndicatorCard index={index++} className="border-l-4 border-success bg-success/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-success" />
                <span className="text-xs font-bold uppercase tracking-wider text-success">💡 Dica de economia</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">{data.actionText}</p>
              <div className="mt-4 rounded-2xl bg-card/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Impacto no saldo</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{fmt(data.actionProjectedBalance)}</p>
              </div>
            </IndicatorCard>
          )
        ) : (
          <LockedIndicatorCard
            index={index++}
            icon={Sparkles}
            title="💡 Dica de economia"
            description="Veja onde reduzir agora para aumentar seu saldo final sem precisar rever tudo manualmente."
            onUnlock={openUpgrade}
          />
        )}

        {isPremiumPreview ? (
          data.consistencyText && (
            <IndicatorCard
              index={index++}
              className={`border-l-4 ${data.consistencyLevel === 'positive' ? 'border-success bg-success/10' : 'border-alert bg-alert/10'}`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${data.consistencyLevel === 'positive' ? 'text-success' : 'text-alert'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${data.consistencyLevel === 'positive' ? 'text-success' : 'text-alert'}`}>
                  📊 Tendência
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">{data.consistencyText}</p>
              {data.consistencyChange !== null && (
                <p className="mt-4 text-3xl font-extrabold text-foreground">{Math.abs(data.consistencyChange)}%</p>
              )}
            </IndicatorCard>
          )
        ) : (
          <LockedIndicatorCard
            index={index++}
            icon={TrendingUp}
            title="📊 Tendência"
            description="Entenda se seus gastos estão acelerando antes que isso comprometa seu saldo nas próximas semanas."
            onUnlock={openUpgrade}
          />
        )}

        {isPremiumPreview ? (
          data.top3.length > 0 && (
            <IndicatorCard index={index++} className="border-l-4 border-primary">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">🔥 Vilões financeiros</span>
              </div>
              {data.top3Text && <p className="mt-3 text-sm leading-relaxed text-foreground/85">{data.top3Text}</p>}
              <div className="mt-4 space-y-2">
                {data.top3.map((category, categoryIndex) => (
                  <div key={category.name} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
                    <span className="text-foreground/85">{categoryIndex + 1}. {category.name}</span>
                    <span className="font-bold text-foreground">{category.pct}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Essas categorias representam <span className="font-bold text-foreground">{data.top3Pct}%</span> do total e podem continuar pressionando seu saldo se nada mudar.</p>
            </IndicatorCard>
          )
        ) : (
          <LockedIndicatorCard
            index={index++}
            icon={AlertTriangle}
            title="🔥 Vilões financeiros"
            description="Descubra quais categorias estão puxando seus gastos para cima e exigem atenção imediata."
            onUnlock={openUpgrade}
          />
        )}
      </div>
    </section>
    </>
  );
}
