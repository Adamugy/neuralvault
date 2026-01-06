/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';

// Mock Clerk
vi.mock('@clerk/express', () => ({
    clerkMiddleware: () => (req: any, res: any, next: any) => next(),
    getAuth: vi.fn().mockReturnValue({ userId: 'test_user' }),
}));

// Mock Prisma
vi.mock('@prisma/client', () => {
    return {
        PrismaClient: class {
            user = {
                upsert: vi.fn().mockResolvedValue({ clerkUserId: 'test_user', plan: 'free' }),
                findUnique: vi.fn(),
                update: vi.fn(),
            };
            folder = {
                findMany: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
                findFirst: vi.fn(),
                delete: vi.fn(),
            };
            resource = {
                findMany: vi.fn().mockResolvedValue([]),
                create: vi.fn(),
                findFirst: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            };
        }
    };
});

describe('API Endpoints Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GET /api/health should return ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    it('GET /api/me should return user info after ensuring user exists', async () => {
        const res = await request(app).get('/api/me');
        expect(res.status).toBe(200);
        expect(res.body.user.clerkUserId).toBe('test_user');
        expect(res.body.user.plan).toBe('free');
    });

    it('GET /api/bootstrap should return empty lists initially', async () => {
        const res = await request(app).get('/api/bootstrap');
        expect(res.status).toBe(200);
        expect(res.body.folders).toEqual([]);
        expect(res.body.resources).toEqual([]);
    });
});
