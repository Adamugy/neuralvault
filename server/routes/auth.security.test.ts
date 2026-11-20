/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';

// Regression tests for two account-takeover bugs found in the 2026-11-19 audit.
const { prisma, getRegistrationOptions } = vi.hoisted(() => ({
    prisma: {
        user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
        session: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    },
    getRegistrationOptions: vi.fn(async () => ({ challenge: 'c' })),
}));

vi.mock('../utils/env.js', () => ({ env: { NODE_ENV: 'test', JWT_SECRET: 'x'.repeat(32), SESSION_IDLE_TIMEOUT: '30m' } }));
vi.mock('../services/prisma.js', () => ({ prisma }));
vi.mock('../services/mailService.js', () => ({ MailService: {} }));
vi.mock('../services/passkeyService.js', () => ({ getRegistrationOptions, verifyPasskeyRegistration: vi.fn() }));

import authRoutes from './auth.js';
import { errorHandler } from '../middleware/error.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

beforeEach(() => vi.clearAllMocks());

describe('auth security', () => {
    it('passkey registration needs a signed-in session', async () => {
        for (const path of ['registration-options', 'registration-verify']) {
            const res = await request(app).post(`/api/auth/passkey/${path}`).send({ email: 'victim@example.com', body: {} });
            expect(res.status).toBe(401);
        }
        expect(getRegistrationOptions).not.toHaveBeenCalled();
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('reset-password rejects an object token (Prisma filter injection)', async () => {
        const res = await request(app).post('/api/auth/reset-password').send({ token: { not: 'x' }, newPassword: 'newpassword123' });
        expect(res.status).toBe(400);
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('reset-password logs out every existing session', async () => {
        prisma.user.findFirst.mockResolvedValueOnce({ id: 'u1' });
        const res = await request(app).post('/api/auth/reset-password').send({ token: 'abc', newPassword: 'newpassword123' });
        expect(res.status).toBe(200);
        expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('signin puts the session in an httpOnly cookie, not in the response body', async () => {
        const passwordHash = await bcrypt.hash('correct-password', 4);
        const user = { id: 'u1', email: 'a@example.com', passwordHash, emailVerified: true, twoFactorEnabled: false, authenticators: [] };
        prisma.user.findUnique.mockResolvedValue(user);

        const res = await request(app).post('/api/auth/signin').set('User-Agent', 'test-agent')
            .send({ email: 'a@example.com', password: 'correct-password' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeUndefined();
        const cookie = String(res.headers['set-cookie']);
        expect(cookie).toMatch(/nv_session=[^;]+/);
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite=Strict/i);
        expect(cookie).toMatch(/Path=\/api/);

        // The cookie alone authenticates the next request
        const token = cookie.match(/nv_session=([^;]+)/)![1];
        const { data } = prisma.session.create.mock.calls[0][0];
        prisma.session.findUnique.mockResolvedValue({ ...data, updatedAt: new Date() });
        const me = await request(app).get('/api/auth/me').set('User-Agent', 'test-agent').set('Cookie', `nv_session=${token}`);
        expect(me.status).toBe(200);
        expect(me.body.user.id).toBe('u1');
    });

    it('signout deletes the session and clears the cookie, even without a valid session', async () => {
        const res = await request(app).post('/api/auth/signout').set('Cookie', 'nv_session=stale');
        expect(res.status).toBe(200);
        expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'stale' } });
        expect(String(res.headers['set-cookie'])).toMatch(/nv_session=;.*Expires=Thu, 01 Jan 1970/);
    });

    it('verify-email rejects an object token', async () => {
        const res = await request(app).post('/api/auth/verify-email').send({ token: { not: '' } });
        expect(res.status).toBe(400);
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
});
