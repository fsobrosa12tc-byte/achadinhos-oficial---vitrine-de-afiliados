import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Heart,
  Lock,
  SearchX,
  Settings,
  Sparkles,
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
import { AdminPanel } from './components/AdminPanel';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { LoginView } from './components/LoginView';
import { ProfileEditView } from './components/ProfileEditView';
import { PricingView } from './components/PricingView';
import { CheckoutView } from './components/CheckoutView';
import { PlanUpgradeModal } from './components/PlanUpgradeModal';
import { ToastContainer } from './components/ToastContainer';
import { supabaseService } from './services/supabaseService';
import { BillingCycle } from './services/billingService';

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

export type AppRoute =
  | 'storefront'
  | 'login'
  | 'onboarding'
  | 'dashboard'
  | 'dashboard-profile'
  | 'pricing'
  | 'checkout';

export default function App() {
  // Supabase Auth & Profile states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<{ title?: string; description?: string }>({});

  // Route state
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const path = window.location.pathname.replace(/^\/+/, '').toLowerCase();
    if (path === 'login') return 'login';
    if (path === 'onboarding') return 'onboarding';
    if (path === 'dashboard') return 'dashboard';
    if (path === 'dashboard/perfil') return 'dashboard-profile';
    if (path === 'planos') return 'pricing';
    if (path.startsWith('checkout')) return 'checkout';
    return 'storefront';
  });

  // Checkout states com leitura dos query params da URL (?plan=scale&billing=monthly)
  const [checkoutPlan, setCheckoutPlan] = useState<'pro' | 'scale'>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const p = searchParams.get('plan');
      return p === 'scale' ? 'scale' : 'pro';
    } catch {
      return 'pro';
    }
  });
  const [checkoutCycle, setCheckoutCycle] = useState<BillingCycle>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const b = searchParams.get('billing');
      return b === 'yearly' ? 'yearly' : 'monthly';
    } catch {
      return 'monthly';
    }
  });

  // Upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);

  // Core data states
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
  const [selectedStore, setSelectedStore] = useState<'Todas' | StorePlatform>('Todas');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback(
    (message: string, variant: ToastItem['variant'] = 'default') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3000);
    },
    []
  );

  // Navegação sem reload com pushState
  const navigateTo = useCallback((route: AppRoute, queryParams?: { plan?: 'pro' | 'scale'; billing?: BillingCycle }) => {
    setCurrentRoute(route);
    let targetPath = '/';
    if (route === 'login') targetPath = '/login';
    else if (route === 'onboarding') targetPath = '/onboarding';
    else if (route === 'dashboard') targetPath = '/dashboard';
    else if (route === 'dashboard-profile') targetPath = '/dashboard/perfil';
    else if (route === 'pricing') targetPath = '/planos';
    else if (route === 'checkout') {
      const p = queryParams?.plan || 'pro';
      const b = queryParams?.billing || 'monthly';
      setCheckoutPlan(p);
      setCheckoutCycle(b);
      targetPath = `/checkout?plan=${p}&billing=${b}`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  // Monitorar popstate do navegador (voltar/avançar e navegação reativa)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, '').toLowerCase();
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const planParam = searchParams.get('plan') as 'pro' | 'scale' | null;
        const billingParam = searchParams.get('billing') as BillingCycle | null;
        if (planParam === 'pro' || planParam === 'scale') {
          setCheckoutPlan(planParam);
        }
        if (billingParam === 'monthly' || billingParam === 'yearly') {
          setCheckoutCycle(billingParam);
        }
      } catch {}

      if (path === 'login') setCurrentRoute('login');
      else if (path === 'onboarding') setCurrentRoute('onboarding');
      else if (path === 'dashboard') setCurrentRoute('dashboard');
      else if (path === 'dashboard/perfil') setCurrentRoute('dashboard-profile');
      else if (path === 'planos') setCurrentRoute('pricing');
      else if (path.startsWith('checkout')) setCurrentRoute('checkout');
      else setCurrentRoute('storefront');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Inicializar Autenticação e Carregar Perfil do Supabase
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const user = await supabaseService.getCurrentUser();
        if (!isMounted) return;
        setCurrentUser(user);

        const path = window.location.pathname.replace(/^\/+/, '').toLowerCase();

        if (user) {
          const isMaster = user.email?.trim().toLowerCase() === 'atendimentoandrezzaferraz@gmail.com';
          const userProfile = await supabaseService.getProfileByUserId(user.id);
          if (!isMounted) return;

          if (!userProfile) {
            setCurrentRoute('onboarding');
          } else {
            if (isMaster && (userProfile.plan !== 'scale' || !userProfile.is_master_admin || userProfile.subscription_status !== 'lifetime')) {
              userProfile.plan = 'scale';
              userProfile.is_master_admin = true;
              userProfile.subscription_status = 'lifetime';
              await supabaseService.syncMasterAccount(user.id, user.email);
            }
            setProfile(userProfile);
            const dbProducts = await supabaseService.getProducts(userProfile.id || user.id);
            if (isMounted && dbProducts.length > 0) {
              setProducts(dbProducts);
            }

            if (path === 'dashboard') setCurrentRoute('dashboard');
            else if (path === 'dashboard/perfil') setCurrentRoute('dashboard-profile');
            else if (path === 'planos') setCurrentRoute('pricing');
            else if (path.startsWith('checkout')) setCurrentRoute('checkout');
            else if (path === 'login' || path === 'onboarding') setCurrentRoute('dashboard');
          }
        } else {
          // Visitante público
          if (path === 'login') {
            setCurrentRoute('login');
          } else if (path === 'planos') {
            setCurrentRoute('pricing');
          } else if (path.startsWith('checkout')) {
            setCurrentRoute('checkout');
          } else if (path === 'dashboard' || path === 'dashboard/perfil') {
            setCurrentRoute('login');
          } else if (path) {
            // Slug público (ex: /andrezza ou /@andrezza)
            const publicProfile = await supabaseService.getProfileBySlug(path);
            if (isMounted && publicProfile) {
              setProfile(publicProfile);
              const dbProducts = await supabaseService.getProducts(publicProfile.id || '', true);
              if (isMounted && dbProducts.length > 0) {
                setProducts(dbProducts);
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro na inicialização Supabase:', err);
      }
    }

    initAuth();

    const { data: authListener } = supabaseService.onAuthStateChange(async (user) => {
      if (!isMounted) return;
      setCurrentUser(user);

      if (user) {
        const isMaster = user.email?.trim().toLowerCase() === 'atendimentoandrezzaferraz@gmail.com';
        const userProfile = await supabaseService.getProfileByUserId(user.id);
        if (!userProfile) {
          setCurrentRoute('onboarding');
        } else {
          if (isMaster && (userProfile.plan !== 'scale' || !userProfile.is_master_admin || userProfile.subscription_status !== 'lifetime')) {
            userProfile.plan = 'scale';
            userProfile.is_master_admin = true;
            userProfile.subscription_status = 'lifetime';
            await supabaseService.syncMasterAccount(user.id, user.email);
          }
          setProfile(userProfile);
          const dbProducts = await supabaseService.getProducts(userProfile.id || user.id);
          if (dbProducts.length > 0) {
            setProducts(dbProducts);
          }
          if (window.location.pathname.includes('dashboard')) {
            setCurrentRoute('dashboard');
          }
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Aplicar Tema e Cores Dinâmicas
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

  // 3. Sincronização de Favoritos
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favoriteIds));
    } catch {}
  }, [favoriteIds]);

  // Categorias dinâmicas
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

  // Filtragem e ordenação
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

  // Handlers da Vitrine
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

  const handleProductOfferClick = (productId: string) => {
    if (profile.id) {
      supabaseService.recordProductClick(productId, profile.id, document.referrer);
    }
  };

  // Operações CRUD do Gerenciador conectadas ao Supabase
  const handleSaveProduct = async (product: Product, isEditing: boolean) => {
    if (currentUser && profile.id) {
      const res = await supabaseService.saveProduct(product, profile.id);
      if (!res.success) {
        notify(res.error || 'Erro ao salvar produto no Supabase.', 'error');
        return;
      }
      if (res.product) {
        product = res.product;
      }
    }

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

  const handleDeleteProduct = async (productId: string) => {
    if (currentUser && profile.id) {
      await supabaseService.deleteProduct(productId);
    }
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

  const handleUpdateProfile = async (nextProfile: ProfileConfig) => {
    setProfile(nextProfile);
    if (currentUser && nextProfile.id) {
      try {
        await supabaseService.updateProfile(nextProfile.id, nextProfile);
        notify('Perfil e configurações salvos no Supabase!', 'success');
      } catch (err: any) {
        notify('Erro ao sincronizar com Supabase: ' + err.message, 'error');
      }
    } else {
      notify('Perfil e tema atualizados localmente!', 'success');
    }
  };

  const handleImportBackup = (data: { profile?: ProfileConfig; products: Product[] }) => {
    setProducts(data.products);
    if (data.profile) {
      setProfile(hydrateProfile(data.profile, INITIAL_PROFILE));
    }
    setSelectedCategory('Todos');
    setSelectedStore('Todas');
    notify(`Backup importado com ${data.products.length} produto(s)!`, 'success');
  };

  const handleResetDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setProfile(INITIAL_PROFILE);
    setFavoriteIds([]);
    setSelectedCategory('Todos');
    setSelectedStore('Todas');
    setSearchQuery('');
    setSortBy('featured');
    notify('Vitrine restaurada para o padrão inicial.', 'success');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedStore('Todas');
    setSortBy('featured');
  };

  const handleOpenDashboardTrigger = () => {
    if (currentUser) {
      navigateTo('dashboard');
    } else {
      navigateTo('login');
    }
  };

  const handleLogout = async () => {
    try {
      await supabaseService.signOut();
      setCurrentUser(null);
      navigateTo('storefront');
      notify('Sessão encerrada com sucesso.');
    } catch (err) {
      console.error(err);
    }
  };

  const isListLayout = profile.themeConfig.layoutStyle === 'list';
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'Todos' ||
    selectedStore !== 'Todas' ||
    sortBy !== 'featured';

  const isFreePlan = (profile.plan === 'free' || !profile.plan) && !profile.is_master_admin;

  // -------------------------------------------------------------
  // RENDERIZAÇÃO CONDICIONAL POR ROTAS SAAS
  // -------------------------------------------------------------

  // ROTA 1: LOGIN & CADASTRO SPLIT-SCREEN (/login)
  if (currentRoute === 'login') {
    return (
      <LoginView
        onBackToHome={() => navigateTo('storefront')}
        onSuccess={() => navigateTo('dashboard')}
      />
    );
  }

  // ROTA 2: ONBOARDING / CONFIGURAÇÃO INICIAL (/onboarding)
  if (currentRoute === 'onboarding' && currentUser) {
    return (
      <ProfileEditView
        user={currentUser}
        initialProfile={profile}
        sampleProducts={products}
        isOnboarding={true}
        onSave={(newProfile) => {
          setProfile(newProfile);
          navigateTo('dashboard');
          notify('Vitrine configurada com sucesso! Bem-vindo ao painel.', 'success');
        }}
        onBackToDashboard={() => navigateTo('storefront')}
        onOpenUpgradeModal={(reason) => {
          setUpgradeReason(reason);
          setUpgradeModalOpen(true);
        }}
      />
    );
  }

  // ROTA 3: EDIÇÃO DE PERFIL E TEMAS SPLIT-SCREEN (/dashboard/perfil)
  if (currentRoute === 'dashboard-profile') {
    return (
      <ProfileEditView
        user={currentUser}
        initialProfile={profile}
        sampleProducts={products}
        isOnboarding={false}
        onSave={(updated) => {
          setProfile(updated);
          notify('Perfil e aparência salvos com sucesso!', 'success');
        }}
        onBackToDashboard={() => navigateTo('dashboard')}
        onOpenUpgradeModal={(reason) => {
          setUpgradeReason(reason);
          setUpgradeModalOpen(true);
        }}
      />
    );
  }

  // ROTA 4: TABELA COMPARATIVA DE PLANOS (/planos)
  if (currentRoute === 'pricing') {
    return (
      <PricingView
        currentProfile={profile}
        onSelectPlan={(plan, cycle) => {
          setCheckoutPlan(plan);
          setCheckoutCycle(cycle);
          navigateTo('checkout', { plan, billing: cycle });
        }}
        onBack={() => navigateTo(currentUser ? 'dashboard' : 'storefront')}
      />
    );
  }

  // ROTA 5: CHECKOUT TRANSPARENTE COM SANDBOX (/checkout)
  if (currentRoute === 'checkout') {
    return (
      <CheckoutView
        user={currentUser}
        currentProfile={profile}
        selectedPlan={checkoutPlan}
        billingCycle={checkoutCycle}
        onSuccess={(upgradedProfile) => {
          setProfile(upgradedProfile);
          navigateTo('dashboard');
          notify(`🎉 Plano ${checkoutPlan.toUpperCase()} ativado com sucesso!`, 'success');
        }}
        onBack={() => navigateTo('pricing')}
      />
    );
  }

  // ROTA 6 & 7: VITRINE PÚBLICA (/) OU DASHBOARD (/dashboard)
  return (
    <div
      data-theme={profile.themeConfig.mode}
      className="min-h-screen pt-2.5 sm:py-4 transition-colors flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Discreet Top Theme Preview Bar (visible on public storefront) */}
      {currentRoute === 'storefront' && (
        <ThemePreviewBar
          themeConfig={profile.themeConfig}
          couponEnabled={Boolean(profile.coupon?.enabled)}
          onChangeTheme={handleChangeTheme}
          onToggleCoupon={handleToggleCouponPreview}
        />
      )}

      {/* Centered 640px Mobile-First App Shell */}
      <div
        className="w-full max-w-[640px] mx-auto min-h-screen sm:min-h-[calc(100vh-5.5rem)] sm:rounded-[28px] overflow-x-clip flex flex-col transition-colors mb-auto"
        style={{
          backgroundColor: 'var(--bg-shell)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-shell)',
        }}
      >
        {currentRoute === 'dashboard' ? (
          <AdminPanel
            products={products}
            profile={profile}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onReorderProduct={handleReorderProduct}
            onUpdateProfile={handleUpdateProfile}
            onImportBackup={handleImportBackup}
            onResetDefaults={handleResetDefaults}
            onBackToStore={() => navigateTo('storefront')}
            onLogout={handleLogout}
            onNotify={notify}
            onOpenProfileEditor={() => navigateTo('dashboard-profile')}
            onOpenPricing={() => navigateTo('pricing')}
            onNavigateToCheckout={(plan, cycle) => navigateTo('checkout', { plan, billing: cycle || 'monthly' })}
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
                        setSelectedStore(e.target.value as 'Todas' | StorePlatform)
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
                      onProductClick={handleProductOfferClick}
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

            {/* 5. Footer with Admin / Google Login Trigger */}
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
                onClick={handleOpenDashboardTrigger}
                aria-label="Abrir modo gerenciador ou login com Google"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11.5px] font-medium transition-colors whitespace-nowrap shrink-0 hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                {currentUser ? (
                  <>
                    <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Painel ({profile.plan === 'scale' || profile.is_master_admin ? 'Scale' : profile.plan === 'pro' ? 'Pro' : 'Grátis'})</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Gerenciador</span>
                  </>
                )}
              </button>
            </footer>

            {/* 6. Marca d'água do Plano Free (Removida nos planos Pro e Scale) */}
            {isFreePlan && (
              <div
                className="py-2.5 px-4 text-center border-t border-gray-200/60 dark:border-zinc-800/80 bg-black/[0.015] dark:bg-white/[0.015]"
              >
                <button
                  type="button"
                  onClick={() => navigateTo('login')}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-[#EE4D2D] dark:text-zinc-400 dark:hover:text-[#EE4D2D] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#EE4D2D]" />
                  <span>Feito com <strong>AchadosLink</strong> — Crie sua vitrine grátis com Google</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Autenticação com Google (Overlay opcional) */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={authModalReason.title}
        description={authModalReason.description}
      />

      {/* Modal de Upgrade de Planos */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={profile.plan || 'free'}
        isMasterAdmin={profile.is_master_admin}
        triggerReason={upgradeReason}
        onSelectPlan={(plan, cycle) => {
          setUpgradeModalOpen(false);
          navigateTo('checkout', { plan, billing: cycle || 'monthly' });
        }}
      />

      {/* Non-blocking Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
