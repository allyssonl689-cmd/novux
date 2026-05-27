import jsPDF from 'jspdf';

interface Category { name: string; value: number; pct: number }
interface MonthData { shortMonth: string; income: number; expense: number; savings: number }
interface InsightItem { title: string; description: string; level: string }

interface ReportData {
  userName: string;
  period: string;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  categories: Category[];
  monthlySummary: MonthData[];
  insights: InsightItem[];
}

const fmt = (v: number) =>
  `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (v: number) => `${v.toFixed(1)}%`;

function fmtShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(Math.round(v));
}

function hexRGB(color: string): [number, number, number] {
  return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
}

function generateTips(data: ReportData): string[] {
  const tips: string[] = [];
  if (data.savingsRate < 0) {
    tips.push('Suas despesas superaram as receitas neste periodo. Revise gastos nao essenciais e considere cortar assinaturas pouco utilizadas.');
  } else if (data.savingsRate < 10) {
    tips.push('Sua taxa de poupanca esta abaixo de 10%. Especialistas recomendam guardar pelo menos 20% da renda para construir uma reserva de emergencia solida.');
  } else if (data.savingsRate >= 30) {
    tips.push('Excelente! Voce esta poupando mais de 30% da sua renda. Considere diversificar seus investimentos para fazer o dinheiro trabalhar por voce.');
  } else {
    tips.push('Sua taxa de poupanca esta em bom nivel. Continue monitorando e tente aumenta-la gradualmente, mesmo que seja 1% por mes.');
  }
  const topCat = data.categories[0];
  if (topCat && topCat.pct > 40) {
    tips.push(`A categoria "${topCat.name}" representa ${topCat.pct}% das suas despesas. Concentracao alta — avalie se ha como otimizar esses gastos.`);
  }
  if (data.transactionCount < 5) {
    tips.push('Poucas transacoes registradas. Quanto mais lancamentos voce registrar, mais precisa sera a analise da IA sobre seus habitos financeiros.');
  } else if (data.transactionCount > 50) {
    tips.push('Volume alto de transacoes. Use as tags para organizar melhor seus lancamentos e facilitar a analise por categoria.');
  }
  if (data.balance > 0 && data.savingsRate > 15) {
    tips.push('Com saldo positivo consistente, este e um bom momento para avaliar Tesouro Direto, CDBs ou fundos de renda fixa.');
  }
  tips.push('Revise mensalmente suas metas financeiras. Pequenos ajustes frequentes sao mais eficazes do que grandes mudancas esporadicas.');
  return tips.slice(0, 4);
}

export function generateFinancialPDF(data: ReportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const MARGIN = 18;
  const COL = W - MARGIN * 2;

  // Mutable position object so helpers can update it
  const pos = { y: 0 };

  function setFont(size: number, style: 'normal' | 'bold' = 'normal', color = '#1a1a2e') {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    const [r, g, b] = hexRGB(color);
    doc.setTextColor(r, g, b);
  }

  function fillRect(x: number, y: number, w: number, h: number, color: string, radius = 0) {
    const [r, g, b] = hexRGB(color);
    doc.setFillColor(r, g, b);
    if (radius > 0) doc.roundedRect(x, y, w, h, radius, radius, 'F');
    else doc.rect(x, y, w, h, 'F');
  }

  function drawLine(x1: number, y: number, x2: number, color = '#e2e8f0') {
    const [r, g, b] = hexRGB(color);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.3);
    doc.line(x1, y, x2, y);
  }

  function pageHeader() {
    fillRect(0, 0, W, 12, '#0f0a1e');
    setFont(7, 'bold', '#a78bfa');
    doc.text('NOVUX FINANCE  ·  RELATORIO FINANCEIRO', MARGIN, 8);
    setFont(7, 'normal', '#6b7280');
    doc.text(data.period, W - MARGIN, 8, { align: 'right' });
    pos.y = 22;
  }

  function checkPage(neededH: number) {
    if (pos.y + neededH > 280) {
      doc.addPage();
      pageHeader();
    }
  }

  /* ══ PAGE 1 — COVER ══ */
  fillRect(0, 0, W, 76, '#0f0a1e');
  fillRect(0, 72, W, 4, '#6d28d9');

  // Logo mark
  fillRect(MARGIN, 16, 18, 13, '#6d28d9', 3);
  fillRect(MARGIN, 16, 18, 6, '#8b5cf6', 3);
  fillRect(MARGIN + 11, 19, 4, 5, '#0f0a1e', 1.5);

  // Brand name on same baseline — measure "Novux" width then place "Finance"
  const textX = MARGIN + 24;
  const nameY = MARGIN + 9;
  setFont(20, 'bold', '#ffffff');
  doc.text('Novux', textX, nameY);
  const novuxW = doc.getTextWidth('Novux');
  setFont(20, 'normal', '#a78bfa');
  doc.text('Finance', textX + novuxW + 2, nameY);

  setFont(8, 'normal', '#c4b5fd');
  doc.text('Relatorio Financeiro Completo', textX, nameY + 7);

  setFont(9, 'normal', '#c4b5fd');
  doc.text(`Periodo: ${data.period}`, MARGIN, 54);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, MARGIN, 61);
  doc.text(`Conta: ${data.userName}`, MARGIN, 68);

  pos.y = 90;

  // KPI cards
  const kpis = [
    { label: 'Receitas',         value: fmt(data.income),      color: '#10b981', bg: '#d1fae5' },
    { label: 'Despesas',         value: fmt(data.expense),     color: '#ef4444', bg: '#fee2e2' },
    { label: 'Saldo do Periodo', value: (data.balance < 0 ? '-' : '') + fmt(data.balance), color: data.balance >= 0 ? '#0ea5e9' : '#ef4444', bg: data.balance >= 0 ? '#e0f2fe' : '#fee2e2' },
    { label: 'Taxa de Poupanca', value: pct(data.savingsRate), color: '#8b5cf6', bg: '#ede9fe' },
  ];
  const cardW = (COL - 6) / 2;
  const cardH = 24;
  kpis.forEach((k, i) => {
    const cx = MARGIN + (i % 2) * (cardW + 6);
    const cy = pos.y + Math.floor(i / 2) * (cardH + 5);
    const [br, bg, bb] = hexRGB(k.bg);
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'F');
    const [ar, ag, ab] = hexRGB(k.color);
    doc.setFillColor(ar, ag, ab);
    doc.roundedRect(cx, cy, 3, cardH, 1.5, 1.5, 'F');
    setFont(7, 'normal', '#64748b');
    doc.text(k.label, cx + 7, cy + 9);
    setFont(12, 'bold', k.color);
    doc.text(k.value, cx + 7, cy + 18);
  });
  pos.y += 2 * (cardH + 5) + 10;

  // Summary table
  drawLine(MARGIN, pos.y, W - MARGIN);
  pos.y += 6;
  setFont(9, 'bold', '#6d28d9');
  doc.text('RESUMO DO PERIODO', MARGIN, pos.y);
  pos.y += 6;

  const avgPerTx = data.transactionCount > 0 ? data.expense / data.transactionCount : 0;
  const summaryRows = [
    ['Total de transacoes', String(data.transactionCount)],
    ['Maior categoria de gasto', data.categories[0]?.name ?? '—'],
    ['Concentracao da categoria', data.categories[0] ? `${data.categories[0].pct}% das despesas` : '—'],
    ['Media por transacao', avgPerTx > 0 ? fmt(avgPerTx) : '—'],
    ['Resultado do periodo', data.balance >= 0 ? `Superavit de ${fmt(data.balance)}` : `Deficit de ${fmt(Math.abs(data.balance))}`],
  ];
  summaryRows.forEach(([label, value]) => {
    setFont(8, 'normal', '#64748b');
    doc.text(label, MARGIN, pos.y);
    setFont(8, 'bold', '#1a1a2e');
    doc.text(value, W - MARGIN, pos.y, { align: 'right' });
    pos.y += 6;
    drawLine(MARGIN, pos.y - 1, W - MARGIN, '#f1f5f9');
  });

  /* ══ PAGE 2 — CHARTS & CATEGORIES ══ */
  doc.addPage();
  pageHeader();

  setFont(10, 'bold', '#1a1a2e');
  doc.text('Fluxo Mensal — Receitas vs Despesas', MARGIN, pos.y);
  pos.y += 5;

  if (data.monthlySummary.length > 0) {
    const chartH = 48;
    const chartW = COL;
    const maxVal = Math.max(...data.monthlySummary.flatMap(m => [m.income, m.expense]), 1);
    const barAreaW = chartW / data.monthlySummary.length;
    const barW = Math.min(barAreaW * 0.28, 9);

    fillRect(MARGIN, pos.y, chartW, chartH, '#f8fafc', 3);

    [0.25, 0.5, 0.75, 1].forEach(frac => {
      const gy = pos.y + chartH - 8 - frac * (chartH - 14);
      drawLine(MARGIN + 2, gy, W - MARGIN - 2, '#e2e8f0');
      setFont(5, 'normal', '#cbd5e1');
      doc.text(fmtShort(maxVal * frac), MARGIN + 3, gy - 1);
    });

    data.monthlySummary.forEach((m, i) => {
      const bx = MARGIN + i * barAreaW + barAreaW / 2;
      const incH = (m.income / maxVal) * (chartH - 14);
      const expH = (m.expense / maxVal) * (chartH - 14);
      const baseY = pos.y + chartH - 8;
      fillRect(bx - barW - 1, baseY - incH, barW, incH, '#10b981', 1);
      fillRect(bx + 1, baseY - expH, barW, expH, '#ef4444', 1);
      // Value labels above each bar
      if (incH > 4) {
        setFont(5, 'bold', '#10b981');
        doc.text(fmtShort(m.income), bx - barW / 2 - 1, baseY - incH - 1.5, { align: 'center' });
      }
      if (expH > 4) {
        setFont(5, 'bold', '#ef4444');
        doc.text(fmtShort(m.expense), bx + barW / 2 + 1, baseY - expH - 1.5, { align: 'center' });
      }
      setFont(6, 'normal', '#94a3b8');
      doc.text(m.shortMonth, bx, baseY + 4, { align: 'center' });
    });

    pos.y += chartH + 4;
    fillRect(MARGIN, pos.y, 3, 3, '#10b981');
    setFont(7, 'normal', '#64748b');
    doc.text('Receita', MARGIN + 5, pos.y + 2.5);
    fillRect(MARGIN + 32, pos.y, 3, 3, '#ef4444');
    doc.text('Despesa', MARGIN + 37, pos.y + 2.5);
    pos.y += 12;
  } else {
    setFont(8, 'normal', '#94a3b8');
    doc.text('Sem dados para o periodo selecionado.', MARGIN, pos.y + 6);
    pos.y += 14;
  }

  drawLine(MARGIN, pos.y, W - MARGIN);
  pos.y += 7;

  setFont(10, 'bold', '#1a1a2e');
  doc.text('Gastos por Categoria', MARGIN, pos.y);
  pos.y += 6;

  const CAT_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#0ea5e9', '#ef4444', '#ec4899'];
  const catBarMaxW = COL - 52;

  data.categories.slice(0, 6).forEach((cat, i) => {
    checkPage(16);
    const color = CAT_COLORS[i % CAT_COLORS.length];
    const barFill = (cat.pct / 100) * catBarMaxW;
    setFont(7, 'normal', '#374151');
    doc.text(cat.name, MARGIN, pos.y + 3.5);
    setFont(7, 'bold', color);
    doc.text(fmt(cat.value), W - MARGIN, pos.y + 3.5, { align: 'right' });
    fillRect(MARGIN, pos.y + 6, catBarMaxW, 3.5, '#f1f5f9', 1.5);
    if (barFill > 0) fillRect(MARGIN, pos.y + 6, barFill, 3.5, color, 1.5);
    setFont(6, 'normal', '#9ca3af');
    doc.text(`${cat.pct}%`, MARGIN + catBarMaxW + 3, pos.y + 9);
    pos.y += 15;
  });

  /* ══ PAGE 3 — AI INSIGHTS & TIPS ══ */
  doc.addPage();
  pageHeader();

  setFont(10, 'bold', '#1a1a2e');
  doc.text('Analise da IA Copiloto', MARGIN, pos.y);
  pos.y += 3;
  setFont(7, 'normal', '#64748b');
  doc.text('Insights gerados automaticamente com base no seu comportamento financeiro.', MARGIN, pos.y + 4);
  pos.y += 11;

  const insightColors: Record<string, { bg: string; bar: string }> = {
    critical: { bg: '#fef2f2', bar: '#ef4444' },
    warning:  { bg: '#fffbeb', bar: '#f59e0b' },
    success:  { bg: '#f0fdf4', bar: '#10b981' },
    info:     { bg: '#eff6ff', bar: '#3b82f6' },
  };

  if (data.insights.length === 0) {
    checkPage(20);
    fillRect(MARGIN, pos.y, COL, 16, '#f8fafc', 3);
    setFont(8, 'normal', '#94a3b8');
    doc.text('Nenhum insight disponivel para o periodo.', MARGIN + COL / 2, pos.y + 9, { align: 'center' });
    pos.y += 22;
  } else {
    data.insights.forEach(insight => {
      const colors = insightColors[insight.level] ?? insightColors.info;
      const textLines = doc.splitTextToSize(insight.description, COL - 16);
      const blockH = 8 + textLines.length * 4.5 + 6;
      checkPage(blockH + 4);

      const [br, bg, bb] = hexRGB(colors.bg);
      doc.setFillColor(br, bg, bb);
      doc.roundedRect(MARGIN, pos.y, COL, blockH, 3, 3, 'F');
      const [bar, bag, bab] = hexRGB(colors.bar);
      doc.setFillColor(bar, bag, bab);
      doc.roundedRect(MARGIN, pos.y, 3, blockH, 1.5, 1.5, 'F');

      setFont(8, 'bold', '#1a1a2e');
      doc.text(insight.title, MARGIN + 8, pos.y + 7);
      setFont(7, 'normal', '#64748b');
      doc.text(textLines, MARGIN + 8, pos.y + 13);
      pos.y += blockH + 4;
    });
  }

  pos.y += 4;
  checkPage(12);
  drawLine(MARGIN, pos.y, W - MARGIN);
  pos.y += 8;

  setFont(10, 'bold', '#1a1a2e');
  doc.text('Dicas Financeiras Personalizadas', MARGIN, pos.y);
  pos.y += 3;
  setFont(7, 'normal', '#64748b');
  doc.text('Recomendacoes baseadas nos seus dados do periodo.', MARGIN, pos.y + 4);
  pos.y += 11;

  const tips = generateTips(data);
  const tipBgs  = ['#ede9fe', '#dbeafe', '#d1fae5', '#fef3c7'];
  const tipBars = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  tips.forEach((tip, i) => {
    const tipLines = doc.splitTextToSize(tip, COL - 10);
    const tipH = tipLines.length * 4.5 + 10;
    checkPage(tipH + 4);

    const [br, bg, bb] = hexRGB(tipBgs[i % tipBgs.length]);
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(MARGIN, pos.y, COL, tipH, 3, 3, 'F');
    const [bar, bag, bab] = hexRGB(tipBars[i % tipBars.length]);
    doc.setFillColor(bar, bag, bab);
    doc.roundedRect(MARGIN, pos.y, 3, tipH, 1.5, 1.5, 'F');

    setFont(7, 'normal', '#374151');
    doc.text(tipLines, MARGIN + 8, pos.y + 6);
    pos.y += tipH + 5;
  });

  // Disclaimer
  pos.y += 4;
  checkPage(16);
  drawLine(MARGIN, pos.y, W - MARGIN);
  pos.y += 6;
  setFont(6, 'normal', '#94a3b8');
  const disclaimer = 'As informacoes e dicas apresentadas neste relatorio sao geradas automaticamente pela IA Novux Finance e tem carater exclusivamente informativo. Nao constituem aconselhamento financeiro profissional. Consulte um profissional certificado antes de tomar decisoes de investimento.';
  doc.text(doc.splitTextToSize(disclaimer, COL), MARGIN, pos.y);

  /* ── Footer on every page ── */
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    fillRect(0, 287, W, 10, '#0f0a1e');
    setFont(6, 'normal', '#6b7280');
    doc.text('Novux Finance  ·  Relatorio confidencial gerado automaticamente', MARGIN, 293);
    doc.text(`Pagina ${p} de ${totalPages}`, W - MARGIN, 293, { align: 'right' });
  }

  doc.save(`novux-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
}
