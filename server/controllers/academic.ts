import { Request, Response } from 'express';
import { ai, fileToGenerativePart } from '../services/gemini.js';
import { BadRequestError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../services/prisma.js';

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
        const newSession = await prisma.academicSession.create({
            data: {
                userId: userId!,
                title: topic || `Session ${new Date().toLocaleDateString()}`
            }
        });
        currentSessionId = newSession.id;
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

    const imageParts = files ? files.map(file => fileToGenerativePart(file.path, file.mimetype)) : [];

    const model = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            maxOutputTokens: 16384,
            responseMimeType: "application/json"
        },
        systemInstruction,
    });

    console.log(`[Academic] Generating for user ${userId}, session: ${currentSessionId}`);

    // Save User Message
    await prisma.academicMessage.create({
        data: {
            sessionId: currentSessionId,
            role: 'user',
            content: `Task: ${taskType}, Topic: ${topic}, Content: ${content?.substring(0, 100)}...`
        }
    });

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();
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

        res.json({
            result: parsedResponse.document, // Maintain compatibility
            thought: parsedResponse.thought,
            sessionId: currentSessionId,
            documentId
        });

    } catch (e) {
        console.error("AI Generation Error", e);
        // Fallback for non-JSON responses (robustness)
        res.json({
            result: "Error parsing AI response. Please try again.",
            thought: "I encountered an error processing your request.",
            sessionId: currentSessionId
        });
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
