import { useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function GoogleAuthModal({
  isOpen,
  onClose,
  title = 'Acesse seu Painel de Afiliado',
  description = 'Conecte-se com sua conta Google para gerenciar sua vitrine, produtos e temas.',
}: GoogleAuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      await supabaseService.signInWithGoogle();
    } catch (err: any) {
      console.error('Erro ao conectar Google:', err);
      setErrorMsg(err.message || 'Falha ao autenticar com Google. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex justify-end -mt-2 -mr-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent)',
          }}
        >
          <Sparkles className="w-7 h-7" />
        </div>

        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        <p className="text-xs mt-1.5 mb-6 max-w-[320px] mx-auto" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-medium text-left">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold text-sm transition-all shadow-sm active:scale-[0.98] border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>{isLoading ? 'Conectando ao Google...' : 'Continuar com Google'}</span>
        </button>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800 text-left space-y-2">
          <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Sem senha — login direto e seguro com sua conta Google</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Vitrine personalizada com URL exclusiva (`/@seu-nome`)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Plano Starter 100% gratuito para começar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
