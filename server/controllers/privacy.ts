import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../services/prisma.js';
import { AuthService } from '../services/authService.js';
import { ConsentService } from '../services/consentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { ConsentType, PRIVACY_VERSION, TERMS_VERSION, USER_TOGGLEABLE_CONSENTS } from '../utils/legal.js';
import { uploadsDir } from '../utils/upload.js';

/**
 * GET /api/auth/consents
 * What the signed-in person has accepted (and whether the current terms are accepted).
 */
export const getConsents = asyncHandler(async (req: Request, res: Response) => {
    res.json({ consents: await ConsentService.status(req.userId!) });
});

/**
 * POST /api/auth/consents
 * Body: { acceptLegal: true } to accept the current terms + privacy policy, or
 *       { type: 'marketing' | 'ai_processing', granted: boolean } to change an optional consent.
 */
export const updateConsent = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { acceptLegal, type, granted, source } = req.body || {};

    if (acceptLegal === true) {
        await ConsentService.record(userId, [
            { type: 'terms', granted: true, version: TERMS_VERSION },
            { type: 'privacy', granted: true, version: PRIVACY_VERSION },
        ], 'reconsent');
    } else {
        if (!USER_TOGGLEABLE_CONSENTS.includes(type as ConsentType) || typeof granted !== 'boolean') {
            throw new BadRequestError('Invalid consent change');
        }
        const allowedSources = ['settings', 'ai_notice'];
        await ConsentService.record(userId, [{ type: type as ConsentType, granted }],
            allowedSources.includes(source) ? source : 'settings');
    }

    res.json({ consents: await ConsentService.status(userId) });
});

/**
 * Blocks AI endpoints until the person accepted the AI processing notice
 * (content is sent to Google Gemini; on the free tier Google may use it to improve its products).
 */
export const requireAiConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (await ConsentService.hasAiConsent(req.userId!)) return next();
        res.status(403).json({
            error: 'AI_CONSENT_REQUIRED',
            message: 'Aceite o aviso sobre o tratamento por IA para usar esta funcionalidade.',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me/export
 * Everything the app stores about the signed-in person, as a JSON download (RGPD arts. 15 and 20).
 * Secrets (password hash, 2FA secret, tokens, passkey keys) are deliberately left out.
 */
export const exportMyData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true, email: true, name: true, lastName: true, role: true, avatarUrl: true, plan: true,
            emailVerified: true, twoFactorEnabled: true, createdAt: true, updatedAt: true,
            folders: { select: { id: true, name: true, createdAt: true, updatedAt: true } },
            resources: {
                select: {
                    id: true, type: true, title: true, url: true, fileName: true, fileType: true, tags: true,
                    notes: true, completed: true, folderId: true, dateAdded: true, createdAt: true, updatedAt: true,
                },
            },
            academicSessions: {
                select: {
                    id: true, title: true, createdAt: true, updatedAt: true,
                    messages: { select: { role: true, content: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
                },
            },
            generatedDocs: { select: { id: true, title: true, type: true, content: true, createdAt: true } },
            sessions: { select: { createdAt: true, updatedAt: true, expiresAt: true } },
            authenticators: { select: { id: true, credentialDeviceType: true, credentialBackedUp: true, transports: true } },
            consents: { select: { type: true, version: true, granted: true, source: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        },
    });
    if (!user) throw new UnauthorizedError();

    const payload = {
        exportedAt: new Date().toISOString(),
        note: 'Ficheiros enviados (PDF, imagens) não vão neste JSON; descarregue-os a partir da biblioteca.',
        data: user,
    };
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="neuralvault-dados-${date}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify(payload, null, 2));
});

/**
 * DELETE /api/auth/me
 * Deletes the account and all its data (RGPD art. 17). Body: { confirm: 'APAGAR', password? }.
 * People with a password must type it; passkey-only accounts confirm with the word.
 */
export const deleteMyAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { confirm, password } = req.body || {};
    if (confirm !== 'APAGAR') throw new BadRequestError('Escreva APAGAR para confirmar.');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, resources: { select: { fileUrl: true } } },
    });
    if (!user) throw new UnauthorizedError();
    if (user.passwordHash) {
        const ok = typeof password === 'string' && await AuthService.verifyPassword(password, user.passwordHash);
        if (!ok) throw new UnauthorizedError('Palavra-passe incorreta.');
    }

    // Uploaded files live on disk, outside the database cascade
    for (const r of user.resources) {
        if (!r.fileUrl) continue;
        try {
            await fs.unlink(path.join(uploadsDir, path.basename(r.fileUrl)));
        } catch (err: any) {
            if (err?.code !== 'ENOENT') console.error('[Privacy] Could not delete uploaded file', err?.code);
        }
    }

    // Folders, resources, sessions, passkeys, academic data and consent records cascade
    await prisma.user.delete({ where: { id: userId } });
    console.log('[Privacy] Account deleted on request');
    res.json({ message: 'Conta e dados apagados.' });
});
