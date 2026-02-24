import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { validateFileContent, sanitizeSvg, reprocessImage, validateImageDimensions } from './security.js';
import { BadRequestError } from './errors.js';
import sharp from 'sharp';

describe('Security Utilities', () => {
    const testDir = path.join(process.cwd(), 'temp_test');

    beforeEach(async () => {
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('validateFileContent', () => {
        it('should allow valid png file', async () => {
            const filePath = path.join(testDir, 'test.png');
            // 1x1 white PNG
            const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
            await fs.writeFile(filePath, pngData);

            const result = await validateFileContent(filePath);
            expect(result.ext).toBe('.png');
            expect(result.mime).toBe('image/png');
        });

        it('should throw BadRequestError for spoofed file', async () => {
            const filePath = path.join(testDir, 'spoofed.png');
            await fs.writeFile(filePath, 'this is just a text file but named png');

            await expect(validateFileContent(filePath)).rejects.toThrow(BadRequestError);
        });

        it('should allow .txt files (no magic bytes)', async () => {
            const filePath = path.join(testDir, 'test.txt');
            await fs.writeFile(filePath, 'just some text');

            const result = await validateFileContent(filePath);
            expect(result.ext).toBe('.txt');
            expect(result.mime).toBe('text/plain');
        });
    });

    describe('sanitizeSvg', () => {
        it('should remove scripts from SVG', async () => {
            const filePath = path.join(testDir, 'malicious.svg');
            const maliciousSvg = `<svg><script>alert(1)</script><rect x="0" y="0" width="10" height="10" /></svg>`;
            await fs.writeFile(filePath, maliciousSvg);

            await sanitizeSvg(filePath);

            const sanitized = await fs.readFile(filePath, 'utf8');
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toContain('<rect');
        });
    });

    describe('validateImageDimensions', () => {
        it('should allow image within limits', async () => {
            const filePath = path.join(testDir, 'small.png');
            // 1x1 white PNG
            const smallPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
            await fs.writeFile(filePath, smallPng);

            await expect(validateImageDimensions(filePath, 'image/png')).resolves.not.toThrow();
        });

        it('should throw for image exceeding dimensions', async () => {
            // Generating a real large image is expensive, but we can mock or use a small file with large header if sharp allows it.
            // Sharp actually reads the header. Let's create a 5000x1 PNG header if possible, or just trust sharp for now.
            // For testing purposes, we'll use a file that sharp can at least read metadata from.

            // Actually, let's create a simple 5000x1 png using sharp itself for the test setup!
            const filePath = path.join(testDir, 'large.png');
            await sharp({
                create: {
                    width: 5000,
                    height: 1,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            }).png().toFile(filePath);

            await expect(validateImageDimensions(filePath, 'image/png')).rejects.toThrow(BadRequestError);
            await expect(validateImageDimensions(filePath, 'image/png')).rejects.toThrow(/exceed the limit/);
        });
    });
});
