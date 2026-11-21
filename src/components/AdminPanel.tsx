import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Code2,
  Copy,
  Crown,
  Download,
  FileJson,
  LayoutGrid,
  List,
  LogOut,
  Moon,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sun,
  Ticket,
  Trash2,
  Upload,
  UserCircle2,
  X,
} from 'lucide-react';
import {
  ACCENT_PRESETS,
  AccentColorHex,
  DEFAULT_COUPON_CONFIG,
  LayoutStyle,
  Product,
  ProfileConfig,
  STORE_BADGE_STYLES,
  STORE_PLATFORMS,
  StorePlatform,
  ThemeMode,
} from '../types';
import {
  displayCode,
  formatCurrencyBRL,
  generateJsonExport,
  generateTypeScriptExport,
  normalizeCodeInput,
  parseBackupJson,
  suggestNextCode,
  triggerFileDownload,
} from '../utils/formatters';
import { ProductCard } from './ProductCard';
import { ProfileHeader } from './ProfileHeader';

import { BarChart3, Sparkles } from 'lucide-react';
import { AnalyticsView } from './AnalyticsView';
import { PlanUpgradeModal } from './PlanUpgradeModal';
import { supabaseService } from '../services/supabaseService';

type AdminTab = 'products' | 'profile' | 'analytics' | 'export';

interface AdminPanelProps {
  products: Product[];
  profile: ProfileConfig;
  onSaveProduct: (product: Product, isEditing: boolean) => void;
  onDeleteProduct: (productId: string) => void;
  onReorderProduct: (index: number, direction: 'up' | 'down') => void;
  onUpdateProfile: (profile: ProfileConfig) => void;
  onImportBackup: (data: {
    profile?: ProfileConfig;
    products: Product[];
  }) => void;
  onResetDefaults: () => void;
  onBackToStore: () => void;
  onLogout: () => void;
  onNotify: (message: string, variant?: 'default' | 'success' | 'error') => void;
  onOpenProfileEditor?: () => void;
  onOpenPricing?: () => void;
}

interface ProductFormState {
  code: string;
  title: string;
  category: string;
  store: StorePlatform;
  oldPrice: string;
  currentPrice: string;
  imageUrl: string;
  affiliateUrl: string;
}

function createEmptyForm(products: Product[]): ProductFormState {
  return {
    code: suggestNextCode(products),
    title: '',
    category: 'Casa & Cozinha',
    store: 'Shopee',
    oldPrice: '',
    currentPrice: '',
    imageUrl: '',
    affiliateUrl: '',
  };
}

