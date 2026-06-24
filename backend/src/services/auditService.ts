import { db } from '../config/database';

type AuditAction =
  | 'login' | 'logout' | 'login_failed' | 'account_locked'
  | 'register' | 'delete_account'
  | 'export_data' | 'view_data'
  | 'password_change' | 'totp_enabled' | 'totp_disabled'
  | 'telegram_link' | 'telegram_unlink'
  | 'admin_view_users' | 'admin_view_metrics' | 'admin_list_users'
  | 'password_reset_requested' | 'password_reset';

export async function audit(
  userId: string | null,
  action: AuditAction,
  resource?: string,
  ip?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, resource, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId ?? null, action, resource ?? null, ip ?? null, JSON.stringify(metadata ?? {})]
    );
  } catch {
    // Audit log failure must never break the main flow
  }
}
