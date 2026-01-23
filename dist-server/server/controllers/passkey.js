import * as passkeyService from '../services/passkeyService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../services/prisma.js';
import { AuthService } from '../services/authService.js';
export const registrationOptions = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email is required' });
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({
            data: { email, name: email.split('@')[0] },
        });
    }
    const options = await passkeyService.getRegistrationOptions(user.id, email);
    res.json(options);
});
export const registrationVerify = asyncHandler(async (req, res) => {
    const { email, body } = req.body;
    if (!email || !body)
        return res.status(400).json({ error: 'Email and body are required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const verification = await passkeyService.verifyPasskeyRegistration(user.id, body);
    if (verification.verified) {
        res.json({ verified: true });
    }
    else {
        res.status(400).json({ verified: false, error: 'Verification failed' });
    }
});
export const loginOptions = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email is required' });
    try {
        const options = await passkeyService.getAuthOptions(email);
        res.json(options);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
export const loginVerify = asyncHandler(async (req, res) => {
    const { email, body } = req.body;
    if (!email || !body)
        return res.status(400).json({ error: 'Email and body are required' });
    try {
        const { verification, user } = await passkeyService.verifyPasskeyLogin(email, body);
        if (verification.verified) {
            const token = AuthService.generateToken(user.id, user.email);
            res.json({
                verified: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    plan: user.plan
                }
            });
        }
        else {
            res.status(400).json({ verified: false, error: 'Login verification failed' });
        }
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
