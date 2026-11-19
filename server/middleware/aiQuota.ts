import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../services/prisma.js';
import { env } from '../utils/env.js';

/** Short burst limit per person (the daily quota below is the cost guard). */
export const aiBurstLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    keyGenerator: req => req.userId!,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'AI_RATE_LIMIT', message: 'Demasiados pedidos de IA seguidos. Espera um minuto.' },
});

/**
 * Daily AI quota per person, counted in the database so it survives restarts.
 * The increment is one atomic upsert, so parallel requests cannot slip past the limit.
 */
export const aiDailyQuota = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rows = await prisma.$queryRaw<{ count: number }[]>`
            INSERT INTO "AiUsage" ("userId", "day", "count") VALUES (${req.userId!}, CURRENT_DATE, 1)
            ON CONFLICT ("userId", "day") DO UPDATE SET "count" = "AiUsage"."count" + 1
            RETURNING "count"`;
        const used = Number(rows[0]?.count ?? 0);
        const limit = env.AI_DAILY_LIMIT;
        res.setHeader('X-AI-Remaining', String(Math.max(0, limit - used)));
        if (used > limit) {
            res.status(429).json({
                error: 'AI_DAILY_LIMIT',
                message: `Atingiste o limite diário de ${limit} pedidos de IA. O contador volta a zero amanhã.`,
                limit,
            });
            return;
        }
        next();
    } catch (err) {
        next(err);
    }
};

/** Everything an AI route needs after authentication and AI consent. */
export const aiLimits = [aiBurstLimiter, aiDailyQuota];
