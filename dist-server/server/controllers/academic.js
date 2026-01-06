import { getAuth } from '@clerk/express';
import { ai, fileToGenerativePart } from '../services/gemini.js';
export const generate = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { taskType, topic, content, level } = req.body;
        const files = req.files;
        if (!taskType || !level) {
            return res.status(400).json({ error: 'Missing taskType or level' });
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
        const result = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            config: {
                systemInstruction,
                maxOutputTokens: 16384
            },
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        ...imageParts.map(p => ({ inlineData: p.inlineData }))
                    ]
                }
            ]
        });
        res.json({ result: result.text });
    }
    catch (err) {
        console.error("Gemini Server Error:", err);
        res.status(500).json({ error: 'Failed to generate content' });
    }
};
