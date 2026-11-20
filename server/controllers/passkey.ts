import { Request, Response } from 'express';
import * as passkeyService from '../services/passkeyService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../services/prisma.js';
import { AuthService } from '../services/authService.js';
import { setSessionCookie } from '../utils/sessionCookie.js';
import { getContextFingerprint } from '../middleware/zeroTrust.js';

// Registration only adds a passkey to the signed-in account (requireApiAuth): the user
// comes from the session, never from the body, or anyone could add a passkey to any email.
export const registrationOptions = asyncHandler(async (req: Request, res: Response) => {
    const options = await passkeyService.getRegistrationOptions(req.userId!, req.userEmail!);
    res.json(options);
});

export const registrationVerify = asyncHandler(async (req: Request, res: Response) => {
    const { body } = req.body || {};
    if (!body) return res.status(400).json({ error: 'Credential body is required' });

    const verification = await passkeyService.verifyPasskeyRegistration(req.userId!, body);

    if (verification.verified) {
        res.json({ verified: true });
    } else {
        res.status(400).json({ verified: false, error: 'Verification failed' });
    }
});

export const loginOptions = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body; // Email is now optional

    try {
        const { options, challengeId } = await passkeyService.getAuthOptions(email);
        res.json({ options, challengeId });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

export const loginVerify = asyncHandler(async (req: Request, res: Response) => {
    const { email, body, challengeId } = req.body;
    if (!body) return res.status(400).json({ error: 'Credential body is required' });

    try {
        const result = await passkeyService.verifyPasskeyLogin(body, challengeId);

        if (result.verified && result.user) {
            const user = result.user;

            // Handle 2FA Persistence
            if (result.twoFactorRequired) {
                const tempToken = AuthService.generateTemp2FAToken(user.id, user.email);
                return res.json({
                    verified: true,
                    status: '2fa_required',
                    tempToken,
                    message: 'Two-factor authentication required'
                });
            }

            // Normal login: session in DB, token only in the httpOnly cookie
            const token = AuthService.generateToken(user.id, user.email);
            setSessionCookie(res, token, await AuthService.createSession(user.id, token, getContextFingerprint(req)));

            res.json({
                verified: true,
                status: 'success',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    plan: user.plan
                }
            });
        } else {
            res.status(400).json({ verified: false, error: 'Login verification failed' });
        }
    } catch (error: any) {
        console.error('[Passkey Controller Error]', error);
        res.status(400).json({ error: error.message });
    }
});
