import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { ai, fileToGenerativePart } from '../services/gemini.js';
import { BadRequestError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../services/prisma.js';
import { validateFileContent, sanitizeSvg, reprocessImage, validateImageDimensions } from '../utils/security.js';
import { SECURITY_CONFIG } from '../utils/config.js';

export const generate = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    const { taskType, topic, content, level, sessionId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!taskType || !level) {
        throw new BadRequestError('Missing taskType or level');
    }

    // Identify or Create Session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
        const sessionCount = await prisma.academicSession.count({ where: { userId: userId! } });
        if (sessionCount >= SECURITY_CONFIG.MAX_SESSIONS_PER_USER) {
            throw new BadRequestError(`Session limit reached. Please delete old academic sessions.`);
        }

        const newSession = await prisma.academicSession.create({
            data: {
                userId: userId!,
                title: topic || `Session ${new Date().toLocaleDateString()}`
            }
        });
        currentSessionId = newSession.id;
    } else {
        // Limit messages per session
        const messageCount = await prisma.academicMessage.count({ where: { sessionId: currentSessionId } });
        if (messageCount >= SECURITY_CONFIG.MAX_MESSAGES_PER_SESSION) {
            throw new BadRequestError(`Message limit reached for this session. Please start a new session.`);
        }
    }

    const systemInstruction = `You are an expert academic advisor acting as a mentor for a ${level} student. 
    Your goal is to be helpful, encouraging, and academically rigorous.
    
    IMPORTANT: You must return your response in a strict JSON format.
    Do not include markdown code blocks (like \`\`\`json). Just the raw JSON object.
    
    Structure:
    {
      "thought": "A brief, friendly, conversational comment to the student explanations or encouragement.",
      "document": "The actual academic content (outline, draft, abstract, etc.) in Markdown format."
    }
    `;

    let prompt = "";
    switch (taskType) {
        case 'outline':
            prompt = `Task: Create a structured outline for "${topic}".`;
            break;
        case 'draft':
            prompt = `Task: Write a draft section about "${topic}". Context: "${content}".`;
            break;
        case 'refine':
            prompt = `Task: Refine this text: "${content}".`;
            break;
        case 'abstract':
            prompt = `Task: Generate an abstract for "${topic}". Details: "${content}".`;
            break;
        case 'organize':
            prompt = `Task: Create a research roadmap for "${topic}". Context: "${content}".`;
            break;
        default:
            prompt = `Task: ${taskType}. Topic: ${topic}. Context: ${content}`;
    }

    if (files && files.length > 0) {
        for (const file of files) {
            try {
                const { ext, mime } = await validateFileContent(file.path);

                // Resource Limits: Dimension check
                await validateImageDimensions(file.path, mime);

                if (mime === 'image/svg+xml') await sanitizeSvg(file.path);
                if (['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
                    await reprocessImage(file.path, ext);
                }
                const currentExt = path.extname(file.filename);
                if (currentExt !== ext) {
                    const newFilename = `${file.filename}${ext}`;
                    const newPath = path.join(path.dirname(file.path), newFilename);
                    await fs.rename(file.path, newPath);
                    file.path = newPath;
                    file.filename = newFilename;
                }
                file.mimetype = mime;
            } catch (error) {
                // Cleanup all files on any failure
                for (const f of files) {
                    await fs.unlink(f.path).catch(() => { });
                }
                throw error;
            }
        }
    }

    const imageParts = files ? files.map(file => fileToGenerativePart(file.path, file.mimetype)) : [];

    const model = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            maxOutputTokens: 16384,
            responseMimeType: "application/json"
        },
        systemInstruction,
    });

    console.log(`[Academic] Generating for user ${userId}, session: ${currentSessionId}, taskType: ${taskType}`);

    try {
        // Save User Message (inside try-catch to catch FK/DB errors on invalid sessionId)
        await prisma.academicMessage.create({
            data: {
                sessionId: currentSessionId,
                role: 'user',
                content: `Task: ${taskType}, Topic: ${topic}, Content: ${typeof content === 'string' ? content.substring(0, 100) : JSON.stringify(content ?? '').substring(0, 100)}...`
            }
        });

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();
        console.log(`[Academic] Gemini response received, length: ${responseText.length}`);
        const parsedResponse = JSON.parse(responseText);

        // Save Assistant Message (The thought)
        await prisma.academicMessage.create({
            data: {
                sessionId: currentSessionId,
                role: 'assistant',
                content: parsedResponse.thought
            }
        });

        // Save generated document if present
        let documentId = null;
        if (parsedResponse.document) {
            const docCount = await prisma.generatedDocument.count({ where: { userId: userId! } });
            if (docCount >= SECURITY_CONFIG.MAX_DOCUMENTS_PER_USER) {
                // If quota full, we just don't save the document but return it to user
                console.warn(`User ${userId} reached document quota. documentId will be null.`);
            } else {
                const savedDoc = await prisma.generatedDocument.create({
                    data: {
                        userId: userId!,
                        title: topic || 'Untitled Generation',
                        content: parsedResponse.document,
                        type: taskType
                    }
                });
                documentId = savedDoc.id;
            }
        }

        res.json({
            result: parsedResponse.document, // Maintain compatibility
            thought: parsedResponse.thought,
            sessionId: currentSessionId,
            documentId
        });
    } catch (e: any) {
        const errMsg = e?.message || String(e);
        console.error(`[Academic] CRASH for user ${userId} session ${currentSessionId}: ${errMsg}`);
        if (e?.code) console.error(`[Academic] Error code: ${e.code}`, JSON.stringify(e?.meta || {}));
        // Fallback response (avoid hard 500)
        res.json({
            result: "Error parsing AI response. Please try again.",
            thought: "I encountered an error processing your request.",
            sessionId: currentSessionId
        });
    } finally {
        // Hard Invariant: All transient files must be cleaned up from the uploads directory
        if (files && files.length > 0) {
            for (const file of files) {
                await fs.unlink(file.path).catch((err) => {
                    console.error(`[Academic Cleanup] Failed to unlink ${file.path}:`, err.message);
                });
            }
        }
    }
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;

    const sessions = await prisma.academicSession.findMany({
        where: { userId: userId! },
        orderBy: { updatedAt: 'desc' },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
                take: 1
            }
        },
        take: 20
    });

    res.json(sessions);
});

export const getSessionMessages = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const messages = await prisma.academicMessage.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
});

export const getGallery = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;

    const docs = await prisma.generatedDocument.findMany({
        where: { userId: userId! },
        orderBy: { createdAt: 'desc' }
    });

    res.json(docs);
});


export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
    const { title, content, latexFormula } = req.body;
    if (!title || !content) throw new BadRequestError('Missing title or content');

    const { DocumentGenerator } = await import('../services/documentGenerator.js');

    try {
        const pdfBuffer = await DocumentGenerator.generatePDF({ title, content, latexFormula });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.pdf"`);
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('[Export PDF Error]', error);
        res.status(500).json({ error: 'Failed to generate PDF.' });
    }
});

export const exportDocx = asyncHandler(async (req: Request, res: Response) => {
    const { title, content, latexFormula } = req.body;
    if (!title || !content) throw new BadRequestError('Missing title or content');

    const { DocumentGenerator } = await import('../services/documentGenerator.js');

    try {
        const buffer = await DocumentGenerator.generateDOCX({ title, content, latexFormula });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.docx"`);
        res.send(buffer);
    } catch (error: any) {
        console.error('[Export DOCX Error]', error);
        res.status(500).json({ error: 'Failed to generate DOCX.' });
    }
});
