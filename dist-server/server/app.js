import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import resourcesRoutes from './routes/resources.js';
import academicRoutes from './routes/academic.js';
import configRoutes from './routes/config.js';
import { uploadsDir } from './utils/upload.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
// Helmet security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https://*.clerk.com", "https://*.google.com", "https://*.nvaulty.online", "https://images.unsplash.com", "https://www.transparenttextures.com"],
            "script-src": ["'self'", "'unsafe-inline'", "https://*.clerk.com", "https://esm.sh", "https://*.nvaulty.online", "https://challenges.cloudflare.com"],
            "script-src-elem": ["'self'", "'unsafe-inline'", "https://*.clerk.com", "https://esm.sh", "https://*.nvaulty.online", "https://challenges.cloudflare.com"],
            "connect-src": ["'self'", "https://*.clerk.com", "https://*.googleapis.com", "https://esm.sh", "https://*.nvaulty.online"],
            "worker-src": ["'self'", "blob:"],
            "frame-src": ["'self'", "https://*.clerk.com", "https://challenges.cloudflare.com", "https://*.nvaulty.online"],
        },
    },
}));
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGIN || (isProduction ? undefined : 'http://localhost:3000'),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
// Webhook route MUST stay before express.json()
app.use('/api', billingRoutes); // billingRoutes handles /webhooks/stripe internally with raw body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Request logging
if (!isProduction) {
    app.use((req, res, next) => {
        console.log(`[Express] ${req.method} ${req.originalUrl}`);
        next();
    });
}
// Clerk Middleware
app.use(clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
}));
// Static files
app.use('/uploads', express.static(uploadsDir));
// API Routes
app.use('/api', authRoutes);
app.use('/api', resourcesRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api', configRoutes);
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
    app.get('*', async (req, res) => {
        try {
            const indexPath = path.join(distPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                let html = fs.readFileSync(indexPath, 'utf8');
                const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
                const headMatch = html.match(/<head>/i);
                if (headMatch) {
                    const injection = `<script>window.VITE_CLERK_PUBLISHABLE_KEY="${clerkKey}";</script>`;
                    const insertAt = headMatch.index + headMatch[0].length;
                    html = html.slice(0, insertAt) + injection + html.slice(insertAt);
                }
                res.setHeader('Content-Type', 'text/html');
                res.send(html);
            }
            else {
                res.status(404).send('Not Found');
            }
        }
        catch (err) {
            console.error('[Production] Error serving index.html:', err);
            res.status(500).send('Internal Server Error');
        }
    });
}
// Error Handler
const errorHandler = (err, req, res, next) => {
    console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err instanceof Error ? err.stack : err);
    const status = err.status || 500;
    res.status(status).json({
        error: 'Algo deu errado!',
        message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : (err instanceof Error ? err.message : 'Unknown error'),
    });
};
app.use(errorHandler);
export default app;
