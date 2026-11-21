import { FormEvent, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expectedPassword?: string;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
  expectedPassword = '1234',
}: AdminLoginModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim() === expectedPassword) {
      setError('');
      onSuccess();
    } else {
      setError('Senha incorreta. Tente novamente (padrão: 1234).');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="admin-login-title"
                className="text-sm font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Modo Gerenciador
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Digite a senha para editar a vitrine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de login"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Senha de acesso
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Digite a senha (padrão: 1234)"
                className="accent-focus w-full h-11 pl-3.5 pr-10 rounded-xl text-sm focus:outline-none transition-all"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: error
                    ? '1px solid #EF4444'
                    : '1px solid var(--border-strong)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {error ? (
              <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
            ) : (
              <p
                className="mt-1.5 text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                Senha padrão de demonstração:{' '}
                <span
                  className="font-mono font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  1234
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl text-xs font-semibold transition-colors"
              style={{
                border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="accent-btn flex-1 h-10 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              Entrar no Painel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
