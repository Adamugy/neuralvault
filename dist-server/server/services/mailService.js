import { Resend } from 'resend';
import { env } from '../utils/env.js';
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
export class MailService {
    /**
     * Send verification email to user
     */
    static async sendVerificationEmail(email, token, name) {
        if (!resend) {
            console.warn('[MailService] RESEND_API_KEY not configured. Skipping email.');
            console.log(`[MailService] Simulation: Verification link for ${email} is ${env.APP_URL}/verify-email?token=${token}`);
            return;
        }
        const userName = name || 'User';
        const verificationLink = `${env.APP_URL}/verify-email?token=${token}`;
        try {
            await resend.emails.send({
                from: 'NeuralVault <no-reply@nvaulty.online>',
                to: email,
                subject: 'Verifique seu Email - NeuralVault',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
                        <h1 style="color: #6366f1; text-align: center;">Bem-vindo ao NeuralVault!</h1>
                        <p>Olá, ${userName}!</p>
                        <p>Obrigado por se juntar à nossa plataforma de pesquisa aumentada. Para começar, por favor verifique seu endereço de e-mail clicando no botão abaixo:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verificar Email</a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">Ou cole este link no seu navegador:</p>
                        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${verificationLink}</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Se você não criou esta conta, por favor ignore este e-mail.</p>
                    </div>
                `,
            });
            console.log(`[MailService] Verification email sent to ${email}`);
        }
        catch (error) {
            console.error('[MailService] Failed to send email:', error);
            // Don't throw here to avoid blocking signup, 
            // the user can still manual verify if they see the token in logs or settings
        }
    }
    static async sendPasswordResetEmail(email, token, name) {
        if (!resend) {
            console.warn('[MailService] RESEND_API_KEY not configured. Skipping email.');
            console.log(`[MailService] Simulation: Password reset link for ${email} is ${env.APP_URL}/reset-password?token=${token}`);
            return;
        }
        const userName = name || 'User';
        const resetLink = `${env.APP_URL}/reset-password?token=${token}`;
        try {
            await resend.emails.send({
                from: 'NeuralVault <no-reply@nvaulty.online>',
                to: email,
                subject: 'Redefinição de Senha - NeuralVault',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h1 style="color: #6366f1; text-align: center;">Redefinição de Senha</h1>
                        <p>Olá, ${userName}!</p>
                        <p>Recebemos uma solicitação para redefinir a senha da sua conta NeuralVault. Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Senha</a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">Ou cole este link no seu navegador:</p>
                        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${resetLink}</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Se você não solicitou uma redefinição de senha, por favor ignore este e-mail. A sua senha não será alterada.</p>
                    </div>
                `,
            });
            console.log(`[MailService] Password reset email sent to ${email}`);
        }
        catch (error) {
            console.error('[MailService] Failed to send email:', error);
            throw new Error('Não foi possível enviar o email de redefinição de senha.');
        }
    }
}
