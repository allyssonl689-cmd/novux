# Scripts de setup manual

Estes arquivos **não** são executados pelo runner automático (`npm run migrate`,
`run.ts`) — ele só aplica migrations numeradas no padrão `NNN_descricao.sql` no
diretório pai. São scripts de conveniência para criar o banco do zero de uma vez
(Supabase SQL Editor, DBeaver, `psql`).

| Arquivo | Uso |
|---|---|
| `ALL_MIGRATIONS.sql` | Schema completo consolidado — cole no SQL Editor do Supabase. |
| `novux_migration.sql` | Schema completo para PostgreSQL 14+ (ex.: DBeaver). |
| `novux_seeds.sql` | Seeds de demonstração — rodar **após** o schema, só em dev/staging. |

> ⚠️ Use **ou** o runner numerado (`npm run migrate`) **ou** um destes scripts de
> uma só vez — não os dois no mesmo banco.

## Nota sobre numeração duplicada

Há dois `009_*` e dois `010_*` no diretório pai. Os nomes completos são distintos,
então a tabela `migrations` rastreia cada um separadamente e a ordenação é
determinística (alfabética). Renomeá-los **quebraria** bancos onde já foram
aplicados (o runner os veria como novos e tentaria reexecutar), por isso foram
mantidos como estão.
