import { prisma } from './prisma.js';
import { AI_NOTICE_VERSION, ConsentType, PRIVACY_VERSION, TERMS_VERSION } from '../utils/legal.js';

export interface ConsentStatus {
    termsVersion: string | null;
    termsAcceptedAt: string | null;
    privacyVersion: string | null;
    privacyAcceptedAt: string | null;
    ageConfirmed: boolean;
    marketing: boolean;
    aiProcessing: boolean;
    /** True when the person accepted the current versions of the terms and privacy policy. */
    upToDate: boolean;
    currentTermsVersion: string;
    currentPrivacyVersion: string;
}

export class ConsentService {
    /** Appends consent records (never updates or deletes them). */
    static async record(
        userId: string,
        entries: { type: ConsentType; granted: boolean; version?: string | null }[],
        source: string,
    ) {
        if (!entries.length) return;
        await prisma.consentRecord.createMany({
            data: entries.map(e => ({ userId, type: e.type, granted: e.granted, version: e.version ?? null, source })),
        });
    }

    /** Latest record of each type for a person. */
    static async latest(userId: string) {
        const rows = await prisma.consentRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { type: true, granted: true, version: true, createdAt: true },
        });
        const byType = new Map<string, typeof rows[number]>();
        for (const r of rows) if (!byType.has(r.type)) byType.set(r.type, r);
        return byType;
    }

    static async status(userId: string): Promise<ConsentStatus> {
        const l = await this.latest(userId);
        const terms = l.get('terms');
        const privacy = l.get('privacy');
        const termsOk = !!terms?.granted && terms.version === TERMS_VERSION;
        const privacyOk = !!privacy?.granted && privacy.version === PRIVACY_VERSION;
        return {
            termsVersion: terms?.granted ? terms.version : null,
            termsAcceptedAt: terms?.granted ? terms.createdAt.toISOString() : null,
            privacyVersion: privacy?.granted ? privacy.version : null,
            privacyAcceptedAt: privacy?.granted ? privacy.createdAt.toISOString() : null,
            ageConfirmed: !!l.get('age_13')?.granted,
            marketing: !!l.get('marketing')?.granted,
            aiProcessing: !!l.get('ai_processing')?.granted && l.get('ai_processing')?.version === AI_NOTICE_VERSION,
            upToDate: termsOk && privacyOk,
            currentTermsVersion: TERMS_VERSION,
            currentPrivacyVersion: PRIVACY_VERSION,
        };
    }

    static async hasAiConsent(userId: string): Promise<boolean> {
        const row = await prisma.consentRecord.findFirst({
            where: { userId, type: 'ai_processing' },
            orderBy: { createdAt: 'desc' },
            select: { granted: true, version: true },
        });
        // An acceptance of an older notice (fewer AI providers) no longer counts
        return !!row?.granted && row.version === AI_NOTICE_VERSION;
    }
}
