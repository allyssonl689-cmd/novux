import { env } from '../config/env';

/* ─── Brevo HTTP API ────────────────────────────────────────────
   Usa a API REST do Brevo — não abre conexão SMTP, logo não é
   bloqueada por hospedagens cloud como o Render.
   Docs: https://developers.brevo.com/reference/sendtransacemail
─────────────────────────────────────────────────────────────── */

interface BrevoEmailPayload {
  sender:      { name: string; email: string };
  to:          Array<{ email: string; name?: string }>;
  subject:     string;
  htmlContent: string;
}

async function sendViaBrevo(payload: BrevoEmailPayload): Promise<void> {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY não configurada');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}

/* ─── Fallback: SMTP via nodemailer ─────────────────────────── */
async function sendViaSMTP(
  to: string,
  name: string | undefined,
  subject: string,
  html: string
): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error('SMTP não configurado');
  }

  // Import dinâmico para evitar carregar nodemailer quando não necessário
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:   { user: env.SMTP_USER, pass: env.SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  });

  const from = env.SMTP_FROM ?? env.EMAIL_FROM ?? `"Novux Finance" <${env.SMTP_USER}>`;
  await transporter.sendMail({ from, to, subject, html });
}

/* ─── Função principal ───────────────────────────────────────── */
export async function sendPasswordResetEmail(
  to: string,
  name: string | undefined,
  resetUrl: string
): Promise<void> {
  const firstName = name?.split(' ')[0] ?? 'usuário';

  const subject = 'Redefinição de senha — Novux Finance';
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;background:#f9fafb;padding:32px;border-radius:12px">
      <div style="background:#050816;padding:20px 24px;border-radius:10px;margin-bottom:24px;text-align:center">
        <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.04em">
          Novux <span style="font-weight:300;color:#94a3b8">Finance</span>
        </span>
      </div>
      <h2 style="margin:0 0 8px;color:#111">Redefinição de senha</h2>
      <p style="color:#444;margin:0 0 8px">Olá, <strong>${firstName}</strong>.</p>
      <p style="color:#444;margin:0 0 24px">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Novux Finance</strong>.
        Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${resetUrl}"
           style="background:#16C7FF;color:#000;padding:14px 32px;border-radius:10px;
                  text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
          Redefinir senha
        </a>
      </div>
      <p style="font-size:12px;color:#888;margin:24px 0 0">
        Se você não solicitou a redefinição, pode ignorar este e-mail com segurança.
        O link expira automaticamente em 1 hora.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="font-size:11px;color:#aaa;text-align:center;margin:0">
        Novux Finance — seu copiloto financeiro pessoal
      </p>
    </div>
  `;

  // Tenta Brevo primeiro; cai para SMTP como fallback
  if (env.BREVO_API_KEY) {
    const [fromName, fromEmail] = parseFrom(env.EMAIL_FROM);
    await sendViaBrevo({
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: to, name }],
      subject,
      htmlContent: html,
    });
    return;
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    await sendViaSMTP(to, name, subject, html);
    return;
  }

  // Sem provedor configurado — loga a URL para diagnóstico
  console.warn(`[EMAIL] Nenhum provedor configurado. URL de reset: ${resetUrl}`);
}

function parseFrom(from: string): [string, string] {
  // Formato: "Nome <email>" ou apenas "email"
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return [match[1].trim(), match[2].trim()];
  return ['Novux Finance', from.trim()];
}
