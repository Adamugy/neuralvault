import { prisma } from './prisma.js';
import { RETENTION } from '../utils/legal.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes data whose retention period ended (docs/legal/RETENCAO-DE-DADOS.md).
 * Runs once at startup and then every 24 hours.
 */
export class RetentionService {
    static async runOnce() {
        const now = new Date();
        const [sessions, challenges, resets, unverified, aiUsage] = await Promise.all([
            prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
            prisma.passkeyChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
            prisma.user.updateMany({
                where: { resetTokenExpiry: { lt: now } },
                data: { resetToken: null, resetTokenExpiry: null },
            }),
            prisma.user.deleteMany({
                where: {
                    emailVerified: false,
                    createdAt: { lt: new Date(now.getTime() - RETENTION.UNVERIFIED_ACCOUNT_DAYS * DAY_MS) },
                },
            }),
            prisma.aiUsage.deleteMany({ where: { day: { lt: new Date(now.getTime() - RETENTION.AI_USAGE_DAYS * DAY_MS) } } }),
        ]);
        console.log(`[Retention] expired sessions=${sessions.count} challenges=${challenges.count} resetTokens=${resets.count} unverifiedAccounts=${unverified.count} aiUsage=${aiUsage.count}`);
    }

    static start() {
        const run = () => this.runOnce().catch(err => console.error('[Retention] cleanup failed', err?.message));
        run();
        setInterval(run, DAY_MS).unref();
    }
}
