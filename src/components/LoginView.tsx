import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

interface LoginViewProps {
  onBackToHome: () => void;
  onSuccess?: () => void;
}

export function LoginView({ onBackToHome }: LoginViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      await supabaseService.signInWithGoogle();
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      setErrorMessage(err.message || 'Falha ao autenticar com o Google. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#090D16] text-[#1E293B] dark:text-[#F1F5F9] transition-colors">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a vitrine</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EE4D2D] text-white flex items-center justify-center font-black text-sm shadow-sm">
            AL
          </div>
          <span className="font-extrabold text-sm tracking-tight text-gray-900 dark:text-white">
            AchadosLink
          </span>
        </div>
      </header>

      {/* Main Split-Screen Container */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-[#111624] rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800/80 overflow-hidden">
          {/* Lado Esquerdo: Banner Visual / Showcase (visível em desktop) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-10 bg-gradient-to-br from-[#EE4D2D] via-[#F05F38] to-[#9A1E07] text-white min-h-[580px] relative overflow-hidden">
            {/* Decorações de fundo */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-black/10 blur-3xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>O SaaS oficial para afiliados e influenciadores</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight">
                Transforme seu link de bio em uma vitrine de alta conversão.
              </h2>
              <p className="mt-3 text-white/80 text-sm max-w-md leading-relaxed">
                Centralize seus links da Shopee, Mercado Livre, Amazon e Cakto com busca instantânea por código de vídeo (#001, #014) e favoritos para compradores.
              </p>
            </div>

            {/* Mockup visual de card de achadinho */}
            <div className="my-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 max-w-md shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-white text-[#EE4D2D] px-1.5 py-0.5 rounded">
                      #001
                    </span>
                    <span className="text-xs font-semibold truncate text-white">
                      Mini Processador Elétrico Portátil
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs line-through text-white/60">R$ 49,90</span>
                    <span className="text-sm font-black text-white">R$ 29,90</span>
                    <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded">
                      -40%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefícios em lista */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs font-medium text-white/90">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Sem senhas complicadas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Até 15 produtos grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Rastreamento de cliques</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>100% Mobile-first</span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Card de Login Google */}
          <div className="col-span-1 lg:col-span-5 p-6 sm:p-10 flex flex-col justify-center">
            <div className="text-center sm:text-left mb-8">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                Entrar ou Criar Vitrine
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Acesse o painel gerenciador em 1 clique utilizando sua conta oficial do Google.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-left">
                {errorMessage}
              </div>
            )}

            {/* Botão Oficial Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-13 rounded-2xl flex items-center justify-center gap-3.5 font-bold text-sm transition-all shadow-md active:scale-[0.98] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-60"
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

            {/* Aviso de Segurança */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Autenticação criptografada e segura via Supabase Auth</span>
            </div>

            {/* Termos e Privacidade */}
            <p className="mt-6 text-[10.5px] text-center text-gray-400 dark:text-zinc-500 leading-normal">
              Ao continuar, você concorda com os{' '}
              <a href="#termos" className="underline hover:text-gray-600 dark:hover:text-zinc-300">
                Termos de Serviço
              </a>{' '}
              e a{' '}
              <a href="#privacidade" className="underline hover:text-gray-600 dark:hover:text-zinc-300">
                Política de Privacidade
              </a>{' '}
              do AchadosLink.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-gray-400 dark:text-zinc-600">
        © 2026 AchadosLink. Todos os direitos reservados.
      </footer>
    </div>
  );
}
