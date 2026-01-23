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
    /**
     * Hash a password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    /**
     * Verify a password against a hash
     */
    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate a JWT token for a user
     */
    static generateToken(userId: string, email: string): string {
        const payload: JWTPayload = { userId, email };
        return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    }

    /**
     * Verify and decode a JWT token
     */
    static verifyToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Create a session in the database
     */
    static async createSession(userId: string, token: string): Promise<void> {
        const decoded = this.verifyToken(token);
        const expiresAt = new Date(Date.now() + this.parseExpiration(JWT_EXPIRES_IN));

        await prisma.session.create({
            data: {
                userId,
                token,
                expiresAt
            }
        });
    }

    /**
     * Delete a session from the database
     */
    static async deleteSession(token: string): Promise<void> {
        await prisma.session.deleteMany({
            where: { token }
        });
    }

    /**
     * Validate that a session exists and is not expired
     */
    static async validateSession(token: string): Promise<boolean> {
        const session = await prisma.session.findUnique({
            where: { token }
        });

        if (!session) return false;
        if (session.expiresAt < new Date()) {
            // Clean up expired session
            await this.deleteSession(token);
            return false;
        }

        return true;
    }

    /**
     * Clean up expired sessions
     */
    static async cleanupExpiredSessions(): Promise<void> {
        await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: new Date() }
            }
        });
    }

    /**
     * Parse expiration string to milliseconds
     */
    private static parseExpiration(expiration: string): number {
        const match = expiration.match(/^(\d+)([smhd])$/);
        if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 7 * 24 * 60 * 60 * 1000;
        }
    }
}
