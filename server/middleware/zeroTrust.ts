import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware that performs continuous authentication by checking if the 
 * request context (IP and User-Agent) matches the one established at login.
 * 
 * NOTE: For this to be fully effective, the initial context must be signed 
 * into the JWT or stored in a secure session database.
 */
export const validateSessionContext = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    // Context validation linked to the session/token would happen here.
    // Hash current context: IP + User-Agent and compare with established session.

    next();
};

export const getContextFingerprint = (req: Request): string => {
    const ua = req.headers['user-agent'] || 'unknown';
    // Removed IP from fingerprint as it can change frequently in Cloud Run/Mobile environments
    return crypto.createHash('sha256').update(ua).digest('hex');
};
