import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Heart,
  Lock,
  SearchX,
  Settings,
  Store,
} from 'lucide-react';
import { INITIAL_PRODUCTS, INITIAL_PROFILE } from './data/initialData';
import {
  DEFAULT_COUPON_CONFIG,
  getAccentPreset,
  Product,
  ProfileConfig,
  SortOption,
  STORE_PLATFORMS,
  StorePlatform,
  ThemeConfig,
  ToastItem,
} from './types';
import {
  calculateDiscountPercent,
  displayCode,
  hydrateProfile,
  normalizeText,
} from './utils/formatters';
import { ThemePreviewBar } from './components/ThemePreviewBar';
import { ProfileHeader } from './components/ProfileHeader';
import {
  FAVORITES_CATEGORY_KEY,
  StickyFilterBar,
} from './components/StickyFilterBar';
import { ProductCard } from './components/ProductCard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanel } from './components/AdminPanel';
import { ToastContainer } from './components/ToastContainer';

const STORAGE_KEY_PRODUCTS = 'vitrine_achadinhos_products_v1';
const STORAGE_KEY_PROFILE = 'vitrine_achadinhos_profile_v1';
const STORAGE_KEY_FAVORITES = 'vitrine_achadinhos_favorites_v1';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage<Product[]>(STORAGE_KEY_PRODUCTS, INITIAL_PRODUCTS)
  );
  const [profile, setProfile] = useState<ProfileConfig>(() => {
    const stored = loadFromStorage<unknown>(STORAGE_KEY_PROFILE, null);
    return hydrateProfile(stored, INITIAL_PROFILE);
  });
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEY_FAVORITES, [])
  );

  // Public filter & sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedStore, setSelectedStore] = useState<'Todas' | StorePlatform>(
    'Todas'
  );
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Admin modal / panel states
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback(
    (message: string, variant: ToastItem['variant'] = 'default') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 2800);
    },
    []
  );

  // Apply dynamic theme mode and --accent CSS variables globally
  const activeAccentPreset = useMemo(
    () => getAccentPreset(profile.themeConfig.accentColor),
    [profile.themeConfig.accentColor]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', profile.themeConfig.mode);
    root.style.setProperty('--accent', activeAccentPreset.hex);
    root.style.setProperty('--accent-hover', activeAccentPreset.hoverHex);
    root.style.setProperty('--accent-active', activeAccentPreset.activeHex);
    root.style.setProperty('--accent-end', activeAccentPreset.gradientEnd);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute(
        'content',
        profile.themeConfig.mode === 'luxury'
          ? '#09090B'
          : profile.themeConfig.mode === 'dark'
            ? '#0F172A'
            : activeAccentPreset.hex
      );
    }
  }, [profile.themeConfig.mode, activeAccentPreset]);

  // Automatic localStorage sync
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_PRODUCTS,
        JSON.stringify(products)
      );
    } catch {
      // Ignore quota errors silently
    }
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // Ignore quota errors silently
    }
  }, [profile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_FAVORITES,
        JSON.stringify(favoriteIds)
      );
    } catch {
      // Ignore quota errors silently
    }
  }, [favoriteIds]);

  // Dynamic category list derived from products
  const dynamicCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const product of products) {
      const cat = product.category.trim();
      if (cat) seen.add(cat);
    }
    return Array.from(seen);
  }, [products]);

  useEffect(() => {
    if (
      selectedCategory !== 'Todos' &&
      selectedCategory !== FAVORITES_CATEGORY_KEY &&
      !dynamicCategories.includes(selectedCategory)
    ) {
      setSelectedCategory('Todos');
    }
  }, [dynamicCategories, selectedCategory]);

  const availableStores = useMemo(() => {
    const counts = new Map<StorePlatform, number>();
    products.forEach((p) => {
      counts.set(p.store, (counts.get(p.store) ?? 0) + 1);
    });
    return STORE_PLATFORMS.filter((store) => (counts.get(store) ?? 0) > 0);
  }, [products]);

  const validFavoriteIds = useMemo(() => {
    const productIds = new Set(products.map((p) => p.id));
    return favoriteIds.filter((id) => productIds.has(id));
  }, [favoriteIds, products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    const codeQuery = normalizedQuery.replace(/^#+/, '');
    const numericCodeQuery = /^\d+$/.test(codeQuery)
      ? String(parseInt(codeQuery, 10))
      : '';

    const filtered = products.filter((product) => {
      if (selectedCategory === FAVORITES_CATEGORY_KEY) {
        if (!validFavoriteIds.includes(product.id)) return false;
      } else if (
        selectedCategory !== 'Todos' &&
        product.category !== selectedCategory
      ) {
        return false;
      }

      if (selectedStore !== 'Todas' && product.store !== selectedStore) {
        return false;
      }

      if (normalizedQuery) {
        const titleNorm = normalizeText(product.title);
        const categoryNorm = normalizeText(product.category);
        const storeNorm = normalizeText(product.store);
        const codeNorm = normalizeText(product.code).replace(/^#+/, '');
        const codeNumeric = /^\d+$/.test(codeNorm)
          ? String(parseInt(codeNorm, 10))
          : '';

        const matchesText =
          titleNorm.includes(normalizedQuery) ||
          categoryNorm.includes(normalizedQuery) ||
          storeNorm.includes(normalizedQuery);
        const matchesCode =
          codeNorm.includes(codeQuery) ||
          `#${codeNorm}`.includes(normalizedQuery) ||
          (numericCodeQuery !== '' && codeNumeric === numericCodeQuery);

        if (!matchesText && !matchesCode) return false;
      }

      return true;
    });

    if (sortBy === 'featured') return filtered;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price-asc') return a.currentPrice - b.currentPrice;
      if (sortBy === 'price-desc') return b.currentPrice - a.currentPrice;
      if (sortBy === 'discount-desc') {
        const discA = calculateDiscountPercent(a.oldPrice, a.currentPrice) ?? 0;
        const discB = calculateDiscountPercent(b.oldPrice, b.currentPrice) ?? 0;
        return discB - discA;
      }
      return 0;
    });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedStore,
    sortBy,
    validFavoriteIds,
  ]);

  const handleToggleFavorite = (productId: string) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        notify('Removido dos seus favoritos.');
        return prev.filter((id) => id !== productId);
      }
      notify('Produto salvo nos seus favoritos!', 'success');
      return [...prev, productId];
    });
  };

  const handleCopyCode = async (formattedCode: string) => {
    try {
      await navigator.clipboard.writeText(formattedCode);
      notify(`Código ${formattedCode} copiado!`, 'success');
    } catch {
      notify(`Código do produto: ${formattedCode}`);
    }
  };

  const handleCopyCoupon = (code: string) => {
    notify(`Cupom ${code} copiado! Aplique no carrinho.`, 'success');
  };

  const handleChangeTheme = (patch: Partial<ThemeConfig>) => {
    setProfile((prev) => ({
      ...prev,
      themeConfig: {
        ...prev.themeConfig,
        ...patch,
      },
    }));
  };

  const handleToggleCouponPreview = () => {
    setProfile((prev) => {
      const current = prev.coupon ?? { ...DEFAULT_COUPON_CONFIG };
      return {
        ...prev,
        coupon: {
          ...current,
          enabled: !current.enabled,
          code: current.code || DEFAULT_COUPON_CONFIG.code,
        },
      };
    });
  };

  const handleSaveProduct = (product: Product, isEditing: boolean) => {
    setProducts((prev) => {
      if (isEditing) {
        return prev.map((item) => (item.id === product.id ? product : item));
      }
      return [product, ...prev];
    });
    notify(
      isEditing
        ? `Produto ${displayCode(product.code)} atualizado!`
        : `Produto ${displayCode(product.code)} adicionado à vitrine!`,
      'success'
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== productId));
    setFavoriteIds((prev) => prev.filter((id) => id !== productId));
    notify('Produto removido da vitrine.');
  };

  const handleReorderProduct = (index: number, direction: 'up' | 'down') => {
    setProducts((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleUpdateProfile = (nextProfile: ProfileConfig) => {
    setProfile(nextProfile);
    notify('Perfil, tema e cupom atualizados!', 'success');
  };

  const handleImportBackup = (data: {
    profile?: ProfileConfig;
    products: Product[];
  }) => {
    setProducts(data.products);
    if (data.profile) {
      setProfile(hydrateProfile(data.profile, INITIAL_PROFILE));
    }
    setSelectedCategory('Todos');
    setSelectedStore('Todas');
    notify(
      `Backup importado com ${data.products.length} produto(s)!`,
      'success'
    );
  };

  const handleResetDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setProfile(INITIAL_PROFILE);
    setFavoriteIds([]);
    setSelectedCategory('Todos');
    setSelectedStore('Todas');
    setSearchQuery('');
    setSortBy('featured');
    notify('Vitrine restaurada para o visual e produtos iniciais.', 'success');
  };

  const handleOpenAdminTrigger = () => {
    if (isAdminUnlocked) {
      setAdminOpen(true);
    } else {
      setLoginModalOpen(true);
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'Todos' ||
    selectedStore !== 'Todas' ||
    sortBy !== 'featured';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedStore('Todas');
    setSortBy('featured');
  };

  const isListLayout = profile.themeConfig.layoutStyle === 'list';

  return (
    <div
      data-theme={profile.themeConfig.mode}
      className="min-h-screen pt-2.5 sm:py-4 transition-colors"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Discreet Top Theme Preview Bar (visible on public storefront) */}
      {!adminOpen && (
        <ThemePreviewBar
          themeConfig={profile.themeConfig}
          couponEnabled={Boolean(profile.coupon?.enabled)}
          onChangeTheme={handleChangeTheme}
          onToggleCoupon={handleToggleCouponPreview}
        />
      )}

      {/* Centered 640px Mobile-First App Shell */}
      <div
        className="w-full max-w-[640px] mx-auto min-h-screen sm:min-h-[calc(100vh-5.5rem)] sm:rounded-[28px] overflow-x-clip flex flex-col transition-colors"
        style={{
          backgroundColor: 'var(--bg-shell)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-shell)',
        }}
      >
        {adminOpen ? (
          <AdminPanel
            products={products}
            profile={profile}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onReorderProduct={handleReorderProduct}
            onUpdateProfile={handleUpdateProfile}
            onImportBackup={handleImportBackup}
            onResetDefaults={handleResetDefaults}
            onBackToStore={() => setAdminOpen(false)}
            onLogout={() => {
              setIsAdminUnlocked(false);
              setAdminOpen(false);
              notify('Sessão do gerenciador bloqueada.');
            }}
            onNotify={notify}
          />
        ) : (
          <>
            {/* 1. Profile Header + Optional Copyable Coupon Banner */}
            <ProfileHeader
              profile={profile}
              onCopyCoupon={handleCopyCoupon}
            />

            {/* 2. Sticky Search & Category Carousel */}
            <StickyFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categories={dynamicCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              favoritesCount={validFavoriteIds.length}
            />

            {/* 3. Store Filter, Sort Controls & Result Count */}
            <main className="flex-1 px-3.5 pt-3 pb-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p
                  className="text-xs font-medium tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {filteredProducts.length === 1
                    ? '1 achadinho encontrado'
                    : `${filteredProducts.length} achadinhos encontrados`}
                </p>

                <div className="flex items-center gap-1.5">
                  {/* Store filter select */}
                  <div className="relative flex items-center">
                    <Store
                      className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}
                      aria-hidden="true"
                    />
                    <select
                      aria-label="Filtrar por loja"
                      value={selectedStore}
                      onChange={(e) =>
                        setSelectedStore(
                          e.target.value as 'Todas' | StorePlatform
                        )
                      }
                      className="accent-focus h-8 pl-7 pr-6 rounded-lg text-[11.5px] font-semibold focus:outline-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <option value="Todas">Todas lojas</option>
                      {availableStores.map((store) => (
                        <option key={store} value={store}>
                          {store}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort select */}
                  <div className="relative flex items-center">
                    <ArrowUpDown
                      className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}
                      aria-hidden="true"
                    />
                    <select
                      aria-label="Ordenar produtos"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="accent-focus h-8 pl-7 pr-6 rounded-lg text-[11.5px] font-semibold focus:outline-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <option value="featured">Destaques</option>
                      <option value="price-asc">Menor preço</option>
                      <option value="price-desc">Maior preço</option>
                      <option value="discount-desc">Maior desconto</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Product Grid (2 cols mobile / 3 desktop) OR Horizontal List */}
              {filteredProducts.length > 0 ? (
                <section
                  aria-label="Lista de produtos afiliados"
                  className={
                    isListLayout
                      ? 'grid grid-cols-1 gap-2.5'
                      : 'grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3'
                  }
                >
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      profileHandle={profile.handle}
                      layoutStyle={profile.themeConfig.layoutStyle}
                      isFavorite={validFavoriteIds.includes(product.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onCopyCode={handleCopyCode}
                    />
                  ))}
                </section>
              ) : (
                <div className="card-surface rounded-2xl px-6 py-12 text-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                    style={{
                      backgroundColor: 'var(--bg-surface-muted)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {selectedCategory === FAVORITES_CATEGORY_KEY ? (
                      <Heart className="w-5 h-5" />
                    ) : (
                      <SearchX className="w-5 h-5" />
                    )}
                  </div>
                  <h2
                    className="mt-3 text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {selectedCategory === FAVORITES_CATEGORY_KEY
                      ? 'Nenhum favorito salvo ainda'
                      : 'Nenhum achadinho encontrado'}
                  </h2>
                  <p
                    className="mt-1 text-xs max-w-[280px] mx-auto"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {selectedCategory === FAVORITES_CATEGORY_KEY
                      ? 'Toque no coração em qualquer produto da vitrine para salvar sua lista aqui.'
                      : 'Tente buscar apenas pelo número do vídeo (ex: 001) ou limpe os filtros aplicados.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="accent-btn mt-4 inline-flex items-center justify-center h-9 px-4 rounded-xl text-xs font-semibold transition-colors active:scale-[0.98]"
                    >
                      Ver todos os produtos
                    </button>
                  )}
                </div>
              )}
            </main>

            {/* 5. Discreet Footer with Admin Lock/Settings Trigger */}
            <footer
              className="mt-auto px-4 py-5 flex items-center justify-between gap-3 transition-colors"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-footer)',
              }}
            >
              <div
                className="text-[11.5px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <span
                  className="font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {profile.handle}
                </span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>Links de afiliado oficiais</span>
              </div>

              <button
                type="button"
                onClick={handleOpenAdminTrigger}
                aria-label="Abrir modo gerenciador"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11.5px] font-medium transition-colors whitespace-nowrap shrink-0 hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                {isAdminUnlocked ? (
                  <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{isAdminUnlocked ? 'Gerenciador' : 'Admin'}</span>
              </button>
            </footer>
          </>
        )}
      </div>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          setLoginModalOpen(false);
          setIsAdminUnlocked(true);
          setAdminOpen(true);
          notify('Bem-vindo ao Painel Gerenciador!', 'success');
        }}
      />

      {/* Non-blocking Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
