import { describe, it, expect, vi } from 'vitest';

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock('../services/prisma.js', () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock('../utils/env.js', () => ({ env: { AI_DAILY_LIMIT: 3 } }));

import { aiDailyQuota } from './aiQuota.js';

const call = async (count: number) => {
    queryRaw.mockResolvedValueOnce([{ count }]);
    const res: any = { headers: {}, setHeader(k: string, v: string) { this.headers[k] = v; } };
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    const next = vi.fn();
    await aiDailyQuota({ userId: 'u1' } as any, res, next);
    return { res, next };
};

describe('aiDailyQuota', () => {
    it('lets requests through up to the limit and reports what is left', async () => {
        const { res, next } = await call(3);
        expect(next).toHaveBeenCalledWith();
        expect(res.headers['X-AI-Remaining']).toBe('0');
    });

    it('answers 429 once the daily limit is passed', async () => {
        const { res, next } = await call(4);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json.mock.calls[0][0].error).toBe('AI_DAILY_LIMIT');
    });

    it('counts per session user, never from the request body', async () => {
        await call(1);
        expect(queryRaw.mock.calls.at(-1)!.slice(1)).toEqual(['u1']);
    });

    it('passes database errors to the error handler', async () => {
        queryRaw.mockRejectedValueOnce(new Error('db down'));
        const next = vi.fn();
        await aiDailyQuota({ userId: 'u1' } as any, {} as any, next);
        expect(next.mock.calls[0][0].message).toBe('db down');
    });
});
