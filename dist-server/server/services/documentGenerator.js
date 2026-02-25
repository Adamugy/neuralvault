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
        return this.renderDocument(data, 'pdf');
    }
    static async generateDOCX(data) {
        return this.renderDocument(data, 'docx');
    }
    static async renderDocument(data, format) {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        const jobId = crypto.randomUUID();
        const baseFileName = `doc-${jobId}`;
        const qmdPath = path.join(this.tempDir, `${baseFileName}.qmd`);
        const outPath = path.join(this.tempDir, `${baseFileName}.${format}`);
        // Quarto output format mapping
        // pdf -> typst (or pdf), docx -> docx
        const quartoFormat = format === 'pdf' ? 'typst' : 'docx';
        const qmdContent = this.constructQmd(data, quartoFormat);
        try {
            await fs.promises.writeFile(qmdPath, qmdContent, 'utf-8');
            const command = `quarto render "${qmdPath}" --to ${quartoFormat}`;
            await execPromise(command);
            if (!fs.existsSync(outPath)) {
                throw new Error(`${format.toUpperCase()} output not found after render`);
            }
            const buffer = await fs.promises.readFile(outPath);
            return buffer;
        }
        catch (error) {
            console.error(`[DocumentGenerator ${format}]`, error);
            throw new Error(`Failed to generate ${format}: ${error.message}`);
        }
        finally {
            this.cleanup(qmdPath, outPath).catch(err => console.warn('[Cleanup Warning]', err));
        }
    }
    /**
     * Strips characters that could allow YAML header injection.
     * Newlines would break out of the title scalar and inject new YAML keys.
     * Double-quotes would prematurely close the quoted scalar.
     */
    static sanitizeYamlScalar(value) {
        return value
            .replace(/[\r\n]/g, ' ') // no newlines inside YAML scalar
            .replace(/"/g, '\"') // escape double-quotes
            .replace(/\x00/g, ''); // strip null bytes
    }
    static constructQmd(data, format) {
        const { title, content, latexFormula } = data;
        // Sanitize title to prevent YAML injection (Arbitrary File Read / RCE).
        const safeTitle = this.sanitizeYamlScalar(title);
        // Strip null bytes from body content as defence-in-depth.
        const safeContent = content.replace(/\x00/g, '');
        const yamlHeader = `---
title: "${safeTitle}"
format:
  ${format}:
    margin:
      x: 1.5cm
      y: 1.5cm
---

`;
        let body = safeContent;
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
