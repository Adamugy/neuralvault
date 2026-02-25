import { Request, Response } from 'express';
import * as passkeyService from '../services/passkeyService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../services/prisma.js';
import { AuthService } from '../services/authService.js';

export const registrationOptions = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user = await prisma.user.findUnique({ where: { email } as any });

    if (!user) {
        user = await prisma.user.create({
            data: { email, name: email.split('@')[0] } as any,
        });
    }

    const options = await passkeyService.getRegistrationOptions((user as any).id, email);
    res.json(options);
});

export const registrationVerify = asyncHandler(async (req: Request, res: Response) => {
    const { email, body } = req.body;
    if (!email || !body) return res.status(400).json({ error: 'Email and body are required' });

    const user = await prisma.user.findUnique({ where: { email } as any });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const verification = await passkeyService.verifyPasskeyRegistration((user as any).id, body);

    if (verification.verified) {
        res.json({ verified: true });
    } else {
        res.status(400).json({ verified: false, error: 'Verification failed' });
    }
});

export const loginOptions = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const options = await passkeyService.getAuthOptions(email);
        res.json(options);
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

export const loginVerify = asyncHandler(async (req: Request, res: Response) => {
    const { email, body } = req.body;
    if (!body) return res.status(400).json({ error: 'Credential body is required' });

    try {
        const { verification, user } = await passkeyService.verifyPasskeyLogin(email, body);

        if (verification.verified) {
            const token = AuthService.generateToken((user as any).id, (user as any).email);

            res.json({
                verified: true,
                token,
                user: {
                    id: (user as any).id,
                    email: (user as any).email,
                    name: (user as any).name,
                    plan: (user as any).plan
                }
            });
        } else {
            res.status(400).json({ verified: false, error: 'Login verification failed' });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});
