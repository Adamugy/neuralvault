import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConsents } from '../contexts/ConsentContext';

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso)) : '—';

const Toggle: React.FC<{ id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> =
  ({ id, label, description, checked, onChange, disabled }) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-hairline">
      <div>
        <label htmlFor={id} className="font-medium text-ink cursor-pointer">{label}</label>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 shrink-0 accent-[var(--color-primary)] cursor-pointer"
      />
    </div>
  );

export const PrivacySettings: React.FC = () => {
  const { getToken, signOut, user } = useAuth();
  const { consents, setConsent } = useConsents();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const toggle = async (type: 'marketing' | 'ai_processing', granted: boolean) => {
    setBusy(type); setMessage('');
    try { await setConsent(type, granted, 'settings'); setMessage('Preferência guardada.'); }
    catch { setMessage('Não foi possível guardar. Tenta de novo.'); }
    finally { setBusy(null); }
  };

  const exportData = async () => {
    setBusy('export'); setMessage('');
    try {
      const token = await getToken();
      const res = await fetch('/api/auth/me/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neuralvault-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { setMessage('Não foi possível exportar. Tenta de novo.'); }
    finally { setBusy(null); }
  };

  const deleteAccount = async () => {
    setBusy('delete'); setDeleteError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: confirmText, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Não foi possível apagar a conta.');
      await signOut().catch(() => {});
      navigate('/', { replace: true });
    } catch (err: any) {
      setDeleteError(err.message || 'Não foi possível apagar a conta.');
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-10 max-w-2xl" lang="pt-PT">
      <section>
        <h3 className="text-xl font-semibold text-ink mb-1">Privacidade</h3>
        <p className="text-sm text-muted">Controla o que aceitas, descarrega os teus dados ou apaga a conta. Tudo sem custos.</p>
        {message && <p role="status" className="mt-3 text-sm text-body">{message}</p>}
      </section>

      <section aria-labelledby="consents-title">
        <h4 id="consents-title" className="font-medium text-ink mb-1">Consentimentos</h4>
        <Toggle
          id="consent-ai"
          label="Funcionalidades de IA (Google, Anthropic, OpenAI)"
          description="O conteúdo que envias ao AI Tutor é processado pelo fornecedor do modelo escolhido; a análise de imagem e o Assistente Académico usam a Google. No plano gratuito do Gemini, a Google pode usar o conteúdo para melhorar os seus produtos."
          checked={!!consents?.aiProcessing}
          disabled={!consents || busy === 'ai_processing'}
          onChange={v => toggle('ai_processing', v)}
        />
        <Toggle
          id="consent-marketing"
          label="Comunicações de marketing por email"
          description="Novidades e dicas do NeuralVault. Podes retirar este consentimento a qualquer momento."
          checked={!!consents?.marketing}
          disabled={!consents || busy === 'marketing'}
          onChange={v => toggle('marketing', v)}
        />
        <dl className="mt-4 text-sm text-muted space-y-1">
          <div>Termos de Utilização aceites: versão {consents?.termsVersion || '—'}, em {fmt(consents?.termsAcceptedAt ?? null)}</div>
          <div>Política de Privacidade aceite: versão {consents?.privacyVersion || '—'}, em {fmt(consents?.privacyAcceptedAt ?? null)}</div>
        </dl>
        <p className="mt-3 text-sm">
          <Link to="/termos" target="_blank" className="text-primary underline underline-offset-2">Termos de Utilização</Link>{' · '}
          <Link to="/privacidade" target="_blank" className="text-primary underline underline-offset-2">Política de Privacidade</Link>
        </p>
      </section>

      <section aria-labelledby="export-title">
        <h4 id="export-title" className="font-medium text-ink mb-1">Descarregar os meus dados</h4>
        <p className="text-sm text-muted mb-3">Um ficheiro JSON com a tua conta, recursos, notas, documentos e consentimentos. Os ficheiros enviados descarregam-se a partir da biblioteca.</p>
        <button
          onClick={exportData}
          disabled={busy === 'export'}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-md border border-hairline-strong hover:border-ink text-sm font-medium text-ink disabled:opacity-50"
        >
          {busy === 'export' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />}
          Descarregar dados
        </button>
      </section>

      <section aria-labelledby="delete-title" className="border border-error/30 rounded-xl p-5">
        <h4 id="delete-title" className="font-medium text-error mb-1">Apagar a conta</h4>
        <p className="text-sm text-body mb-3">Apaga para sempre a conta, os recursos, os ficheiros, os documentos e os consentimentos. Não é possível desfazer.</p>
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-md bg-error text-white text-sm font-medium hover:bg-ink"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" /> Apagar a minha conta
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="delete-confirm" className="block text-sm font-medium text-body-strong mb-1">Escreve APAGAR para confirmar</label>
              <input id="delete-confirm" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" spellCheck={false}
                className="w-full h-10 px-3 rounded-md border border-hairline-strong bg-canvas text-ink" />
            </div>
            <div>
              <label htmlFor="delete-password" className="block text-sm font-medium text-body-strong mb-1">Palavra-passe {user?.hasPasskey ? '(se tiveres uma)' : ''}</label>
              <input id="delete-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                className="w-full h-10 px-3 rounded-md border border-hairline-strong bg-canvas text-ink" />
            </div>
            {deleteError && <p role="alert" className="text-sm text-error">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={deleteAccount}
                disabled={confirmText !== 'APAGAR' || busy === 'delete'}
                className="h-10 px-4 inline-flex items-center gap-2 rounded-md bg-error text-white text-sm font-medium disabled:opacity-50"
              >
                {busy === 'delete' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Apagar definitivamente
              </button>
              <button onClick={() => { setShowDelete(false); setConfirmText(''); setPassword(''); setDeleteError(''); }}
                className="h-10 px-4 rounded-md border border-hairline-strong text-sm font-medium text-ink">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
