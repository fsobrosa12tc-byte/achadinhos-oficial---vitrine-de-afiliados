import { FormEvent, useEffect, useState } from 'react';
import { Check, CheckCircle2, Crown, Loader2, Sparkles, Store, XCircle } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { ProfileConfig } from '../types';

interface OnboardingViewProps {
  user: any;
  onProfileCreated: (profile: ProfileConfig) => void;
  onCancel: () => void;
}

export function OnboardingView({ user, onProfileCreated, onCancel }: OnboardingViewProps) {
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || 'Achadinhos');
  const [bio, setBio] = useState('Os melhores achados e ofertas dos meus vídeos reunidos aqui!');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const email = user?.email || '';
  const isMasterAccount = email.toLowerCase() === 'atendimentoandrezzaferraz@gmail.com';

  // Pré-preenche um slug sugerido baseado no email ou nome
  useEffect(() => {
    if (!slug) {
      if (isMasterAccount) {
        setSlug('andrezza');
      } else {
        const raw = (user?.user_metadata?.full_name || email.split('@')[0] || 'vitrine')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
        setSlug(raw || 'vitrine');
      }
    }
  }, [user, email, isMasterAccount]);

  // Checagem de disponibilidade em tempo real
  useEffect(() => {
    const clean = slug.trim().toLowerCase().replace(/^@+/, '');
    if (!clean) {
      setIsSlugAvailable(null);
      setSlugError('');
      return;
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(clean)) {
      setIsSlugAvailable(false);
      setSlugError('O slug deve conter entre 3 e 30 letras, números, hífens ou underlines.');
      return;
    }

    setSlugError('');
    setIsCheckingSlug(true);

    const timer = setTimeout(async () => {
      try {
        const available = await supabaseService.checkSlugAvailability(clean);
        setIsSlugAvailable(available);
        if (!available) {
          setSlugError('Este @slug já está em uso por outro criador. Escolha outro.');
        }
      } catch (err) {
        console.error('Erro ao verificar slug:', err);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanSlug = slug.trim().toLowerCase().replace(/^@+/, '');

    if (!cleanSlug || isSlugAvailable === false) {
      setSubmitError('Por favor, defina um @slug válido e disponível.');
      return;
    }

    if (!displayName.trim()) {
      setSubmitError('Por favor, informe o nome público da sua vitrine.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const avatarUrl = user?.user_metadata?.avatar_url || '';
      const created = await supabaseService.createProfile({
        userId: user.id,
        email,
        slug: cleanSlug,
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl,
      });

      onProfileCreated(created);
    } catch (err: any) {
      console.error('Erro ao criar perfil:', err);
      setSubmitError(err.message || 'Erro ao criar perfil. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 flex items-center justify-center bg-[#F4F5F7] dark:bg-[#0A0D14]">
      <div className="w-full max-w-[500px] bg-white dark:bg-[#121620] rounded-3xl shadow-xl border border-gray-200 dark:border-zinc-800 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#EE4D2D]/10 text-[#EE4D2D] flex items-center justify-center mx-auto mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">
            Configure sua Vitrine de Afiliados
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-[340px] mx-auto">
            Sua vitrine pública ficará acessível imediatamente pelo link exclusivo com seu @slug.
          </p>
        </div>

        {isMasterAccount && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
              <span>👑 Conta Master Identificada!</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
              Olá, <strong>{email}</strong>! Seu perfil receberá privilégio total: <strong>Plano Scale (Vitalício)</strong>, produtos ilimitados, todas as opções visuais e analytics liberado.
            </p>
          </div>
        )}

        {submitError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Slug */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
              URL da sua Vitrine (@slug exclusivo) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-gray-400">@</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="seunome"
                className="w-full h-11 pl-8 pr-10 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D] transition-all"
              />
              <div className="absolute right-3 flex items-center">
                {isCheckingSlug ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : isSlugAvailable === true ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : isSlugAvailable === false ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>

            {slugError ? (
              <p className="text-[11px] text-red-500 mt-1">{slugError}</p>
            ) : isSlugAvailable === true ? (
              <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" /> Link disponível: {window.location.host}/@{slug}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">
                Ex: achadinhosdaandrezza (link final: {window.location.host}/@{slug || 'seunome'})
              </p>
            )}
          </div>

          {/* Nome da Vitrine */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
              Nome da Vitrine (Display Name) *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Achadinhos da Andrezza"
              className="w-full h-11 px-3.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D] transition-all"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
              Bio / Descrição Curta
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ex: Encontre todos os produtos dos meus vídeos do TikTok e Reels aqui!"
              className="w-full p-3 rounded-xl text-xs font-medium bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D] transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isCheckingSlug || isSlugAvailable === false}
            className="w-full h-12 rounded-xl bg-[#EE4D2D] hover:bg-[#D93D1E] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-6"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Concluir e Abrir Painel</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full h-9 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            Sair ou voltar para a vitrine pública
          </button>
        </form>
      </div>
    </div>
  );
}
