/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Regression tests for two account-takeover bugs found in the 2026-11-19 audit.
const { prisma, getRegistrationOptions } = vi.hoisted(() => ({
    prisma: { user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() } },
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

    it('verify-email rejects an object token', async () => {
        const res = await request(app).post('/api/auth/verify-email').send({ token: { not: '' } });
        expect(res.status).toBe(400);
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
});
