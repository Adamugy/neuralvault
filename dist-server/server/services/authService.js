import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';
import { env } from '../utils/env.js';
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN || '7d';
export class AuthService {
    static async hashPassword(password) {
        return bcrypt.hash(password, SALT_ROUNDS);
    }
    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    /**
     * Constant-time password verification to prevent timing attacks.
     */
    static async verifyPasswordSafe(password, hash) {
        const DUMMY_HASH = '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNI9Xf92T46A.gXh9YhWWh2i2qy';
        const targetHash = hash || DUMMY_HASH;
        const isValid = await bcrypt.compare(password, targetHash);
        return hash ? isValid : false;
    }
    static generateToken(userId, email) {
        const payload = { userId, email };
        return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    static verifyToken(token) {
        try {
            return jwt.verify(token, env.JWT_SECRET);
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
    static async createSession(userId, token, contextFingerprint) {
        this.verifyToken(token);
        const expiresAt = new Date(Date.now() + this.parseExpiration(JWT_EXPIRES_IN));
        await prisma.session.create({
            data: { userId, token, expiresAt, contextFingerprint }
        });
    }
    static async deleteSession(token) {
        await prisma.session.deleteMany({
            where: { token }
        });
    }
    /**
     * Assesses session validity (expiry, idle timeout, fingerprint).
     */
    static async validateSession(token, contextFingerprint) {
        const session = await prisma.session.findUnique({ where: { token } });
        if (!session)
            return false;
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
    static isFingerprintMismatched(stored, provided) {
        return !!(stored && provided && stored !== provided);
    }
    static isSessionExpired(expiresAt) {
        return expiresAt < new Date();
    }
    static isSessionIdleTimedOut(updatedAt) {
        const idleTimeoutMs = this.parseExpiration(env.SESSION_IDLE_TIMEOUT);
        const isIdle = (Date.now() - updatedAt.getTime()) > idleTimeoutMs;
        if (isIdle)
            console.log('[Auth] Session expired due to inactivity');
        return isIdle;
    }
    static async touchSession(token) {
        await prisma.session.update({
            where: { token },
            data: { updatedAt: new Date() }
        });
    }
    static async cleanupExpiredSessions() {
        await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: new Date() }
            }
        });
    }
    static parseExpiration(expiration) {
        const UNITS = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
        };
        const match = expiration.match(/^(\d+)([smhd])$/);
        if (!match)
            return 7 * UNITS.d;
        const [_, value, unit] = match;
        return parseInt(value) * (UNITS[unit] || UNITS.d);
    }
}
