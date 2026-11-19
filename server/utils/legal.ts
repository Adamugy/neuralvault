/**
 * Versions of the legal documents shown in the app (src/pages/legal/*).
 * Bump the matching version whenever the text of a document changes: every person
 * is then asked to accept again, and the new acceptance is recorded with this version.
 */
export const TERMS_VERSION = '2026-11-18';
export const PRIVACY_VERSION = '2026-11-19';
/** Version of the AI notice (which AI providers receive content). Bump it to ask everyone again. */
export const AI_NOTICE_VERSION = '2026-11-19';

export const CONSENT_TYPES = ['terms', 'privacy', 'age_13', 'marketing', 'ai_processing'] as const;
export type ConsentType = typeof CONSENT_TYPES[number];

/** Consents a person may change themselves after signup (terms/privacy/age are only accepted). */
export const USER_TOGGLEABLE_CONSENTS: ConsentType[] = ['marketing', 'ai_processing'];

/** Retention periods applied by the daily cleanup (see docs/legal/RETENCAO-DE-DADOS.md). */
export const RETENTION = {
    /** Accounts that never confirmed their email are deleted after this many days. */
    UNVERIFIED_ACCOUNT_DAYS: 30,
    /** Daily AI request counters (rate limit) are deleted after this many days. */
    AI_USAGE_DAYS: 90,
};
