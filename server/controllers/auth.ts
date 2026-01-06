import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { ensureUser } from '../services/user.js';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const user = await ensureUser(userId);
        res.json({ user: { clerkUserId: user.clerkUserId, plan: user.plan } });
    } catch (err) {
        next(err);
    }
};
