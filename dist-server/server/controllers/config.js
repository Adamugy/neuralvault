import { checkDatabaseConnection } from '../services/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getHealth = asyncHandler(async (req, res) => {
    const isDbConnected = await checkDatabaseConnection();
    res.json({
        ok: true,
        status: isDbConnected ? 'healthy' : 'degraded',
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
    });
});
export const getConfig = (req, res) => {
    res.json({
    // No client-side config needed anymore
    });
};
