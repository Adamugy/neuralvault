/**
 * Legal identity and facts shown in the Privacy Policy, Terms and footer.
 *
 * FILL IN before publishing. Empty fields are shown on the pages as
 * "[por preencher]" so nothing is invented. Keep the versions in sync with
 * server/utils/legal.ts (TERMS_VERSION / PRIVACY_VERSION).
 */
export const LEGAL = {
  controller: {
    /** Nome completo do responsável (pessoa singular). */
    name: 'Adamugy Agira Abudo Sarme Junior',
    /** NIF (Portugal) ou NUIT (Moçambique). */
    taxId: '335193188',
    /** Morada (pode ser profissional / domicílio fiscal). */
    address: 'Avenida Cidade Orense, n.º 34, 4.º Esq., 5000-691 Vila Real, Portugal',
    /** Email que recebe pedidos de privacidade, denúncias e contactos. */
    email: 'desiagira@gmail.com',
  },
  termsVersion: '2026-11-18',
  privacyVersion: '2026-11-20',
};

/** Companies that process users' data on our behalf (RGPD art. 28). */
export const PROCESSORS = [
  { name: 'Render Services, Inc.', role: 'Alojamento do servidor e dos ficheiros enviados', location: 'Servidores em Frankfurt (Alemanha); empresa sediada nos EUA' },
  { name: 'Neon (Databricks, Inc.)', role: 'Base de dados', location: 'Servidores em Frankfurt (Alemanha); empresa sediada nos EUA' },
  { name: 'Resend, Inc.', role: 'Envio de emails de confirmação e de recuperação de palavra-passe', location: 'Região UE (Irlanda); empresa sediada nos EUA' },
  { name: 'Google (Gemini API)', role: 'Funcionalidades de IA: AI Tutor (modelos Gemini), análise de imagem e assistente académico', location: 'EUA e outros países onde a Google opera' },
  { name: 'Anthropic, PBC (Claude API)', role: 'AI Tutor, quando escolhes um modelo Claude', location: 'EUA' },
  { name: 'OpenAI, L.L.C. (OpenAI API)', role: 'AI Tutor, quando escolhes um modelo GPT', location: 'EUA' },
  { name: 'Moonshot AI Pte. Ltd. (Kimi API)', role: 'AI Tutor, quando escolhes um modelo Kimi', location: 'Singapura (fora do Espaço Económico Europeu)' },
  { name: 'Cloudflare, Inc.', role: 'Rede de entrega e proteção usada pelo alojamento', location: 'Rede global; empresa sediada nos EUA' },
];

export const missing = (value: string) => value.trim() || '[por preencher]';
