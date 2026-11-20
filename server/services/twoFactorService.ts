import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// shortcut: kept in memory, which is enough for the single Render instance; move to a DB column if it ever runs on more than one.
const usedCodes = new Map<string, { token: string; until: number }>();
// A TOTP code is valid for its 30 s step plus the allowed clock drift either side
const CODE_REUSE_WINDOW_MS = 90 * 1000;

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
        if (typeof token !== 'string') return false;
        const result = await verify({
            token,
            secret
        });
        // verify() returns { valid }, an object: `!!result` was always true and accepted any code
        if (!result.valid) return false;

        // A code works once: reject the same code for the same secret until it can no longer be valid
        const key = crypto.createHash('sha256').update(secret).digest('hex');
        const now = Date.now();
        const last = usedCodes.get(key);
        if (last && last.token === token && last.until > now) return false;
        usedCodes.set(key, { token, until: now + CODE_REUSE_WINDOW_MS });
        for (const [k, v] of usedCodes) if (v.until <= now) usedCodes.delete(k);
        return true;
    }
}
