import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

export class TwoFactorService {
    /**
     * Generate a new TOTP secret for a user.
     */
    static generateSecret(): string {
        return generateSecret();
    }

    /**
     * Generate a QR code URL for the user to scan.
     * @param email The user's email.
     * @param issuer The name of the application.
     * @param secret The user's TOTP secret.
     */
    static async generateQRCode(email: string, issuer: string, secret: string): Promise<string> {
        const otpauth = generateURI({
            secret,
            label: email,
            issuer
        });
        return QRCode.toDataURL(otpauth);
    }

    /**
     * Verify a TOTP token against a secret.
     * @param token The 6-digit code provided by the user.
     * @param secret The user's stored TOTP secret.
     */
    static async verifyToken(token: string, secret: string): Promise<boolean> {
        const result = await verify({
            token,
            secret
        });
        return !!result;
    }
}
