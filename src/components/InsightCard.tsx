import { motion } from 'framer-motion';
import { Insight } from '@/lib/types';
import { AlertTriangle, TrendingDown, TrendingUp, Info, Sparkles } from 'lucide-react';

const levelConfig = {
  critical: { border: 'border-l-alert', icon: AlertTriangle, iconClass: 'text-alert' },
  warning: { border: 'border-l-primary', icon: TrendingUp, iconClass: 'text-primary' },
  info: { border: 'border-l-muted-foreground', icon: Info, iconClass: 'text-muted-foreground' },
  positive: { border: 'border-l-success', icon: Sparkles, iconClass: 'text-success' },
};

export function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const config = levelConfig[insight.level];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', bounce: 0 }}
      whileHover={{ y: -2 }}
      className={`p-5 bg-card border border-border rounded-2xl shadow-card border-l-4 ${config.border} cursor-default`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${config.iconClass}`} />
        <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
          {insight.label}
        </span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        {insight.text}
      </p>
    </motion.div>
  );
}
