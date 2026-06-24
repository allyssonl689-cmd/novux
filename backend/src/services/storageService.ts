import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

/**
 * Armazenamento de comprovantes/anexos no Supabase Storage (bucket PRIVADO).
 *
 * Os arquivos NUNCA são públicos: o acesso é sempre proxiado pelo backend, que
 * valida o dono da transação antes de baixar e transmitir o conteúdo. A coluna
 * `transactions.attachment_url` passa a guardar a CHAVE do objeto no bucket
 * (ex.: "<userId>/<transactionId>/<hex>.pdf"), não mais um caminho de disco.
 */

const BUCKET = env.SUPABASE_STORAGE_BUCKET;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(
      'Storage de anexos não configurado (defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).',
      500,
    );
  }
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Envia o buffer ao bucket sob a chave informada (sobrescreve se já existir). */
export async function uploadAttachment(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await getClient()
    .storage.from(BUCKET)
    .upload(key, buffer, { contentType, upsert: true });
  if (error) throw new AppError(`Falha ao enviar anexo: ${error.message}`, 502);
}

/** Baixa o objeto do bucket. Lança 404 se não existir. */
export async function downloadAttachment(
  key: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const { data, error } = await getClient().storage.from(BUCKET).download(key);
  if (error || !data) throw new AppError('Arquivo não encontrado', 404);
  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: data.type || 'application/octet-stream',
  };
}

/** Remove o objeto do bucket (best-effort: nunca lança, não interrompe o fluxo). */
export async function removeAttachment(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await getClient().storage.from(BUCKET).remove([key]);
  } catch {
    // best-effort
  }
}
