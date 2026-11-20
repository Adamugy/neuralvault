import type { Request, Response, CookieOptions } from 'express';
import { env } from './env.js';

/**
 * The session JWT lives in an httpOnly cookie so page scripts (and any injected script) can't read it.
 * SameSite=Strict keeps other sites from sending it along (CSRF); the app and API share one origin.
 */
export const SESSION_COOKIE = 'nv_session';

const options = (): CookieOptions => ({
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
});

export const setSessionCookie = (res: Response, token: string, expires: Date) =>
    res.cookie(SESSION_COOKIE, token, { ...options(), expires });

export const clearSessionCookie = (res: Response) => res.clearCookie(SESSION_COOKIE, options());

export const readSessionCookie = (req: Request): string | undefined => {
    const pair = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`));
    return pair ? decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)) : undefined;
};

/** Session token from the cookie, or from an Authorization: Bearer header (API clients, tests). */
export const readSessionToken = (req: Request): string | undefined => {
    const cookie = readSessionCookie(req);
    if (cookie) return cookie;
    const header = req.headers.authorization;
    return header?.startsWith('Bearer ') ? header.substring(7) : undefined;
};
