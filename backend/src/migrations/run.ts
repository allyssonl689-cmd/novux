import fs from 'fs';
import path from 'path';
import { db } from '../config/database';
import '../config/env';

async function runMigrations(): Promise<void> {
  const client = await db.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname);
    // Aplica APENAS migrations numeradas (`NNN_descricao.sql`). Scripts de setup
    // manual (ALL_MIGRATIONS.sql, novux_migration.sql, novux_seeds.sql) vivem em
    // `manual/` e NÃO devem ser executados pelo runner automático — rodá-los aqui
    // recriaria/duplicaria o schema num banco novo.
    const MIGRATION_PATTERN = /^\d{3,}_.*\.sql$/;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => MIGRATION_PATTERN.test(f))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`⏭  Pulando migração já aplicada: ${file}`);
        continue;
      }

      console.log(`▶  Aplicando migração: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');

      console.log(`✅ Migração aplicada: ${file}`);
    }

    console.log('✅ Todas as migrações foram aplicadas');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migrações:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

runMigrations();
