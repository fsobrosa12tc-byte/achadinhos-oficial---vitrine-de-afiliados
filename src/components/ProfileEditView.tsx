import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Crown,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Moon,
  Save,
  Sparkles,
  Sun,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  ACCENT_PRESETS,
  AccentColorHex,
  DEFAULT_COUPON_CONFIG,
  LayoutStyle,
  Product,
  ProfileConfig,
  SocialNetworkKey,
  ThemeMode,
} from '../types';
import { ProfileHeader } from './ProfileHeader';
import { ProductCard } from './ProductCard';
import { supabaseService } from '../services/supabaseService';

interface ProfileEditViewProps {
  user: any;
  initialProfile: ProfileConfig;
  sampleProducts?: Product[];
  onSave: (updatedProfile: ProfileConfig) => void;
  onBackToDashboard: () => void;
  onOpenUpgradeModal: (reason: string) => void;
  isOnboarding?: boolean;
}

export function ProfileEditView({
  user,
  initialProfile,
  sampleProducts = [],
  onSave,
  onBackToDashboard,
  onOpenUpgradeModal,
  isOnboarding = false,
}: ProfileEditViewProps) {
  // Mobile tab state ('edit' | 'preview')
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  // Form state
  const [draft, setDraft] = useState<ProfileConfig>(initialProfile);
  const [slugInput, setSlugInput] = useState(initialProfile.handle.replace(/^@+/, ''));
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugResult, setSlugResult] = useState<{ available: boolean; reason?: string } | null>(null);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFreePlan = (draft.plan === 'free' || !draft.plan) && !draft.is_master_admin;

  // Checagem em tempo real de disponibilidade do Slug
  useEffect(() => {
    const clean = slugInput.trim().toLowerCase().replace(/^@+/, '');
    if (!clean) {
      setSlugResult({ available: false, reason: 'Informe o slug da sua vitrine' });
      return;
    }

    // Se não alterou o slug atual do perfil, está válido
    if (clean === initialProfile.handle.replace(/^@+/, '').toLowerCase()) {
      setSlugResult({ available: true });
      return;
    }

    setSlugChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await supabaseService.checkSlugAvailability(clean, user?.id);
        setSlugResult(res);
      } catch (err) {
        console.error(err);
      } finally {
        setSlugChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slugInput, initialProfile.handle, user?.id]);

  // Upload de Foto de Avatar no Supabase Storage
  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      setErrorMessage('');
      const publicUrl = await supabaseService.uploadImage(file, 'avatars');
      setDraft((prev) => ({ ...prev, avatarUrl: publicUrl }));
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao enviar avatar: ' + (err.message || 'Falha no Storage'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSocialChange = (key: SocialNetworkKey, url: string, enabled: boolean) => {
    setDraft((prev) => {
      const existing = prev.socials || [];
      const index = existing.findIndex((s) => s.key === key);
      let updated = [...existing];
      if (index >= 0) {
        updated[index] = { ...updated[index], url, enabled };
      } else {
        updated.push({
          key,
          label: key === 'instagram' ? 'Instagram' : key === 'tiktok' ? 'TikTok' : 'WhatsApp',
          url,
          enabled,
        });
      }
      return { ...prev, socials: updated };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (slugResult?.available === false) {
      setErrorMessage(slugResult.reason || 'Por favor, defina um @slug válido.');
      return;
    }

    try {
      setIsSaving(true);
      const cleanSlug = slugInput.trim().toLowerCase().replace(/^@+/, '');
      const toPersist: ProfileConfig = {
        ...draft,
        id: draft.id || user?.id,
        handle: `@${cleanSlug}`,
        slug: cleanSlug,
        display_name: draft.display_name || cleanSlug,
      };

      const saved = await supabaseService.upsertProfile(toPersist);
      onSave(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao salvar perfil no Supabase: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-input, #F8FAFC)',
    color: 'var(--text-primary, #0F172A)',
    border: '1px solid var(--border-subtle, #E2E8F0)',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#111624]/90 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isOnboarding && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
            </button>
          )}
          <div>
            <h1 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>{isOnboarding ? 'Configuração da sua Vitrine' : 'Editar & Personalizar Vitrine'}</span>
              {draft.is_master_admin && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  👑 Master Scale
                </span>
              )}
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Personalize o link da bio, foto, tema, cores e cupons
            </p>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex sm:hidden p-1 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mobileTab === 'edit' ? 'bg-white dark:bg-zinc-700 text-[#EE4D2D] shadow-xs' : 'text-gray-500'
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
              mobileTab === 'preview' ? 'bg-white dark:bg-zinc-700 text-[#EE4D2D] shadow-xs' : 'text-gray-500'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Prévia</span>
          </button>
        </div>
      </header>

      {/* Main Container: Split-Screen Desktop */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Lado Esquerdo: Formulário de Configurações */}
          <div className={`lg:col-span-7 space-y-6 ${mobileTab === 'preview' ? 'hidden sm:block' : 'block'}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold animate-in fade-in">
                  {errorMessage}
                </div>
              )}
              {/* 1. Card Dados Básicos */}
              <div className="bg-white dark:bg-[#111624] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 space-y-5">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EE4D2D]" />
                  <span>Identidade & Link da Bio</span>
                </h2>

                {/* Upload de Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-[#EE4D2D]/30 shrink-0 shadow-inner">
                    {draft.avatarUrl ? (
                      <img src={draft.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                        {draft.display_name?.charAt(0) || '@'}
                      </div>
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-bold text-gray-800 dark:text-gray-200 transition-all cursor-pointer">
                      <Camera className="w-4 h-4 text-[#EE4D2D]" />
                      <span>{isUploadingAvatar ? 'Enviando...' : 'Alterar Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingAvatar}
                        onChange={handleAvatarFile}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Armazenamento em nuvem via Supabase Storage
                    </p>
                  </div>
                </div>

                {/* Slug com validação em tempo real */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Link da Bio Exclusivo *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-gray-400 select-none">
                      achadoslink.com/@
                    </span>
                    <input
                      type="text"
                      required
                      value={slugInput}
                      onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="seunome"
                      className="w-full h-11 pl-38 pr-10 rounded-xl text-xs font-mono font-bold bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                    />
                    <div className="absolute right-3">
                      {slugChecking ? (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      ) : slugResult?.available === true ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : slugResult?.available === false ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  {slugResult?.available === false && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{slugResult.reason}</p>
                  )}
                  {slugResult?.available === true && (
                    <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Link disponível e válido!
                    </p>
                  )}
                </div>

                {/* Nome de Exibição */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Nome da Vitrine *
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.display_name || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Ex: Achadinhos da Andrezza"
                    className="w-full h-11 px-3.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                  />
                </div>

                {/* Bio com contador */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                      Bio / Descrição
                    </label>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {(draft.bio || '').length}/160
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={160}
                    value={draft.bio || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Ex: Os achados mais incríveis dos meus vídeos reunidos para você comprar com segurança."
                    className="w-full p-3 rounded-xl text-xs font-medium bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D] resize-none"
                  />
                </div>

                {/* Cupom em Destaque */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Cupom Promocional no Topo (Opcional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={draft.coupon?.code || ''}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          coupon: {
                            ...(prev.coupon ?? DEFAULT_COUPON_CONFIG),
                            code: e.target.value.toUpperCase(),
                            enabled: true,
                          },
                        }))
                      }
                      placeholder="Ex: ACHADOS10"
                      className="h-10 px-3 rounded-xl text-xs font-mono font-bold bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={draft.coupon?.description || ''}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          coupon: {
                            ...(prev.coupon ?? DEFAULT_COUPON_CONFIG),
                            description: e.target.value,
                            enabled: true,
                          },
                        }))
                      }
                      placeholder="Ex: 10% OFF em lojas oficiais"
                      className="h-10 px-3 rounded-xl text-xs bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Card Aparência & Estilo (Com Trava de Planos) */}
              <div className="bg-white dark:bg-[#111624] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Aparência, Cores & Formato</span>
                  </h2>
                  {isFreePlan && (
                    <button
                      type="button"
                      onClick={() => onOpenUpgradeModal('Desbloqueie todos os temas, cores e pixels com o Plano Pro')}
                      className="text-[11px] font-bold text-[#EE4D2D] hover:underline flex items-center gap-1"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Upgrade para Pro</span>
                    </button>
                  )}
                </div>

                {/* Modo de Cor */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                    Tema da Vitrine
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(
                      [
                        { id: 'light', label: 'Claro', Icon: Sun, badge: 'Grátis' },
                        { id: 'dark', label: 'Escuro', Icon: Moon, badge: 'PRO' },
                        { id: 'luxury', label: 'Luxury', Icon: Crown, badge: 'SCALE' },
                      ] as { id: ThemeMode; label: string; Icon: typeof Sun; badge: string }[]
                    ).map(({ id, label, Icon, badge }) => {
                      const isSelected = draft.themeConfig.mode === id;
                      const isLocked = isFreePlan && id !== 'light';

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            if (isLocked) {
                              onOpenUpgradeModal(`O tema ${label} é exclusivo para assinantes dos planos PRO ou SCALE.`);
                              return;
                            }
                            setDraft((prev) => ({
                              ...prev,
                              themeConfig: { ...prev.themeConfig, mode: id },
                            }));
                          }}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all relative ${
                            isSelected
                              ? 'border-[#EE4D2D] bg-[#EE4D2D]/5 text-[#EE4D2D]'
                              : 'border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/40 text-gray-600 dark:text-zinc-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs font-bold">{label}</span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                              badge === 'Grátis'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : badge === 'PRO'
                                  ? 'bg-purple-500/15 text-purple-600'
                                  : 'bg-amber-500/15 text-amber-600'
                            }`}
                          >
                            {badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cor de Destaque */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                    Cor de Destaque
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_PRESETS.map((preset) => {
                      const isSelected = draft.themeConfig.accentColor.toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              themeConfig: {
                                ...prev.themeConfig,
                                accentColor: preset.hex as AccentColorHex,
                              },
                            }))
                          }
                          className={`h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-bold border transition-all ${
                            isSelected
                              ? 'border-gray-900 dark:border-white shadow-xs'
                              : 'border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/40'
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}

                    {/* Seletor livre (Pro / Scale) */}
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        disabled={isFreePlan}
                        value={draft.themeConfig.accentColor}
                        onChange={(e) => {
                          if (isFreePlan) {
                            onOpenUpgradeModal('A seleção de cores personalizadas é exclusiva para assinantes PRO.');
                            return;
                          }
                          setDraft((prev) => ({
                            ...prev,
                            themeConfig: {
                              ...prev.themeConfig,
                              accentColor: e.target.value as AccentColorHex,
                            },
                          }));
                        }}
                        className="w-9 h-9 rounded-xl border border-gray-200 dark:border-zinc-700 cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Formato dos Cards */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                    Formato de Exibição dos Cards
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          themeConfig: { ...prev.themeConfig, layoutStyle: 'grid' },
                        }))
                      }
                      className={`p-3 rounded-2xl flex items-center justify-center gap-2 border text-xs font-bold ${
                        draft.themeConfig.layoutStyle === 'grid'
                          ? 'border-[#EE4D2D] bg-[#EE4D2D]/5 text-[#EE4D2D]'
                          : 'border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/40'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Grade (2 Colunas)</span>
                      <span className="text-[9px] bg-emerald-500/15 text-emerald-600 px-1 rounded">Grátis</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isFreePlan) {
                          onOpenUpgradeModal('O layout em Lista Horizontal é exclusivo para assinantes PRO ou SCALE.');
                          return;
                        }
                        setDraft((prev) => ({
                          ...prev,
                          themeConfig: { ...prev.themeConfig, layoutStyle: 'list' },
                        }));
                      }}
                      className={`p-3 rounded-2xl flex items-center justify-center gap-2 border text-xs font-bold ${
                        draft.themeConfig.layoutStyle === 'list'
                          ? 'border-[#EE4D2D] bg-[#EE4D2D]/5 text-[#EE4D2D]'
                          : 'border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/40'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span>Lista Horizontal</span>
                      <span className="text-[9px] bg-purple-500/15 text-purple-600 px-1 rounded">PRO</span>
                    </button>
                  </div>
                </div>

                {/* Pixels de Rastreamento (Pro / Scale) */}
                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                      Pixels de Rastreamento
                    </span>
                    {isFreePlan && (
                      <span className="text-[9px] bg-purple-500/15 text-purple-600 font-bold px-1.5 py-0.2 rounded">
                        PRO & SCALE
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      disabled={isFreePlan}
                      value={draft.pixel_meta || ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, pixel_meta: e.target.value }))}
                      placeholder={isFreePlan ? 'Meta Pixel (Exclusivo Pro)' : 'Meta Pixel ID (Facebook)'}
                      className="h-10 px-3 rounded-xl text-xs bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 disabled:opacity-40"
                    />
                    <input
                      type="text"
                      disabled={isFreePlan}
                      value={draft.pixel_tiktok || ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, pixel_tiktok: e.target.value }))}
                      placeholder={isFreePlan ? 'TikTok Pixel (Exclusivo Pro)' : 'TikTok Pixel ID'}
                      className="h-10 px-3 rounded-xl text-xs bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Alterações */}
              <button
                type="submit"
                disabled={isSaving || slugResult?.available === false}
                className="w-full h-12 rounded-2xl bg-[#EE4D2D] hover:bg-[#D93D1E] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Alterações Salvas no Supabase!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações da Vitrine</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Lado Direito: Preview Interativo em Tempo Real (Mobile Frame) */}
          <div className={`lg:col-span-5 ${mobileTab === 'edit' ? 'hidden sm:block' : 'block'}`}>
            <div className="sticky top-20">
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Prévia em Tempo Real
                </span>
                <span className="text-[11px] font-mono text-gray-400">
                  @{slugInput || 'suavitrine'}
                </span>
              </div>

              {/* Moldura de Smartphone */}
              <div className="w-full max-w-[390px] mx-auto rounded-[36px] p-3 bg-gray-900 border-4 border-gray-800 shadow-2xl overflow-hidden">
                <div
                  data-theme={draft.themeConfig.mode}
                  className="rounded-[28px] overflow-hidden min-h-[560px] max-h-[640px] overflow-y-auto flex flex-col justify-between"
                  style={{
                    backgroundColor: 'var(--bg-shell, #FFFFFF)',
                    color: 'var(--text-primary, #111827)',
                  }}
                >
                  <div>
                    {/* Header da Vitrine */}
                    <ProfileHeader profile={draft} compact />

                    {/* Lista simulada de produtos na prévia */}
                    <div className="p-3">
                      <div
                        className={
                          draft.themeConfig.layoutStyle === 'list'
                            ? 'grid grid-cols-1 gap-2'
                            : 'grid grid-cols-2 gap-2'
                        }
                      >
                        {(sampleProducts.length > 0 ? sampleProducts.slice(0, 4) : []).map((p) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            profileHandle={draft.handle}
                            layoutStyle={draft.themeConfig.layoutStyle}
                            isPreview
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé da prévia com marca d'água condicional */}
                  {isFreePlan ? (
                    <div className="p-3 text-center text-[10px] text-gray-400 border-t border-gray-100 dark:border-zinc-800">
                      ⚡ Feito com AchadosLink
                    </div>
                  ) : (
                    <div className="p-2 text-center text-[10px] text-gray-400">
                      {draft.handle} · Links oficiais
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
