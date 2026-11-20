/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression tests: academic sessions belonging to another user must be neither readable nor writable.
const { prisma } = vi.hoisted(() => ({
    prisma: {
        academicSession: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
        academicMessage: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0), create: vi.fn() },
    },
}));

vi.mock('../services/prisma.js', () => ({ prisma }));
vi.mock('../services/gemini.js', () => ({
    ai: { getGenerativeModel: vi.fn() }, fileToGenerativePart: vi.fn(), AI_REQUEST_OPTIONS: {}, GEMINI_MODEL: 'test',
}));

import { generate, getSessionMessages } from './academic.js';

// asyncHandler passes errors to next()
const run = (handler: any, req: any) => new Promise<any>((resolve) => {
    const res: any = { json: (b: unknown) => resolve({ body: b }), status: () => res };
    handler(req, res, (err: unknown) => resolve({ err }));
});

beforeEach(() => vi.clearAllMocks());

describe('academic session ownership', () => {
    it('history/:id only returns messages from the caller\'s sessions', async () => {
        await run(getSessionMessages, { params: { id: 's-other' }, userId: 'me' });
        expect(prisma.academicMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { sessionId: 's-other', session: { userId: 'me' } },
        }));
    });

    it('generate refuses a sessionId owned by someone else', async () => {
        prisma.academicSession.findFirst.mockResolvedValueOnce(null);
        const { err } = await run(generate, { userId: 'me', body: { taskType: 'outline', level: 'phd', sessionId: 's-other' } });
        expect(err?.statusCode ?? err?.status).toBe(404);
        expect(prisma.academicSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 's-other', userId: 'me' } }));
        expect(prisma.academicMessage.create).not.toHaveBeenCalled();
    });
});
