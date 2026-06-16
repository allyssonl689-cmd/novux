// Define variáveis de ambiente determinísticas ANTES de qualquer import de
// `config/env` (que valida via Zod e chama process.exit em caso de falha).
// dotenv não sobrescreve vars já presentes, então estes valores de teste vencem.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test_jwt_secret_com_pelo_menos_32_caracteres';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_com_pelo_menos_32_caracteres';
// 64 caracteres hex (32 bytes) — exigência do ENCRYPTION_KEY
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
