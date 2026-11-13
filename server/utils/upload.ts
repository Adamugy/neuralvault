import multer from 'multer';
import crypto from 'crypto';
import { SECURITY_CONFIG } from './config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// UPLOADS_DIR lets hosting providers point uploads at a persistent disk
// (e.g. a Render Disk mounted at /var/data/uploads). Falls back to <repo>/uploads.
// Going up 2 levels because this is in server/utils/
export const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

export const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname || '');
            cb(null, `${crypto.randomUUID()}${ext}`);
        },
    }),
    limits: {
        fileSize: SECURITY_CONFIG.MAX_FILE_SIZE_BYTES,
    },
});
