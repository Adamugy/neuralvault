import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';
import { env } from '../utils/env.js';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err.message);
    if (err.stack) {
        console.error('[Error Stack]', err.stack);
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            errors: err.errors.length > 0 ? err.errors : undefined,
        });
    }

    // Handle Prisma errors
    if ((err as any).code?.startsWith('P')) {
        return res.status(400).json({
            error: 'DatabaseError',
            message: env.NODE_ENV === 'production' ? 'Erro de banco de dados' : err.message,
            code: (err as any).code,
        });
    }

    // Default error
    const statusCode = (err as any).status || 500;
    res.status(statusCode).json({
        error: 'InternalServerError',
        message: env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
