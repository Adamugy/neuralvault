import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
const execPromise = promisify(exec);
export class DocumentGenerator {
    static tempDir = path.join(os.tmpdir(), 'neuralvault-gen');
    static async generatePDF(data) {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        const jobId = crypto.randomUUID();
        const baseFileName = `doc-${jobId}`;
        const qmdPath = path.join(this.tempDir, `${baseFileName}.qmd`);
        const pdfPath = path.join(this.tempDir, `${baseFileName}.pdf`);
        const qmdContent = this.constructQmd(data);
        try {
            // Write QMD file
            await fs.promises.writeFile(qmdPath, qmdContent, 'utf-8');
            // Render to PDF using Quarto and Typst
            // --to typst triggers the typst output format
            const command = `quarto render "${qmdPath}" --to typst`;
            await execPromise(command);
            // Read the generated PDF
            if (!fs.existsSync(pdfPath)) {
                throw new Error('PDF output not found after render');
            }
            const pdfBuffer = await fs.promises.readFile(pdfPath);
            return pdfBuffer;
        }
        catch (error) {
            console.error('[DocumentGenerator Error]', error);
            throw new Error(`Failed to generate document: ${error.message}`);
        }
        finally {
            // Cleanup temp files asynchronously
            this.cleanup(qmdPath, pdfPath).catch(err => console.warn('[Cleanup Warning]', err));
        }
    }
    static constructQmd(data) {
        const { title, content, latexFormula } = data;
        const yamlHeader = `---
title: "${title}"
format:
  typst:
    margin:
      x: 1.5cm
      y: 1.5cm
---

`;
        let body = content;
        if (latexFormula) {
            body += `\n\n### Mathematical Formulation\n\n$$ ${latexFormula} $$\n`;
        }
        return yamlHeader + body;
    }
    static async cleanup(...filePaths) {
        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath).catch(() => { });
            }
        }
    }
}
