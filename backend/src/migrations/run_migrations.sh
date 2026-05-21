#!/bin/bash
# ============================================================
# Novux Finance - Executa todas as migrations no PostgreSQL
#
# Uso: ./run_migrations.sh
# Requisito: DATABASE_URL definida no .env ou como variável
#
# Exemplo manual:
#   DATABASE_URL=postgresql://postgres:senha@localhost:5432/novux_finance ./run_migrations.sh
# ============================================================

set -e

# Carrega .env se existir
if [ -f "../../.env" ]; then
  export $(grep -v '^#' ../../.env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não definida. Configure o .env primeiro."
  exit 1
fi

echo "🚀 Conectando ao banco: $DATABASE_URL"

echo "📦 Executando migration 001 - Schema inicial..."
psql "$DATABASE_URL" -f "001_initial_schema.sql"
echo "✅ Schema criado com sucesso."

read -p "Deseja carregar os dados de demonstração? (s/N): " yn
if [[ "$yn" =~ ^[Ss]$ ]]; then
  echo "🌱 Executando migration 002 - Seeds demo..."
  psql "$DATABASE_URL" -f "002_seeds_demo.sql"
  echo "✅ Seeds carregados com sucesso."
  echo ""
  echo "👤 Usuário demo criado:"
  echo "   Email: demo@novux.app"
  echo "   Senha: Demo@1234"
fi

echo ""
echo "✅ Migrations concluídas!"
