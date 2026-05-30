import nodemailer from 'nodemailer';
import { env } from '../config/env';

function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string | undefined,
  resetUrl: string
): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    // Em dev sem SMTP configurado, loga a URL no console para facilitar testes
    console.warn(`[EMAIL] Reset de senha para ${to}: ${resetUrl}`);
    return;
  }

  const firstName = name?.split(' ')[0] ?? 'usuário';

  await transporter.sendMail({
    from: env.SMTP_FROM ?? `"Novux Finance" <${env.SMTP_USER}>`,
    to,
    subject: 'Redefinição de senha — Novux Finance',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="margin-bottom:8px">Redefinição de senha</h2>
        <p>Olá, <strong>${firstName}</strong>.</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Novux Finance</strong>.</p>
        <p>Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}"
             style="background:#16C7FF;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">
            Redefinir senha
          </a>
        </p>
        <p style="font-size:13px;color:#666">
          Se você não solicitou a redefinição, pode ignorar este e-mail com segurança.
          O link expira automaticamente em 1 hora.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="font-size:12px;color:#999">Novux Finance — seu copiloto financeiro pessoal</p>
      </div>
    `,
  });
}
