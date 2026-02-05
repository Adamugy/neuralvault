import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { UnauthorizedError } from '../utils/errors.js';

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
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[Auth] Missing or invalid Authorization header');
            throw new UnauthorizedError();
        }

        const token = authHeader.substring(7);

        // Verify and decode token
        const decoded = AuthService.verifyToken(token);

        // Validate session exists and is not expired
        const isValid = await AuthService.validateSession(token);
        if (!isValid) {
            console.log('[Auth] Invalid or expired session');
            throw new UnauthorizedError();
        }

        // Attach user info to request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;

        // Reset inactivity timer
        await AuthService.touchSession(token);

        console.log('[Auth] Authenticated user:', decoded.userId);
        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        console.error('[Auth] Error verifying token:', error);
        throw new UnauthorizedError();
    }
};
