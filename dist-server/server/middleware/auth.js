import { AuthService } from '../services/authService.js';
import { UnauthorizedError } from '../utils/errors.js';
/**
 * Middleware to verify JWT token from Authorization header.
 * Validates token and checks session in database.
 */
export const requireApiAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[Auth] Missing or invalid Authorization header');
            throw new UnauthorizedError();
        }
        const token = authHeader.substring(7);
        // Verify and decode token
        const decoded = AuthService.verifyToken(token);
        // Capture context fingerprint for security verification
        const { getContextFingerprint } = await import('./zeroTrust.js');
        const fingerprint = getContextFingerprint(req);
        // Validate session exists, is not expired, and matches context fingerprint
        const isValid = await AuthService.validateSession(token, fingerprint);
        if (!isValid) {
            console.log('[Auth] Invalid or expired session (or fingerprint mismatch)');
            throw new UnauthorizedError();
        }
        // Attach user info to request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        // Reset inactivity timer
        await AuthService.touchSession(token);
        console.log('[Auth] Authenticated user:', decoded.userId);
        next();
    }
    catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        console.error('[Auth] Error verifying token:', error);
        throw new UnauthorizedError();
    }
};
