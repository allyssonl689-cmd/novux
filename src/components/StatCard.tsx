import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'income' | 'expense';
}

export function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'text-foreground',
    income: 'text-success',
    expense: 'text-alert',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 bg-card border border-border rounded-2xl shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${variantClasses[variant]}`}>
        {value}
      </p>
    </motion.div>
  );
}
