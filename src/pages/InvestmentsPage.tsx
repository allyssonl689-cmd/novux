import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, BarChart3, Shield, ArrowUpRight, Zap } from 'lucide-react';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const PRODUCTS = [
  { name:'Tesouro Selic',  type:'Renda Fixa',    rate:13.75, risk:'Baixo',    liq:'D+1',          min:100,   color:'#10B981', badge:'Seguro'    },
  { name:'CDB 120% CDI',   type:'Renda Fixa',    rate:14.28, risk:'Baixo',    liq:'D+1',          min:1000,  color:'#0EA5E9', badge:'Popular'   },
  { name:'LCI / LCA',      type:'Renda Fixa',    rate:12.50, risk:'Baixo',    liq:'No vencimento',min:5000,  color:'#F59E0B', badge:'Isento IR' },
  { name:'FII (média)',    type:'Renda Variável', rate:9.80,  risk:'Médio',    liq:'D+2',          min:50,    color:'#8B5CF6', badge:'Dividendos'},
  { name:'ETF BOVA11',     type:'Renda Variável', rate:11.20, risk:'Médio-Alto',liq:'D+2',         min:30,    color:'#EF4444', badge:'Ibovespa'  },
  { name:'ETF IVVB11',     type:'Renda Variável', rate:15.50, risk:'Alto',     liq:'D+2',          min:30,    color:'#EC4899', badge:'S&P 500'   },
];

const RISK_COLOR: Record<string,string> = { 'Baixo':'#10B981','Médio':'#F59E0B','Médio-Alto':'#EF4444','Alto':'#DC2626' };

export default function InvestmentsPage() {
  const [capital, setCapital] = useState(5000);
  const [years, setYears]     = useState(10);
  const [selected, setSelected] = useState(PRODUCTS[1]);

  const compound = (rate: number) => capital * Math.pow(1 + rate/100, years);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily:'Syne,sans-serif' }}>Investimentos</h1>
        <p className="text-xs text-muted-foreground mt-1">Compare produtos e simule crescimento patrimonial</p>
      </motion.div>

      {/* Simulator */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground" style={{ fontFamily:'Syne,sans-serif' }}>Simulador de Juros Compostos</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Capital inicial</span>
                <span className="font-bold text-foreground mono">{fmt(capital)}</span>
              </div>
              <input type="range" min={500} max={100000} step={500} value={capital} onChange={e=>setCapital(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Prazo</span>
                <span className="font-bold text-foreground">{years} {years===1?'ano':'anos'}</span>
              </div>
              <input type="range" min={1} max={30} step={1} value={years} onChange={e=>setYears(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>
            {/* Selected result */}
            <div className="rounded-xl p-4 border" style={{ borderColor:`${selected.color}40`, background:`${selected.color}0a` }}>
              <p className="text-[10px] text-muted-foreground mb-1">{selected.name}</p>
              <p className="text-2xl font-bold mono" style={{ color: selected.color, fontFamily:'Outfit,sans-serif' }}>{fmt(compound(selected.rate))}</p>
              <p className="text-[11px] text-success mt-1">+{fmt(compound(selected.rate)-capital)} de lucro</p>
            </div>
          </div>

          {/* Products grid */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRODUCTS.map((p, i) => {
              const result = compound(p.rate);
              const isSelected = selected.name === p.name;
              return (
                <motion.button key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }}
                  onClick={() => setSelected(p)}
                  className={`rounded-xl border p-3.5 text-left transition-all ${isSelected ? '' : 'border-border hover:border-[hsl(230_18%_22%)]'}`}
                  style={isSelected ? { borderColor: `${p.color}50`, background: `${p.color}0c`, boxShadow: `0 0 16px ${p.color}15` } : { background: 'hsl(var(--card))' }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${p.color}20`, color: p.color }}>{p.badge}</span>
                    <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.rate}%</span>
                  </div>
                  <p className="text-xs font-bold text-foreground leading-tight mb-0.5">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">{p.type}</p>
                  <p className="text-sm font-bold mono" style={{ color: p.color, fontFamily:'Outfit,sans-serif' }}>{fmt(result)}</p>
                  <p className="text-[10px] text-success flex items-center gap-0.5 mt-0.5">
                    <ArrowUpRight className="h-3 w-3" />+{fmt(result-capital)}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Selected detail */}
      <motion.div layout key={selected.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl border p-5"
        style={{ borderColor: `${selected.color}35`, background: `${selected.color}07` }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily:'Outfit,sans-serif' }}>{selected.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{selected.type}</p>
          </div>
          <span className="text-sm font-bold px-3 py-1.5 rounded-xl" style={{ background:`${selected.color}20`, color: selected.color }}>
            {selected.rate}% a.a.
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l:'Capital Inicial',  v: fmt(capital),                          Icon: DollarSign },
            { l:`Após ${years} anos`, v: fmt(compound(selected.rate)),        Icon: TrendingUp },
            { l:'Lucro Total',      v: fmt(compound(selected.rate)-capital),  Icon: ArrowUpRight },
            { l:'Retorno',          v: `${Math.round(((compound(selected.rate)/capital)-1)*100)}%`, Icon: BarChart3 },
          ].map(s => (
            <div key={s.l} className="rounded-xl bg-card/60 border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <s.Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{s.l}</span>
              </div>
              <p className="text-base font-bold mono" style={{ fontFamily:'Outfit,sans-serif' }}>{s.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-card/60 border border-border px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] mb-0.5">Risco</p>
            <p className="font-bold" style={{ color: RISK_COLOR[selected.risk] }}>{selected.risk}</p>
          </div>
          <div className="rounded-xl bg-card/60 border border-border px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] mb-0.5">Liquidez</p>
            <p className="font-bold text-foreground">{selected.liq}</p>
          </div>
          <div className="rounded-xl bg-card/60 border border-border px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] mb-0.5">Valor mínimo</p>
            <p className="font-bold text-foreground mono">{fmt(selected.min)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 rounded-xl bg-[hsl(158_64%_52%_/0.06)] border border-[hsl(158_64%_52%_/0.2)] p-3">
          <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            <span className="text-foreground font-semibold">Aviso:</span> Rentabilidade passada não garante resultados futuros. Consulte um assessor de investimentos credenciado.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
