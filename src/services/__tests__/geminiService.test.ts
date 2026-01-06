import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocking import.meta.env (must be before imports)
vi.mock('../../env.d.ts', () => ({}));

// Mocks
const mockChat = {
    sendMessage: vi.fn(),
};

vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            chats = {
                create: vi.fn().mockReturnValue(mockChat),
            }
            models = {
                generateContent: vi.fn(),
            }
        }
    };
});

describe('geminiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default success for each test
        mockChat.sendMessage.mockResolvedValue({ text: 'Mock AI Response' });
    });

    it('should send a message and return the mock response', async () => {
        const { sendMessageToGemini } = await import('../geminiService');
        const response = await sendMessageToGemini('Hello AI', []);
        expect(response).toBe('Mock AI Response');
    });

    it('should handle errors gracefully', async () => {
        const { sendMessageToGemini } = await import('../geminiService');
        mockChat.sendMessage.mockRejectedValue(new Error('API Down'));

        const response = await sendMessageToGemini('Fail me', []);
        expect(response).toContain('Error communicating with Gemini');
        expect(response).toContain('API Down');
    });
});
