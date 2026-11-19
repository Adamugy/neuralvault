import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { env } from '../utils/env.js';
import { BadRequestError } from '../utils/errors.js';
import { GEMINI_MODEL } from './gemini.js';

/**
 * Chat models offered in the AI Tutor. A model is only offered when its provider key
 * is set on the server (Render env), so adding a key is all it takes to enable one.
 */
const MODELS: { id: string; label: string; provider: string; key?: string; create: (apiKey: string) => LanguageModel }[] = [
    { id: GEMINI_MODEL, label: 'Gemini 4 Hydrogen', provider: 'Google', key: env.GEMINI_API_KEY,
        create: apiKey => createGoogleGenerativeAI({ apiKey })(GEMINI_MODEL) },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', provider: 'Anthropic', key: env.ANTHROPIC_API_KEY,
        create: apiKey => createAnthropic({ apiKey })('claude-sonnet-5-5') },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', provider: 'OpenAI', key: env.OPENAI_API_KEY,
        create: apiKey => createOpenAI({ apiKey })('gpt-5.4-mini') },
    // Moonshot exposes an OpenAI-compatible Chat Completions API
    { id: 'kimi-k3', label: 'Kimi K3', provider: 'Moonshot', key: env.KIMI_API_KEY,
        create: apiKey => createOpenAI({ apiKey, baseURL: 'https://api.moonshot.ai/v1', name: 'moonshot' }).chat('kimi-k3') },
];

export const availableModels = () =>
    MODELS.filter(m => m.key).map(({ id, label, provider }) => ({ id, label, provider }));

/** Resolves the requested model, or the first available one when none is asked for. */
export function getChatModel(id?: string) {
    const enabled = MODELS.filter(m => m.key);
    const entry = id ? enabled.find(m => m.id === id) : enabled[0];
    if (!entry) throw new BadRequestError(id ? 'Modelo indisponível' : 'Nenhum modelo de IA configurado');
    return { id: entry.id, label: entry.label, model: entry.create(entry.key!) };
}
