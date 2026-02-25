import { ApiError } from '../utils/errors.js';
import { env } from '../utils/env.js';
export const errorHandler = (err, req, res, next) => {
    const isProduction = env.NODE_ENV === 'production';
    if (!isProduction || err.status >= 500 || (err instanceof ApiError && err.statusCode >= 400)) {
        const statusCode = (err instanceof ApiError) ? err.statusCode : (err.status || 500);
        console.error(`[Error ${statusCode}] ${req.method} ${req.path}:`, err.message);
        if (err.stack && !isProduction)
            console.error(err.stack);
    }
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            errors: err.errors.length > 0 ? err.errors : undefined,
        });
    }
    if (err.code?.startsWith('P')) {
        return res.status(400).json({
            error: 'DatabaseError',
            message: isProduction ? 'Database error occurred' : err.message,
            code: err.code,
        });
    }
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        error: statusCode === 500 ? 'InternalServerError' : 'Error',
        message: isProduction && statusCode === 500 ? 'Internal server error' : err.message,
        stack: !isProduction ? err.stack : undefined,
    });
};
