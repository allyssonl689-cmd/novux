## Plano de Refatoração — FinanceAI Dashboard

### Fase 1: Fundação (Design System + Layout)
1. **Novo design system dark tech** — Atualizar `index.css` e `tailwind.config.ts` com a paleta escura, tipografia Inter, tokens semânticos
2. **Layout com Sidebar** — Criar `AppSidebar` + `MainLayout` usando shadcn Sidebar com navegação (Dashboard, Relatórios, Lançamentos, Metas, IA Insights, Investimentos, Perfil)
3. **Topbar** — Saudação personalizada, período atual, botão "Novo lançamento", avatar
4. **Rotas** — Configurar React Router para todas as 6 páginas

### Fase 2: Dashboard (Página Principal)
5. **KPI Cards** (4 colunas) — Saldo, Receitas, Despesas, Score Financeiro
6. **Gráfico de Fluxo Mensal** (Recharts) — Barras agrupadas com filtros 3m/6m/12m
7. **Gastos por Categoria** — Lista com barras de progresso coloridas (verde/âmbar/vermelho)
8. **Insights da IA** — Cards narrativos com diagnóstico + projeção + ação
9. **Metas resumidas** — Barra de progresso + frase da IA
10. **Sugestões de investimento** — Cards com rentabilidade e risco
11. **Últimas transações** — Grid com destaque visual

### Fase 3: Páginas Secundárias
12. **Relatórios** — Narrativa automática, gráficos (evolução patrimônio, receita vs despesa, donut, heatmap), tabela detalhada
13. **Lançamentos** — Busca, filtros, tabs, agrupamento por data, modal de nova transação
14. **Metas** — Cards expandidos com cenários da IA, metas sugeridas
15. **IA Insights** — Chat financeiro (mock) + insights automáticos + Score detalhado
16. **Investimentos** — Carteira, simulador de juros compostos, sugestões por perfil

### Fase 4: Dados e Polish
17. **Mock data completo** — Dados realistas em PT-BR com categorias, metas, investimentos
18. **Animações** — Framer Motion em transições entre páginas e elementos
19. **Estado global** — Migrar Context API para estrutura mais robusta (manter Context mas reorganizar)

### ⚠️ Observações
- **Recharts** será adicionado como dependência para gráficos
- O chat da IA será mockado (sem backend real)
- Todas as páginas terão dados simulados funcionais
- Formato brasileiro: R$ 1.234,56 e dd/mm/aaaa
- ~15-20 arquivos novos serão criados

**Estimativa**: Implementação em etapas, começando pela fundação e dashboard.