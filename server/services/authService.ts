import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';
import { env } from '../utils/env.js';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
    userId: string;
    email: string;
}

export class AuthService {
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Constant-time password verification to prevent timing attacks.
     */
    static async verifyPasswordSafe(password: string, hash: string | null): Promise<boolean> {
        const DUMMY_HASH = '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNI9Xf92T46A.gXh9YhWWh2i2qy';
        const targetHash = hash || DUMMY_HASH;
        const isValid = await bcrypt.compare(password, targetHash);
        return hash ? isValid : false;
    }

    static generateToken(userId: string, email: string): string {
        const payload: JWTPayload = { userId, email };
        return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    }

    static verifyToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    static async createSession(userId: string, token: string, contextFingerprint?: string): Promise<void> {
        this.verifyToken(token);
        const expiresAt = new Date(Date.now() + this.parseExpiration(JWT_EXPIRES_IN));

        await prisma.session.create({
            data: { userId, token, expiresAt, contextFingerprint }
        });
    }

    static async deleteSession(token: string): Promise<void> {
        await prisma.session.deleteMany({
            where: { token }
        });
    }

    /**
     * Assesses session validity (expiry, idle timeout, fingerprint).
     */
    static async validateSession(token: string, contextFingerprint?: string): Promise<boolean> {
        const session = await prisma.session.findUnique({ where: { token } });
        if (!session) return false;

        if (this.isFingerprintMismatched(session.contextFingerprint, contextFingerprint)) {
            console.warn(`[Security] Session fingerprint mismatch for token ending in ...${token.slice(-8)}`);
            await this.deleteSession(token);
            return false;
        }

        if (this.isSessionExpired(session.expiresAt) || this.isSessionIdleTimedOut(session.updatedAt)) {
            await this.deleteSession(token);
            return false;
        }

        return true;
    }

    private static isFingerprintMismatched(stored?: string | null, provided?: string): boolean {
        return !!(stored && provided && stored !== provided);
    }

    private static isSessionExpired(expiresAt: Date): boolean {
        return expiresAt < new Date();
    }

    private static isSessionIdleTimedOut(updatedAt: Date): boolean {
        const idleTimeoutMs = this.parseExpiration(env.SESSION_IDLE_TIMEOUT);
        const isIdle = (Date.now() - updatedAt.getTime()) > idleTimeoutMs;
        if (isIdle) console.log('[Auth] Session expired due to inactivity');
        return isIdle;
    }

    static async touchSession(token: string): Promise<void> {
        await prisma.session.update({
            where: { token },
            data: { updatedAt: new Date() }
        });
    }

    static async cleanupExpiredSessions(): Promise<void> {
        await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: new Date() }
            }
        });
    }

    private static parseExpiration(expiration: string): number {
        const UNITS: Record<string, number> = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
        };

        const match = expiration.match(/^(\d+)([smhd])$/);
        if (!match) return 7 * UNITS.d;

        const [_, value, unit] = match;
        return parseInt(value) * (UNITS[unit] || UNITS.d);
    }
}
