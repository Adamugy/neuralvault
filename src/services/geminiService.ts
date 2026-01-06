import { GoogleGenAI } from "@google/genai";
import { Resource } from "../types";

const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert Blob to Base64 (Standard for the SDK if not using Uri)
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  });
};

export const sendMessageToGemini = async (
  message: string,
  history: { role: 'user' | 'model'; content: string }[],
  useThinking: boolean = false
): Promise<string> => {
  if (!apiKey) return "Error: API Key is missing.";

  try {
    const modelName = 'gemini-3-flash-preview';

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: "You are an expert AI Assistant specialized in Deep Learning and Artificial Intelligence. You help students organize their knowledge, understand complex papers, and debug code. Be concise, accurate, and helpful. If the user speaks Portuguese, reply in Portuguese. If they speak English, reply in English.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "No response received.";

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return `Error communicating with Gemini: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const analyzeImageWithGemini = async (
  imageFile: File,
  prompt: string
): Promise<string> => {
  if (!apiKey) return "Error: API Key is missing.";

  try {
    const imagePart = await fileToGenerativePart(imageFile);

    // Using gemini-3-flash-preview for fast image analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: imagePart.inlineData },
            { text: prompt || "Analyze this image in the context of deep learning study." }
          ]
        }
      ]
    });

    return response.text || "No analysis generated.";

  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return `Error analyzing image: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const generateAcademicAssistance = async (
  taskType: 'outline' | 'draft' | 'refine' | 'abstract',
  topic: string,
  content: string,
  level: string
): Promise<string> => {
  if (!apiKey) return "Error: API Key is missing.";

  try {
    const model = 'gemini-3-pro-preview';

    let prompt = "";
    const systemInstruction = `You are an expert academic advisor and scientific writer acting as a mentor for a ${level} student. Your tone should be formal, objective, and academically rigorous. `;

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
    }

    const response = await ai.models.generateContent({
      model: model,
      config: {
        systemInstruction,
        maxOutputTokens: 8192
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    return response.text || "Could not generate content.";

  } catch (error) {
    console.error("Gemini Academic Error:", error);
    return `Error generating content: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const organizeResourcesWithAI = async (
  query: string,
  resources: Resource[],
  level: string
): Promise<string> => {
  if (!apiKey) return "Error: API Key is missing.";

  try {
    const model = 'gemini-pro-latest';

    const resourceList = resources.map(r => ({
      title: r.title,
      type: r.type,
      tags: r.tags.join(', '),
      notes: r.notes,
      date: new Date(r.dateAdded).toLocaleDateString()
    }));

    const systemInstruction = `You are an expert academic librarian and research advisor for a ${level} student.`;

    const prompt = `
      User Query/Goal: "${query}"
      
      Below is the student's personal library of resources (JSON format):
      ${JSON.stringify(resourceList)}
      
      Task:
      1. Analyze the user's library in relation to their goal.
      2. Select the most relevant resources from the list.
      3. Create a "Study Plan" or "Research Roadmap" that organizes these resources logically.
      4. For each section of the plan, explain *why* that specific resource is useful for their goal.
      5. Identify any gaps: what key topics are missing from their library given their goal?
      
      Output Format: Markdown. Use bolding for resource titles so they stand out.
    `;

    const response = await ai.models.generateContent({
      model: model,
      config: {
        systemInstruction,
        maxOutputTokens: 4096
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    return response.text || "Could not organize resources.";

  } catch (error) {
    console.error("Gemini Organizer Error:", error);
    return `Error organizing resources: ${error instanceof Error ? error.message : String(error)}`;
  }
};