function parsePriceInput(value: string): number {
  const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function AdminPanel({
  products,
  profile,
  onSaveProduct,
  onDeleteProduct,
  onReorderProduct,
  onUpdateProfile,
  onImportBackup,
  onResetDefaults,
  onBackToStore,
  onLogout,
  onNotify,
  onOpenProfileEditor,
  onOpenPricing,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isFreePlan = (profile.plan === 'free' || !profile.plan) && !profile.is_master_admin;

  // Product form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(() =>
    createEmptyForm(products)
  );
  const [formError, setFormError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleImageFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const publicUrl = await supabaseService.uploadImage(file, 'products');
      setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
      onNotify('Imagem enviada com sucesso para o Supabase Storage!', 'success');
    } catch (err: any) {
      console.error(err);
      onNotify('Erro ao fazer upload da imagem: ' + (err.message || 'Falha no Storage'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Profile form state (kept in sync when profile changes externally)
  const [profileDraft, setProfileDraft] = useState<ProfileConfig>(profile);
  useEffect(() => {
    setProfileDraft(profile);
  }, [profile]);

  // Export & Backup state
  const [exportFormat, setExportFormat] = useState<'ts' | 'json'>('ts');
  const [copiedCode, setCopiedCode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingCategories = useMemo(() => {
    const set = new Set<string>([
      'Casa & Cozinha',
      'Eletrônicos',
      'Beleza',
      'Setup',
    ]);
    products.forEach((p) => {
      if (p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  const previewProduct: Product = useMemo(() => {
    const current = parsePriceInput(form.currentPrice);
    const old = parsePriceInput(form.oldPrice);
    return {
      id: editingId ?? 'preview',
      code: form.code.trim() ? normalizeCodeInput(form.code) : '000',
      title:
        form.title.trim() ||
        'Nome do produto aparecerá aqui em até duas linhas',
      category: form.category.trim() || 'Categoria',
      store: form.store,
      oldPrice: Number.isFinite(old) && old > 0 ? old : undefined,
      currentPrice: Number.isFinite(current) && current > 0 ? current : 49.9,
      imageUrl: form.imageUrl.trim(),
      affiliateUrl: form.affiliateUrl.trim() || 'https://shopee.com.br',
    };
  }, [form, editingId]);

  const exportOutput = useMemo(() => {
    return exportFormat === 'ts'
      ? generateTypeScriptExport(profile, products)
      : generateJsonExport(profile, products);
  }, [exportFormat, profile, products]);

  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-strong)',
  };

  const handleStartEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      code: product.code,
      title: product.title,
      category: product.category,
      store: product.store,
      oldPrice: product.oldPrice ? String(product.oldPrice) : '',
      currentPrice: String(product.currentPrice),
      imageUrl: product.imageUrl,
      affiliateUrl: product.affiliateUrl,
    });
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(createEmptyForm(products));
    setFormError('');
  };

  const handleProductSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!editingId && isFreePlan && products.length >= 15) {
      setUpgradeReason('Você atingiu o limite de 15 produtos ativos do Plano Free. Faça upgrade para o Plano Pro ou Scale para cadastrar produtos ilimitados!');
      setUpgradeModalOpen(true);
      return;
    }

    const normalizedCode = normalizeCodeInput(form.code);
    const title = form.title.trim();
    const category = form.category.trim();
    const currentPrice = parsePriceInput(form.currentPrice);
    const oldPrice = form.oldPrice.trim()
      ? parsePriceInput(form.oldPrice)
      : undefined;
    const affiliateUrl = form.affiliateUrl.trim();
    const imageUrl = form.imageUrl.trim();

    if (!normalizedCode) {
      setFormError('Informe o código do produto (ex: 007).');
      return;
    }
    if (!title) {
      setFormError('Informe o título do produto.');
      return;
    }
    if (!category) {
      setFormError('Informe ou selecione uma categoria.');
      return;
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      setFormError('Informe um preço atual válido (ex: 49.90).');
      return;
    }
    if (
      oldPrice !== undefined &&
      (!Number.isFinite(oldPrice) || oldPrice < 0)
    ) {
      setFormError('Preço antigo inválido.');
      return;
    }
    if (
      !affiliateUrl ||
      (!affiliateUrl.startsWith('http://') &&
        !affiliateUrl.startsWith('https://'))
    ) {
      setFormError(
        'Informe um link de afiliado válido começando com https:// ou http://.'
      );
      return;
    }

    const nextProduct: Product = {
      id: editingId ?? `prod-${Date.now()}`,
      code: normalizedCode,
      title,
      category,
      store: form.store,
      oldPrice: oldPrice && oldPrice > 0 ? oldPrice : undefined,
      currentPrice,
      imageUrl,
      affiliateUrl,
    };

    const isEditing = Boolean(editingId);
    onSaveProduct(nextProduct, isEditing);

    const updatedList = isEditing
      ? products.map((p) => (p.id === nextProduct.id ? nextProduct : p))
      : [nextProduct, ...products];

    setEditingId(null);
    setForm(createEmptyForm(updatedList));
    setFormError('');
  };

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanedHandle = profileDraft.handle.trim() || '@achadinhos.oficial';
    const currentCoupon = profileDraft.coupon ?? DEFAULT_COUPON_CONFIG;
    onUpdateProfile({
      ...profileDraft,
      handle: cleanedHandle.startsWith('@')
        ? cleanedHandle
        : `@${cleanedHandle}`,
      bio: profileDraft.bio.trim(),
      avatarUrl: profileDraft.avatarUrl.trim(),
      coupon: {
        enabled: currentCoupon.enabled,
        code: currentCoupon.code.trim().toUpperCase(),
        description: currentCoupon.description?.trim() ?? '',
      },
    });
  };

  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportOutput);
      setCopiedCode(true);
      onNotify(
        exportFormat === 'ts'
          ? 'Código TypeScript copiado! Cole em src/data/initialData.ts.'
          : 'JSON copiado para a área de transferência.',
        'success'
      );
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      onNotify(
        'Não foi possível copiar automaticamente. Selecione o texto manualmente.',
        'error'
      );
    }
  };

  const handleDownloadExport = () => {
    if (exportFormat === 'ts') {
      triggerFileDownload(
        exportOutput,
        'initialData.ts',
        'text/typescript;charset=utf-8'
      );
      onNotify('Arquivo initialData.ts baixado com sucesso!', 'success');
    } else {
      triggerFileDownload(
        exportOutput,
        'vitrine-achadinhos-backup.json',
        'application/json;charset=utf-8'
      );
      onNotify('Backup JSON baixado com sucesso!', 'success');
    }
  };

  const handleImportFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setImportText(content);
      setImportError('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyImport = () => {
    if (!importText.trim()) {
      setImportError('Cole o conteúdo JSON ou selecione um arquivo .json.');
      return;
    }
    try {
      const parsed = parseBackupJson(importText);
      onImportBackup(parsed);
      if (parsed.profile) {
        setProfileDraft(parsed.profile);
      }
      setImportText('');
      setImportError('');
      setForm(createEmptyForm(parsed.products));
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Erro ao importar JSON.'
      );
    }
  };

  const draftCoupon = profileDraft.coupon ?? DEFAULT_COUPON_CONFIG;
  const currentLayoutStyle = profile.themeConfig.layoutStyle;

  return (
    <div
      className="min-h-screen transition-colors"
      style={{ backgroundColor: 'var(--bg-shell)' }}
    >
      {/* Sticky Admin Top Bar */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md px-3.5 py-2.5"
        style={{
          backgroundColor: 'var(--bg-sticky)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ver Vitrine</span>
          </button>

          <div className="flex items-center gap-1.5 truncate">
            <span
              className="text-xs font-bold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              Painel
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenPricing) {
                  onOpenPricing();
                } else {
                  setUpgradeReason(undefined);
                  setUpgradeModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              style={
                profile.is_master_admin || profile.plan === 'scale'
                  ? { backgroundColor: '#F59E0B22', color: '#D97706', border: '1px solid #F59E0B44' }
                  : profile.plan === 'pro'
                    ? { backgroundColor: '#8B5CF622', color: '#7C3AED', border: '1px solid #8B5CF644' }
                    : { backgroundColor: '#10B98122', color: '#059669', border: '1px solid #10B98144' }
              }
            >
              <Crown className="w-3 h-3" />
              <span>
                {profile.is_master_admin
                  ? 'Master Scale'
                  : profile.plan === 'scale'
                    ? 'Scale'
                    : profile.plan === 'pro'
                      ? 'Pro'
                      : 'Starter (15)'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sair do modo admin"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 hover:text-red-500"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Seções do painel gerenciador"
          className="mt-2.5 grid grid-cols-4 gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--bg-surface-muted)' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'products'}
            onClick={() => setActiveTab('products')}
            className="h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap"
            style={
              activeTab === 'products'
                ? {
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--accent)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }
                : { color: 'var(--text-secondary)' }
            }
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>Produtos ({products.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => {
              setProfileDraft(profile);
              setActiveTab('profile');
            }}
            className="h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap"
            style={
              activeTab === 'profile'
                ? {
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--accent)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }
                : { color: 'var(--text-secondary)' }
            }
          >
            <UserCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Perfil</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            className="h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap relative"
            style={
              activeTab === 'analytics'
                ? {
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--accent)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }
                : { color: 'var(--text-secondary)' }
            }
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>Analytics</span>
            {isFreePlan && (
              <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                PRO
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'export'}
            onClick={() => setActiveTab('export')}
            className="h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap"
            style={
              activeTab === 'export'
                ? {
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--accent)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }
                : { color: 'var(--text-secondary)' }
            }
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-3.5 sm:p-4 space-y-5 pb-12">
        {/* TAB 1: PRODUCTS */}
        {activeTab === 'products' && (
          <>
            {isFreePlan && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Plano Starter: {products.length} de 15 produtos ativos</span>
                  </div>
                  <div className="w-48 sm:w-64 h-1.5 bg-amber-200 dark:bg-amber-950 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        products.length >= 15 ? 'bg-red-500' : 'bg-[#EE4D2D]'
                      }`}
                      style={{ width: `${Math.min(100, (products.length / 15) * 100)}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeReason('Desbloqueie produtos ilimitados assinando o Plano Pro ou Scale!');
                    setUpgradeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#EE4D2D] hover:bg-[#D93D1E] text-white font-bold text-[11px] transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  Liberar Ilimitado
                </button>
              </div>
            )}

            <section className="card-surface rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div>
                  <h2
                    className="text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {editingId
                      ? `Editando Produto ${displayCode(form.code)}`
                      : 'Adicionar Novo Produto'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Preencha os dados e confira a prévia instantânea do card.
                  </p>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--bg-surface-muted)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                )}
              </div>

              <div
                className={`grid gap-4 items-start ${
                  currentLayoutStyle === 'list'
                    ? 'grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-[1fr_200px]'
                }`}
              >
                <form onSubmit={handleProductSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Código *
                      </label>
                      <input
                        type="text"
                        value={form.code}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, code: e.target.value }))
                        }
                        placeholder="007"
                        style={inputStyle}
                        className="accent-focus w-full h-10 px-3 rounded-xl text-sm font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Loja / Plataforma *
                      </label>
                      <select
                        value={form.store}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            store: e.target.value as StorePlatform,
                          }))
                        }
                        style={inputStyle}
                        className="accent-focus w-full h-10 px-2.5 rounded-xl text-sm focus:outline-none"
                      >
                        {STORE_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {platform}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Título do Produto *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Ex: Escova Alisadora Portátil Bivolt"
                      style={inputStyle}
                      className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Categoria *
                    </label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      placeholder="Ex: Casa & Cozinha"
                      style={inputStyle}
                      className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {existingCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, category: cat }))
                          }
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
                          style={
                            form.category === cat
                              ? {
                                  backgroundColor: 'var(--accent-soft)',
                                  color: 'var(--accent)',
                                }
                              : {
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  color: 'var(--text-secondary)',
                                }
                          }
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Preço Antigo (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.oldPrice}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            oldPrice: e.target.value,
                          }))
                        }
                        placeholder="Opcional (ex: 89,90)"
                        style={inputStyle}
                        className="accent-focus w-full h-10 px-3 rounded-xl text-sm tabular-nums focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Preço Atual (R$) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.currentPrice}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            currentPrice: e.target.value,
                          }))
                        }
                        placeholder="Ex: 49,90"
                        style={inputStyle}
                        className="accent-focus w-full h-10 px-3 rounded-xl text-sm tabular-nums focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        className="block text-[11px] font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        URL da Imagem ou Upload
                      </label>
                      <label className="text-[11px] font-semibold text-[#EE4D2D] hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>{uploadingImage ? 'Enviando ao Supabase...' : 'Upload de Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={handleImageFileUpload}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          imageUrl: e.target.value,
                        }))
                      }
                      placeholder="https://... ou use o botão Upload de Foto acima"
                      style={inputStyle}
                      className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Link de Afiliado *
                    </label>
                    <input
                      type="url"
                      value={form.affiliateUrl}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          affiliateUrl: e.target.value,
                        }))
                      }
                      placeholder="https://shope.ee/..."
                      style={inputStyle}
                      className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  {formError && (
                    <p className="text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="accent-btn w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                  >
                    {editingId ? (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar Alterações</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Adicionar à Vitrine</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Instant Live Card Preview */}
                <div className="sm:sticky sm:top-28">
                  <p
                    className="text-[11px] font-semibold mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Pré-visualização do card ({currentLayoutStyle === 'list' ? 'Lista' : 'Grade'})
                  </p>
                  <div
                    className={
                      currentLayoutStyle === 'list'
                        ? 'w-full'
                        : 'max-w-[210px] mx-auto sm:max-w-none'
                    }
                  >
                    <ProductCard
                      product={previewProduct}
                      profileHandle={profile.handle}
                      layoutStyle={currentLayoutStyle}
                      isPreview
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Product List with Reorder / Edit / Delete */}
            <section className="card-surface rounded-2xl overflow-hidden">
              <div
                className="px-4 py-3.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div>
                  <h3
                    className="text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Produtos Cadastrados ({products.length})
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Reordene, edite ou remova itens. Salvo automaticamente.
                  </p>
                </div>
              </div>

              {products.length === 0 ? (
                <div
                  className="p-8 text-center text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Nenhum produto cadastrado ainda. Use o formulário acima para
                  adicionar seu primeiro achadinho.
                </div>
              ) : (
                <ul>
                  {products.map((product, index) => {
                    const badge =
                      STORE_BADGE_STYLES[product.store] ??
                      STORE_BADGE_STYLES.Shopee;
                    const isDeleting = pendingDeleteId === product.id;

                    return (
                      <li
                        key={product.id}
                        className="p-3 flex items-center gap-3 transition-colors"
                        style={{
                          borderTop:
                            index > 0
                              ? '1px solid var(--border-subtle)'
                              : undefined,
                          backgroundColor:
                            editingId === product.id
                              ? 'var(--accent-soft)'
                              : undefined,
                        }}
                      >
                        <div
                          className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
                          style={{
                            backgroundColor: 'var(--bg-surface-muted)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-[10px] font-mono"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {displayCode(product.code)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className="flex items-center gap-1.5 text-[11px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <span
                              className="font-mono font-bold tabular-nums"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {displayCode(product.code)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${badge.bg} ${badge.text}`}
                            >
                              {badge.shortLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{product.category}</span>
                          </div>
                          <p
                            className="mt-0.5 text-xs font-semibold line-clamp-1"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {product.title}
                          </p>
                          <p
                            className="mt-0.5 text-xs font-bold tabular-nums"
                            style={{ color: 'var(--accent)' }}
                          >
                            {formatCurrencyBRL(product.currentPrice)}
                            {product.oldPrice &&
                              product.oldPrice > product.currentPrice && (
                                <span
                                  className="ml-1.5 text-[11px] font-normal line-through"
                                  style={{ color: 'var(--text-strike)' }}
                                >
                                  {formatCurrencyBRL(product.oldPrice)}
                                </span>
                              )}
                          </p>
                        </div>

                        {isDeleting ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteProduct(product.id);
                                setPendingDeleteId(null);
                                if (editingId === product.id) {
                                  handleCancelEdit();
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700"
                            >
                              Excluir
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="h-8 px-2 rounded-lg text-[11px] font-semibold"
                              style={{
                                backgroundColor: 'var(--bg-surface-muted)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => onReorderProduct(index, 'up')}
                                aria-label={`Mover ${product.title} para cima`}
                                className="w-7 h-6 rounded-md disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                                style={{
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === products.length - 1}
                                onClick={() => onReorderProduct(index, 'down')}
                                aria-label={`Mover ${product.title} para baixo`}
                                className="w-7 h-6 rounded-md disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                                style={{
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(product)}
                              aria-label={`Editar ${product.title}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: 'var(--bg-surface-muted)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(product.id)}
                              aria-label={`Excluir ${product.title}`}
                              className="w-8 h-8 rounded-lg hover:bg-red-500/15 hover:text-red-500 flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: 'var(--bg-surface-muted)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}

        {/* TAB 2: PROFILE, THEME & COUPON */}
        {activeTab === 'profile' && (
          <section className="space-y-4">
            {onOpenProfileEditor && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EE4D2D]/10 via-orange-500/10 to-purple-500/10 border border-[#EE4D2D]/20 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#EE4D2D]" />
                    <span>Editor Visual Split-Screen</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                    Edite com prévia em tempo real em moldura de celular lado a lado
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenProfileEditor}
                  className="px-3.5 py-2 rounded-xl bg-[#EE4D2D] hover:bg-[#D93D1E] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  Abrir Split-Screen
                </button>
              </div>
            )}

            <div className="card-surface rounded-2xl overflow-hidden">
              <div
                className="text-[11px] font-medium px-3.5 py-1.5"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                Pré-visualização do cabeçalho
              </div>
              <ProfileHeader profile={profileDraft} compact />
            </div>

            <form
              onSubmit={handleProfileSubmit}
              className="card-surface rounded-2xl p-4 space-y-5"
            >
              {/* Theme Config Block */}
              <div className="space-y-3">
                <div>
                  <h2
                    className="text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Tema & Layout (`themeConfig`)
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Estas configurações são salvas no perfil e incluídas no
                    arquivo exportado.
                  </p>
                </div>

                {/* Color mode */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Modo de Cor
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: 'light', label: 'Claro', Icon: Sun, isPro: false },
                        { value: 'dark', label: 'Escuro', Icon: Moon, isPro: true },
                        { value: 'luxury', label: 'Luxury', Icon: Crown, isPro: true },
                      ] as {
                        value: ThemeMode;
                        label: string;
                        Icon: typeof Sun;
                        isPro: boolean;
                      }[]
                    ).map(({ value, label, Icon, isPro }) => {
                      const active = profileDraft.themeConfig.mode === value;
                      const isLocked = isFreePlan && isPro;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            if (isLocked) {
                              setUpgradeReason(`O tema ${label} é exclusivo para assinantes dos planos PRO e SCALE.`);
                              setUpgradeModalOpen(true);
                              return;
                            }
                            setProfileDraft((prev) => ({
                              ...prev,
                              themeConfig: { ...prev.themeConfig, mode: value },
                            }));
                          }}
                          className="h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative"
                          style={
                            active
                              ? {
                                  backgroundColor: 'var(--accent-soft)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent)',
                                }
                              : {
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
                                }
                          }
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                          {isLocked && (
                            <span className="absolute top-1 right-1 text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-600">
                              PRO
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent color */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cor de Destaque (`--accent`)
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {ACCENT_PRESETS.map((preset) => {
                      const active =
                        profileDraft.themeConfig.accentColor.toLowerCase() ===
                        preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() =>
                            setProfileDraft((prev) => ({
                              ...prev,
                              themeConfig: {
                                ...prev.themeConfig,
                                accentColor: preset.hex as AccentColorHex,
                              },
                            }))
                          }
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all"
                          style={
                            active
                              ? {
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  color: 'var(--text-primary)',
                                  border: `1.5px solid ${preset.hex}`,
                                }
                              : {
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
                                }
                          }
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Layout Style */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Formato de Exibição dos Produtos
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        {
                          value: 'grid',
                          label: 'Grade (2/3 colunas)',
                          Icon: LayoutGrid,
                          isPro: false,
                        },
                        {
                          value: 'list',
                          label: 'Lista Horizontal',
                          Icon: List,
                          isPro: true,
                        },
                      ] as {
                        value: LayoutStyle;
                        label: string;
                        Icon: typeof LayoutGrid;
                        isPro: boolean;
                      }[]
                    ).map(({ value, label, Icon, isPro }) => {
                      const active =
                        profileDraft.themeConfig.layoutStyle === value;
                      const isLocked = isFreePlan && isPro;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            if (isLocked) {
                              setUpgradeReason('O layout em Lista Horizontal é exclusivo para assinantes dos planos PRO e SCALE.');
                              setUpgradeModalOpen(true);
                              return;
                            }
                            setProfileDraft((prev) => ({
                              ...prev,
                              themeConfig: {
                                ...prev.themeConfig,
                                layoutStyle: value,
                              },
                            }));
                          }}
                          className="h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative"
                          style={
                            active
                              ? {
                                  backgroundColor: 'var(--accent-soft)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent)',
                                }
                              : {
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
                                }
                          }
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                          {isLocked && (
                            <span className="absolute top-1 right-1 text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-600">
                              PRO
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Highlighted Coupon Config */}
              <div
                className="pt-4 space-y-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Ticket
                      className="w-4 h-4"
                      style={{ color: 'var(--accent)' }}
                    />
                    <div>
                      <h3
                        className="text-xs font-bold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Banner de Cupom Destacado
                      </h3>
                      <p
                        className="text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Exibido logo abaixo da bio com botão de copiar.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftCoupon.enabled}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          coupon: {
                            ...draftCoupon,
                            enabled: e.target.checked,
                          },
                        }))
                      }
                      style={{ accentColor: 'var(--accent)' }}
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Ativo
                    </span>
                  </label>
                </div>

                {draftCoupon.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Código do Cupom
                      </label>
                      <input
                        type="text"
                        value={draftCoupon.code}
                        onChange={(e) =>
                          setProfileDraft((prev) => ({
                            ...prev,
                            coupon: {
                              ...draftCoupon,
                              code: e.target.value.toUpperCase(),
                            },
                          }))
                        }
                        placeholder="ACHADOS10"
                        style={inputStyle}
                        className="accent-focus w-full h-10 px-3 rounded-xl text-sm font-mono uppercase focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Texto Curto (opcional)
                      </label>
                      <input
                        type="text"
                        value={draftCoupon.description ?? ''}
                        onChange={(e) =>
                          setProfileDraft((prev) => ({
                            ...prev,
                            coupon: {
                              ...draftCoupon,
                              description: e.target.value,
                            },
                          }))
                        }
                        placeholder="10% OFF extra em lojas selecionadas"
                        style={inputStyle}
                        className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Identity & Socials */}
              <div
                className="pt-4 space-y-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <h3
                  className="text-xs font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Identidade & Redes Sociais
                </h3>

                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Nome do Perfil (@handle)
                  </label>
                  <input
                    type="text"
                    value={profileDraft.handle}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        handle: e.target.value,
                      }))
                    }
                    placeholder="@achadinhos.oficial"
                    style={inputStyle}
                    className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className="block text-[11px] font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Bio Curta (até 2 linhas)
                    </label>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {profileDraft.bio.length}/140
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={140}
                    value={profileDraft.bio}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    placeholder="Os melhores achadinhos testados todos os dias..."
                    style={inputStyle}
                    className="accent-focus w-full p-3 rounded-xl text-sm focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    URL da Foto de Avatar
                  </label>
                  <input
                    type="text"
                    value={profileDraft.avatarUrl}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        avatarUrl: e.target.value,
                      }))
                    }
                    placeholder="https://... ou caminho local"
                    style={inputStyle}
                    className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Botões de Redes Sociais
                  </p>
                  {profileDraft.socials.map((social, idx) => (
                    <div
                      key={social.key}
                      className="flex items-center gap-2 p-2 rounded-xl"
                      style={{
                        backgroundColor: 'var(--bg-surface-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <label
                        className="inline-flex items-center gap-1.5 min-w-[96px] text-xs font-semibold cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <input
                          type="checkbox"
                          checked={social.enabled}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setProfileDraft((prev) => ({
                              ...prev,
                              socials: prev.socials.map((s, i) =>
                                i === idx ? { ...s, enabled: checked } : s
                              ),
                            }));
                          }}
                          style={{ accentColor: 'var(--accent)' }}
                          className="w-4 h-4 rounded"
                        />
                        <span>{social.label}</span>
                      </label>
                      <input
                        type="url"
                        value={social.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfileDraft((prev) => ({
                            ...prev,
                            socials: prev.socials.map((s, i) =>
                              i === idx ? { ...s, url: val } : s
                            ),
                          }));
                        }}
                        placeholder={`Link do ${social.label}`}
                        style={inputStyle}
                        className="accent-focus flex-1 h-9 px-2.5 rounded-lg text-xs focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

                {/* Pixels & WhatsApp VIP (Recursos Pro / Scale) */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#EE4D2D]" />
                      <span>Pixels de Rastreamento & Grupo VIP</span>
                    </p>
                    {isFreePlan && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">
                        Plano PRO
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Meta Pixel ID (Facebook / Instagram)
                    </label>
                    <input
                      type="text"
                      disabled={isFreePlan}
                      value={profileDraft.pixel_meta || ''}
                      onChange={(e) => setProfileDraft((prev) => ({ ...prev, pixel_meta: e.target.value }))}
                      placeholder={isFreePlan ? 'Disponível no Plano Pro' : 'Ex: 123456789012345'}
                      style={inputStyle}
                      className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      TikTok Pixel ID
                    </label>
                    <input
                      type="text"
                      disabled={isFreePlan}
                      value={profileDraft.pixel_tiktok || ''}
                      onChange={(e) => setProfileDraft((prev) => ({ ...prev, pixel_tiktok: e.target.value }))}
                      placeholder={isFreePlan ? 'Disponível no Plano Pro' : 'Ex: C4A123BC456DEF789'}
                      style={inputStyle}
                      className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Link do Grupo VIP no WhatsApp
                    </label>
                    <input
                      type="url"
                      value={profileDraft.whatsapp_vip_url || ''}
                      onChange={(e) => setProfileDraft((prev) => ({ ...prev, whatsapp_vip_url: e.target.value }))}
                      placeholder="https://chat.whatsapp.com/..."
                      style={inputStyle}
                      className="accent-focus w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

              <button
                type="submit"
                className="accent-btn w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Perfil, Tema e Configurações</span>
              </button>
            </form>
          </section>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            profileId={profile.id || ''}
            plan={profile.plan || 'free'}
            isMasterAdmin={profile.is_master_admin}
            onOpenUpgrade={() => {
              setUpgradeReason('O Analytics de cliques detalhado é exclusivo para assinantes dos planos PRO e SCALE.');
              setUpgradeModalOpen(true);
            }}
          />
        )}

        {/* TAB 4: EXPORT & IMPORT BACKUP */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <section className="card-surface rounded-2xl p-4 space-y-3.5">
              <div>
                <h2
                  className="text-sm font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Exportar Dados (JSON / TS) para Deploy Estático
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Já inclui o <span className="font-mono">themeConfig</span>{' '}
                  atual, o cupom e todos os produtos para substituir{' '}
                  <span className="font-mono">src/data/initialData.ts</span> no
                  Netlify.
                </p>
              </div>

              <div
                className="inline-flex p-1 rounded-xl gap-1"
                style={{ backgroundColor: 'var(--bg-surface-muted)' }}
              >
                <button
                  type="button"
                  onClick={() => setExportFormat('ts')}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                  style={
                    exportFormat === 'ts'
                      ? {
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>TypeScript (.ts)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                  style={
                    exportFormat === 'json'
                      ? {
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Backup JSON (.json)</span>
                </button>
              </div>

              <pre className="w-full max-h-56 overflow-auto rounded-xl bg-[#09090B] text-[#E5E7EB] border border-white/10 p-3.5 font-mono text-[11px] leading-relaxed">
                {exportOutput}
              </pre>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyExport}
                  className="accent-btn h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExport}
                  className="h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--bg-surface-muted)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar {exportFormat === 'ts' ? '.ts' : '.json'}</span>
                </button>
              </div>
            </section>

            {/* Import Backup JSON */}
            <section className="card-surface rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className="text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Importar Backup JSON
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Restaure produtos, perfil e tema a partir de um arquivo JSON
                    exportado.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface-muted)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Abrir .json</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  if (importError) setImportError('');
                }}
                placeholder='Cole aqui o JSON exportado (ex: { "profile": {...}, "products": [...] })'
                style={inputStyle}
                className="accent-focus w-full p-3 rounded-xl font-mono text-[11px] focus:outline-none"
              />

              {importError && (
                <p className="text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                  {importError}
                </p>
              )}

              <button
                type="button"
                onClick={handleApplyImport}
                className="w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-surface)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Backup para o Navegador</span>
              </button>
            </section>

            {/* Reset Defaults */}
            <section className="card-surface rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <h3
                  className="text-xs font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Restaurar vitrine original
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Volta para os 6 produtos iniciais (#001 a #006), tema claro e
                  perfil padrão.
                </p>
              </div>

              {confirmingReset ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onResetDefaults();
                      setConfirmingReset(false);
                    }}
                    className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(false)}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--bg-surface-muted)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold hover:text-red-500 transition-colors whitespace-nowrap shrink-0"
                  style={{
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar</span>
                </button>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modal de Upgrade de Planos */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={profile.plan || 'free'}
        isMasterAdmin={profile.is_master_admin}
        triggerReason={upgradeReason}
      />
    </div>
  );
}
