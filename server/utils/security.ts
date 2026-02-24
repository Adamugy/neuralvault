import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { SECURITY_CONFIG } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import { BadRequestError } from './errors.js';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

export const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.docx', '.svg'
];

export const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/svg+xml'
];

/**
 * Validates file content using magic bytes.
 * Returns the detected extension and mime type.
 */
export async function validateFileContent(filePath: string) {
    const type = await fileTypeFromFile(filePath);

    if (!type) {
        // Some files like .txt don't have magic bytes detectable by file-type
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.txt') {
            return { ext: '.txt', mime: 'text/plain' };
        }
        throw new BadRequestError('Could not determine file type');
    }

    const normalizedExt = `.${type.ext}`;

    if (!ALLOWED_EXTENSIONS.includes(normalizedExt) || !ALLOWED_MIME_TYPES.includes(type.mime)) {
        throw new BadRequestError(`File type ${type.mime} (${normalizedExt}) is not allowed`);
    }

    return { ext: normalizedExt, mime: type.mime };
}

/**
 * Sanitizes SVG content to prevent XSS.
 */
export async function sanitizeSvg(filePath: string) {
    const content = await fs.readFile(filePath, 'utf8');
    const sanitized = DOMPurify.sanitize(content);
    await fs.writeFile(filePath, sanitized, 'utf8');
}

/**
 * Reprocesses an image to strip metadata and polyglot payloads.
 */
export async function reprocessImage(filePath: string, extension: string) {
    const buffer = await fs.readFile(filePath);
    const tempPath = `${filePath}.temp`;

    let pipeline = sharp(buffer);

    // Sharp strips all metadata (EXIF, ICC profiles, etc.) by default during re-encode.
    // Do NOT call keepMetadata() here – that would preserve potentially malicious metadata.
    if (extension === '.jpg' || extension === '.jpeg') {
        await pipeline.jpeg({ quality: 90, mozjpeg: true }).toFile(tempPath);
    } else if (extension === '.png') {
        await pipeline.png({ compressionLevel: 9 }).toFile(tempPath);
    } else if (extension === '.webp') {
        await pipeline.webp({ quality: 80 }).toFile(tempPath);
    } else {
        return; // Don't reprocess other types
    }

    await fs.unlink(filePath);
    await fs.rename(tempPath, filePath);
}

/**
 * Reprocesses an image buffer to strip metadata.
 * Useful for in-memory processing before saving or converting to Base64.
 */
export async function reprocessImageFromBuffer(buffer: Buffer, extension: string): Promise<Buffer> {
    let pipeline = sharp(buffer);

    // Sharp strips all metadata by default.
    if (extension.match(/\.jpe?g$/i)) {
        return pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    } else if (extension.match(/\.png$/i)) {
        return pipeline.png({ compressionLevel: 9 }).toBuffer();
    } else if (extension.match(/\.webp$/i)) {
        return pipeline.webp({ quality: 80 }).toBuffer();
    }

    return buffer; // Return original if not a supported bitmap type
}

/**
 * Validates image dimensions to prevent decompression bombs.
 */
export async function validateImageDimensions(filePath: string, mime: string) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        return; // Only validate bitmap images
    }

    const metadata = await sharp(filePath).metadata();
    const MAX_DIMENSION = SECURITY_CONFIG.MAX_IMAGE_DIMENSION;

    if ((metadata.width || 0) > MAX_DIMENSION || (metadata.height || 0) > MAX_DIMENSION) {
        throw new BadRequestError(`Image dimensions exceed the limit of ${MAX_DIMENSION}x${MAX_DIMENSION}px`);
    }
}
