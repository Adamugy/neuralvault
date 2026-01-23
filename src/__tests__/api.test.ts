/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';

// Mock AuthService
vi.mock('../../server/services/authService.js', () => ({
    AuthService: {
        verifyToken: vi.fn().mockReturnValue({ userId: 'test_user', email: 'test@test.com' }),
        validateSession: vi.fn().mockResolvedValue(true),
    }
}));

// Mock Prisma
vi.mock('@prisma/client', () => {
    return {
        PrismaClient: class {
            user = {
                findUnique: vi.fn().mockResolvedValue({ id: 'test_user', email: 'test@test.com', plan: 'free' }),
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

    it('GET /api/auth/me should return user info', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer test-token');

        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe('test_user');
        expect(res.body.user.plan).toBe('free');
    });

    it('GET /api/bootstrap should return empty lists initially', async () => {
        const res = await request(app)
            .get('/api/bootstrap')
            .set('Authorization', 'Bearer test-token');

        expect(res.status).toBe(200);
        expect(res.body.folders).toEqual([]);
        expect(res.body.resources).toEqual([]);
    });
});

