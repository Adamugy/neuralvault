import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';

export interface ConsentStatus {
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  privacyVersion: string | null;
  privacyAcceptedAt: string | null;
  ageConfirmed: boolean;
  marketing: boolean;
  aiProcessing: boolean;
  upToDate: boolean;
  currentTermsVersion: string;
  currentPrivacyVersion: string;
}

interface ConsentContextValue {
  consents: ConsentStatus | null;
  acceptLegal: () => Promise<void>;
  setConsent: (type: 'marketing' | 'ai_processing', granted: boolean, source?: 'settings' | 'ai_notice') => Promise<void>;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export const useConsents = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsents must be used inside ConsentProvider');
  return ctx;
};

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consents, setConsents] = useState<ConsentStatus | null>(null);

  const call = useCallback(async (init?: RequestInit) => {
    const res = await fetch('/api/auth/consents', {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    if (!res.ok) throw new Error('Consent request failed');
    const data = await res.json();
    setConsents(data.consents);
  }, []);

  useEffect(() => { call().catch(() => {}); }, [call]);

  const acceptLegal = useCallback(() => call({ method: 'POST', body: JSON.stringify({ acceptLegal: true }) }), [call]);
  const setConsent = useCallback(
    (type: 'marketing' | 'ai_processing', granted: boolean, source: 'settings' | 'ai_notice' = 'settings') =>
      call({ method: 'POST', body: JSON.stringify({ type, granted, source }) }),
    [call]
  );

  return (
    <ConsentContext.Provider value={{ consents, acceptLegal, setConsent }}>
      {children}
      {consents && !consents.upToDate && <ReconsentModal onAccept={acceptLegal} />}
    </ConsentContext.Provider>
  );
};

/** Blocking dialog for people who have not accepted the current terms (existing accounts, new versions). */
const ReconsentModal: React.FC<{ onAccept: () => Promise<void> }> = ({ onAccept }) => {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="reconsent-title" className="w-full max-w-md bg-canvas rounded-xl p-6 shadow-lift">
        <ShieldCheck className="w-8 h-8 text-primary mb-3" aria-hidden="true" />
        <h2 id="reconsent-title" className="font-display text-2xl text-ink mb-2">Termos e privacidade</h2>
        <p className="text-sm text-body mb-4">
          Para continuar a usar o NeuralVault, lê e aceita os Termos de Utilização e a Política de Privacidade.
        </p>
        <label className="flex items-start gap-3 text-sm text-body-strong mb-4 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]" />
          <span>
            Li e aceito os <Link to="/termos" target="_blank" className="text-primary underline underline-offset-2">Termos de Utilização</Link> e
            a <Link to="/privacidade" target="_blank" className="text-primary underline underline-offset-2">Política de Privacidade</Link>.
          </span>
        </label>
        {error && <p role="alert" className="text-sm text-error mb-3">{error}</p>}
        <button
          disabled={!checked || busy}
          onClick={async () => {
            setBusy(true); setError('');
            try { await onAccept(); } catch { setError('Não foi possível guardar. Tenta de novo.'); } finally { setBusy(false); }
          }}
          className="w-full h-11 bg-primary hover:bg-primary-active text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Aceitar e continuar
        </button>
      </div>
    </div>
  );
};

/** Shown in place of an AI feature until the person accepts (or after refusing) the AI notice. */
export const AiConsentGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { consents, setConsent } = useConsents();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!consents) return null;
  if (consents.aiProcessing) return <>{children}</>;

  return (
    <div className="h-full flex items-center justify-center">
      <section aria-labelledby="ai-notice-title" className="max-w-xl w-full bg-card border border-hairline rounded-xl p-6 md:p-8">
        <Sparkles className="w-8 h-8 text-primary mb-3" aria-hidden="true" />
        <h2 id="ai-notice-title" className="font-display text-3xl text-ink mb-3">Antes de usar a IA</h2>
        <ul className="space-y-2 text-sm text-body list-disc pl-5 mb-5">
          <li>O que escreves e os ficheiros que envias nas funcionalidades de IA são enviados ao fornecedor do modelo que escolheres: <strong>Google (Gemini)</strong>, <strong>Anthropic (Claude)</strong>, <strong>OpenAI (GPT)</strong> ou <strong>Moonshot AI (Kimi)</strong>. A análise de imagem e o Assistente Académico usam o Gemini.</li>
          <li>Se escolheres um modelo <strong>Kimi</strong>, o conteúdo vai para a Moonshot AI, em <strong>Singapura</strong>: um país sem nível de proteção de dados reconhecido pela UE, sem garantias contratuais, e a Moonshot <strong>pode usar o conteúdo para treinar modelos</strong>. Ao aceitar, consentes nessa transferência; para a evitar, usa outro modelo.</li>
          <li>Usamos o plano gratuito da API Gemini: nesse plano, a <strong>Google pode usar esse conteúdo para melhorar os seus produtos</strong>, e revisores humanos podem lê-lo.</li>
          <li>O AI Tutor pode ler a tua biblioteca (títulos, etiquetas, notas, pastas) para te ajudar a organizá-la. Só altera um recurso se aprovares a proposta, e nunca apaga.</li>
          <li>Não envies dados pessoais sensíveis (saúde, dados de terceiros, palavras-passe).</li>
          <li>O NeuralVault não usa os teus dados para treinar modelos próprios.</li>
          <li>As respostas são geradas por IA e podem conter erros.</li>
        </ul>
        <p className="text-sm text-muted mb-5">
          Podes mudar esta escolha em Definições → Privacidade. Recusar não afeta o resto da app.
          Mais detalhes na <Link to="/privacidade" target="_blank" className="text-primary underline underline-offset-2">Política de Privacidade</Link>.
        </p>
        {error && <p role="alert" className="text-sm text-error mb-3">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true); setError('');
              try { await setConsent('ai_processing', true, 'ai_notice'); } catch { setError('Não foi possível guardar. Tenta de novo.'); } finally { setBusy(false); }
            }}
            className="h-11 px-5 bg-primary hover:bg-primary-active text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            Aceito, usar a IA
          </button>
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); try { await setConsent('ai_processing', false, 'ai_notice'); } catch {} finally { setBusy(false); } }}
            className="h-11 px-5 border border-hairline-strong hover:border-ink text-ink rounded-md text-sm font-medium disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
      </section>
    </div>
  );
};
