import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { UnauthorizedError } from '../utils/errors.js';
import { getContextFingerprint } from './zeroTrust.js';
import { readSessionToken } from '../utils/sessionCookie.js';

// Extend Express Request to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
        }
    }
}

/**
 * Middleware to verify JWT token from Authorization header.
 * Validates token and checks session in database.
 */
export const requireApiAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // httpOnly session cookie first; an Authorization: Bearer header still works for API clients
        const token = readSessionToken(req);
        if (!token) {
            console.log('[Auth] Missing session cookie or Authorization header');
            return next(new UnauthorizedError());
        }

        // Verify and decode token
        const decoded = AuthService.verifyToken(token);

        // Capture context fingerprint for security verification
        const fingerprint = getContextFingerprint(req);

        // Validate session exists, is not expired, and matches context fingerprint.
        // This also resets the inactivity timer (throttled to once a minute).
        const isValid = await AuthService.validateSession(token, fingerprint);
        if (!isValid) {
            console.log('[Auth] Invalid or expired session (or fingerprint mismatch)');
            return next(new UnauthorizedError());
        }

        // Attach user info to request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;

        console.log('[Auth] Authenticated user:', decoded.userId);
        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return next(error);
        }
        console.error('[Auth] Error verifying token:', error);
        return next(new UnauthorizedError());
    }
};
