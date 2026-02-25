import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputSvg = path.join(__dirname, '../public/favicon.svg');
const outputDir = path.join(__dirname, '../public');

const icons = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
    console.log('🚀 Starting icon generation...');

    if (!fs.existsSync(inputSvg)) {
        console.error(`❌ Error: Input SVG not found at ${inputSvg}`);
        process.exit(1);
    }

    try {
        for (const icon of icons) {
            const outputPath = path.join(outputDir, icon.name);

            // We read the SVG once and resize for each output
            // Note: Brain-circuit is stroke-based, so we might want to ensure it remains sharp
            await sharp(inputSvg)
                .resize(icon.size, icon.size)
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size})`);
        }

        console.log('✨ All icons generated successfully!');
    } catch (error) {
        console.error('❌ Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
