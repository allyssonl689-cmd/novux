import path from 'path';
import fs from 'fs';

/** Diretório único onde os comprovantes são gravados. */
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Resolve o caminho absoluto de um anexo a partir do valor salvo em `attachment_url`
 * (ex.: "/uploads/abc123.pdf"). Usa apenas o basename para impedir path traversal —
 * qualquer "../" no valor é descartado.
 */
export function resolveUploadPath(attachmentUrl: string): string {
  return path.join(UPLOADS_DIR, path.basename(attachmentUrl));
}

/** Remove o arquivo físico de um anexo (best-effort, nunca lança). */
export function removeUploadFile(attachmentUrl: string | null | undefined): void {
  if (!attachmentUrl) return;
  try {
    const filePath = resolveUploadPath(attachmentUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best-effort: não interrompe o fluxo se a remoção falhar
  }
}
