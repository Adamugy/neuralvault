import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import resourcesRoutes from './routes/resources.js';
import academicRoutes from './routes/academic.js';
import aiRoutes from './routes/ai.js';
import configRoutes from './routes/config.js';
import passkeyRoutes from './routes/passkey.js';
import { uploadsDir } from './utils/upload.js';
import { env } from './utils/env.js';
import { errorHandler } from './middleware/error.js';
import { validateSessionContext } from './middleware/zeroTrust.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const isProduction = env.NODE_ENV === 'production';
// Helmet security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https://*.google.com", "https://*.nvaulty.online", "https://images.unsplash.com", "https://www.transparenttextures.com"],
            "script-src": ["'self'", "'unsafe-inline'", "https://esm.sh", "https://*.nvaulty.online", "https://challenges.cloudflare.com"],
            "script-src-elem": ["'self'", "'unsafe-inline'", "https://esm.sh", "https://*.nvaulty.online", "https://challenges.cloudflare.com"],
            "connect-src": ["'self'", "https://*.googleapis.com", "https://esm.sh", "https://*.nvaulty.online"],
            "worker-src": ["'self'", "blob:"],
            "frame-src": ["'self'", "https://challenges.cloudflare.com", "https://*.nvaulty.online"],
        },
    },
}));
app.use(compression());
app.use(cors({
    origin: env.CORS_ORIGIN || (isProduction ? undefined : 'http://localhost:3000'),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(validateSessionContext);
// Request logging
if (!isProduction) {
    app.use((req, res, next) => {
        console.log(`[Express] ${req.method} ${req.path}`);
        next();
    });
}
// Authentication routes configured
app.use('/api/auth', authRoutes);
// Static files
app.use('/uploads', express.static(uploadsDir));
// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api', resourcesRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api', configRoutes);
app.use('/api/auth', passkeyRoutes);
// Production Static Serving & SPA fallback
if (isProduction) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
        index: false,
        maxAge: '1y',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.js')) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
            else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|webp|svg|woff|woff2|eot|ttf|otf)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
            else {
                res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
            }
        },
    }));
    app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        }
        else {
            res.status(404).send('Not Found');
        }
    });
}
// Error Handler
app.use(errorHandler);
export default app;
