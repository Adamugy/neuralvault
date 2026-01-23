import { ai, fileToGenerativePart } from '../services/gemini.js';
import { BadRequestError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const generate = asyncHandler(async (req, res) => {
    const userId = req.userId; // From JWT auth middleware
    const { taskType, topic, content, level } = req.body;
    const files = req.files;
    if (!taskType || !level) {
        throw new BadRequestError('Missing taskType or level');
    }
    const systemInstruction = `You are an expert academic advisor and scientific writer acting as a mentor for a ${level} student. Your tone should be formal, objective, and academically rigorous. `;
    let prompt = "";
    switch (taskType) {
        case 'outline':
            prompt = `Create a comprehensive, structured outline for a scientific paper/TCC about "${topic}". Include chapter titles, section headings, and bullet points for key arguments to cover in each section. Suggest potential methodologies if applicable.`;
            break;
        case 'draft':
            prompt = `Write a first draft for a section about "${topic}". Use the following key points/context provided by the student: \n\n"${content}". \n\nEnsure the writing flows logically, uses appropriate academic vocabulary, and maintains a high standard of clarity.`;
            break;
        case 'refine':
            prompt = `Review and improve the following text. Enhance the clarity, academic tone, grammar, and flow. Point out any weak arguments. Text to refine: \n\n"${content}"`;
            break;
        case 'abstract':
            prompt = `Generate a structured abstract (Background, Methods, Results, Conclusion) for a paper about "${topic}". Use the following details: \n\n"${content}". \n\nKeep it under 300 words.`;
            break;
        case 'organize':
            prompt = `Goal: "${topic}". Analyze the uploaded context and provide a research roadmap. Content to analyze: "${content}"`;
            break;
        default:
            prompt = `Help me with the following academic task: ${taskType}. Topic: ${topic}. Context: ${content}`;
    }
    const imageParts = files ? files.map(file => fileToGenerativePart(file.path, file.mimetype)) : [];
    const model = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            maxOutputTokens: 16384,
        },
        systemInstruction,
    });
    const result = await model.generateContent([
        prompt,
        ...imageParts
    ]);
    const response = await result.response;
    res.json({ result: response.text() });
});
export const exportPdf = asyncHandler(async (req, res) => {
    const { title, content, latexFormula } = req.body;
    if (!title || !content) {
        throw new BadRequestError('Missing title or content');
    }
    const { DocumentGenerator } = await import('../services/documentGenerator.js');
    try {
        const pdfBuffer = await DocumentGenerator.generatePDF({
            title,
            content,
            latexFormula
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('[Export PDF Error]', error);
        res.status(500).json({ error: 'Failed to generate PDF. Make sure Quarto is installed on the server.' });
    }
});
