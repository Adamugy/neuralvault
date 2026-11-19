import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { SECURITY_CONFIG } from './utils/config.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import resourcesRoutes from './routes/resources.js';
import academicRoutes from './routes/academic.js';
import aiRoutes from './routes/ai.js';
import configRoutes from './routes/config.js';

import { uploadsDir } from './utils/upload.js';
import { env } from './utils/env.js';
import { errorHandler } from './middleware/error.js';
import { validateSessionContext } from './middleware/zeroTrust.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = env.NODE_ENV === 'production';

if (isProduction) {
    app.set('trust proxy', 1);
    console.log('🛡️ Trust Proxy enabled for production (1 hop)');
}

setupSecurity(app);
setupRoutes(app);
if (isProduction) setupStaticServing(app);
app.use(errorHandler);

export default app;

function setupSecurity(app: express.Express) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "img-src": ["'self'", "data:", "blob:", "https://*.nvaulty.online"],
                "script-src": ["'self'", "'unsafe-inline'", "https://*.nvaulty.online"],
                "script-src-elem": ["'self'", "'unsafe-inline'", "https://*.nvaulty.online"],
                "connect-src": ["'self'", "https://*.nvaulty.online"],
                "worker-src": ["'self'", "blob:"],
                "frame-src": ["'self'", "https://*.nvaulty.online"],
            },
        },
    }));

    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        next();
    });

    app.use(compression());
    app.use(cors({
        origin: env.CORS_ORIGIN || (isProduction ? undefined : 'http://localhost:3000'),
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }));

    const apiLimiter = rateLimit({
        windowMs: SECURITY_CONFIG.API_WINDOW_MS,
        max: SECURITY_CONFIG.API_MAX_REQUESTS,
        message: { error: 'Too many requests from this IP' },
        standardHeaders: true,
        legacyHeaders: false,
        validate: false,
    });
    app.use('/api/', apiLimiter);
}

function setupRoutes(app: express.Express) {
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(validateSessionContext);

    if (!isProduction) {
        app.use((req, res, next) => {
            console.log(`[Express] ${req.method} ${req.path}`);
            next();
        });
    }

    const uploadLimiter = rateLimit({
        windowMs: SECURITY_CONFIG.UPLOAD_WINDOW_MS,
        max: SECURITY_CONFIG.UPLOAD_MAX_REQUESTS,
        message: { error: 'Upload limit exceeded' },
        standardHeaders: true,
        legacyHeaders: false,
        validate: false,
    });

    app.use(['/api/resources', '/api/ai/analyze-image', '/api/academic/generate'], uploadLimiter);

    app.use('/api/auth', authRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/academic', academicRoutes);
    app.use('/api', resourcesRoutes);
    app.use('/api', configRoutes);
}

function setupStaticServing(app: express.Express) {
    const distPath = path.join(process.cwd(), 'dist');

    app.use(express.static(distPath, {
        index: false,
        maxAge: '1y',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
            // Vite fingerprints everything in /assets (JS and CSS), so those never change.
            // Other static files (favicon, icons) keep their name, so they get a short cache.
            const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
            res.setHeader('Cache-Control', isHashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
        },
    }));

    app.get('*', (req: Request, res: Response) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            // Prevent aggressive caching of the entry point
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.sendFile(indexPath);
        } else {
            res.status(404).send('Not Found');
        }
    });
}
