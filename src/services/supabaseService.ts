import { supabase } from '../lib/supabase';
import {
  CategoryItem,
  DEFAULT_COUPON_CONFIG,
  DEFAULT_THEME_CONFIG,
  Product,
  ProfileConfig,
  SaaSSubscriptionPlan,
  StorePlatform,
} from '../types';

export interface DbProfileRow {
  id: string;
  email: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_color: string | null;
  theme_mode: 'light' | 'dark' | 'luxury';
  layout_style: 'grid' | 'list';
  plan: SaaSSubscriptionPlan;
  is_master_admin: boolean;
  subscription_status: string;
  social_links: any[];
  whatsapp_vip_url: string | null;
  featured_coupon: string | null;
  pixel_meta: string | null;
  pixel_tiktok: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DbProductRow {
  id: string;
  profile_id: string;
  category_id: string | null;
  code: string;
  title: string;
  store_name: string;
  old_price: string | null;
  current_price: string;
  image_url: string;
  affiliate_url: string;
  coupon_code: string | null;
  is_featured: boolean;
  clicks_count: number;
  active: boolean;
  created_at: string;
}

export function mapDbProfileToConfig(db: DbProfileRow): ProfileConfig {
  let couponConfig = { ...DEFAULT_COUPON_CONFIG };
  if (db.featured_coupon) {
    try {
      const parsed = JSON.parse(db.featured_coupon);
      couponConfig = {
        enabled: Boolean(parsed.enabled),
        code: parsed.code || 'ACHADOS10',
        description: parsed.description || '',
      };
    } catch {
      couponConfig = {
        enabled: true,
        code: db.featured_coupon,
        description: 'Cupom exclusivo da vitrine',
      };
    }
  }

  return {
    id: db.id,
    email: db.email,
    slug: db.slug,
    handle: `@${db.slug}`,
    display_name: db.display_name,
    bio: db.bio || '',
    avatarUrl: db.avatar_url || '',
    banner_color: db.banner_color || '#EE4D2D',
    plan: db.plan || 'free',
    is_master_admin: Boolean(db.is_master_admin),
    subscription_status: db.subscription_status || 'active',
    whatsapp_vip_url: db.whatsapp_vip_url || '',
    pixel_meta: db.pixel_meta || '',
    pixel_tiktok: db.pixel_tiktok || '',
    coupon: couponConfig,
    themeConfig: {
      mode: db.theme_mode || 'light',
      accentColor: (db.banner_color as any) || '#EE4D2D',
      layoutStyle: db.layout_style || 'grid',
    },
    socials: Array.isArray(db.social_links) && db.social_links.length > 0
      ? db.social_links
      : [
          { key: 'instagram', label: 'Instagram', url: '', enabled: false },
          { key: 'tiktok', label: 'TikTok', url: '', enabled: false },
          { key: 'whatsapp', label: 'Grupo VIP', url: '', enabled: false },
        ],
  };
}

export function mapDbProductToProduct(db: DbProductRow, categoryName?: string): Product {
  const currentPriceNum = parseFloat(db.current_price.replace(',', '.')) || 0;
  const oldPriceNum = db.old_price ? parseFloat(db.old_price.replace(',', '.')) : undefined;

  return {
    id: db.id,
    profile_id: db.profile_id,
    category_id: db.category_id,
    code: db.code,
    title: db.title,
    store: (db.store_name as StorePlatform) || 'Shopee',
    currentPrice: currentPriceNum,
    oldPrice: oldPriceNum && oldPriceNum > 0 ? oldPriceNum : undefined,
    imageUrl: db.image_url,
    affiliateUrl: db.affiliate_url,
    category: categoryName || 'Geral',
    coupon_code: db.coupon_code || undefined,
    is_featured: db.is_featured,
    clicks_count: db.clicks_count || 0,
    active: db.active,
    created_at: db.created_at,
  };
}

export const RESERVED_SLUGS = [
  'login',
  'dashboard',
  'admin',
  'planos',
  'checkout',
  'api',
  'auth',
  'onboarding',
  'perfil',
  'settings',
  'vitrine',
];

export function isReservedSlug(slug: string): boolean {
  const clean = slug.replace(/^@+/, '').trim().toLowerCase();
  return RESERVED_SLUGS.includes(clean);
}

export const supabaseService = {
  // --- AUTENTICAÇÃO ---
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  },

  // --- PERFIS & ONBOARDING ---
  async getProfileBySlug(slug: string): Promise<ProfileConfig | null> {
    const cleanSlug = slug.replace(/^@+/, '').trim().toLowerCase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (error || !data) return null;
    return mapDbProfileToConfig(data as DbProfileRow);
  },

  async getProfileByUserId(userId: string): Promise<ProfileConfig | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapDbProfileToConfig(data as DbProfileRow);
  },

  async checkSlugAvailability(slug: string, currentUserId?: string): Promise<{ available: boolean; reason?: string }> {
    const cleanSlug = slug.replace(/^@+/, '').trim().toLowerCase();
    if (!cleanSlug) return { available: false, reason: 'Slug não pode ser vazio' };

    if (!/^[a-z0-9_-]{3,30}$/.test(cleanSlug)) {
      return { available: false, reason: 'O link deve ter entre 3 e 30 letras, números, hífens ou underlines.' };
    }

    if (isReservedSlug(cleanSlug)) {
      return { available: false, reason: `O slug "@${cleanSlug}" é um link reservado do sistema. Escolha outro.` };
    }

    let query = supabase.from('profiles').select('id').eq('slug', cleanSlug);
    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }
    const { data } = await query.maybeSingle();
    if (data) {
      return { available: false, reason: `O link @${cleanSlug} já está em uso por outro criador.` };
    }
    return { available: true };
  },

  async createProfile(params: {
    userId: string;
    email: string;
    slug: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<ProfileConfig> {
    const cleanSlug = params.slug.replace(/^@+/, '').trim().toLowerCase();
    const isMasterEmail = params.email.toLowerCase() === 'atendimentoandrezzaferraz@gmail.com';

    const insertPayload = {
      id: params.userId,
      email: params.email,
      slug: cleanSlug,
      display_name: params.displayName,
      bio: params.bio || '',
      avatar_url: params.avatarUrl || '',
      banner_color: '#EE4D2D',
      theme_mode: 'light',
      layout_style: 'grid',
      plan: isMasterEmail ? 'scale' : 'free',
      is_master_admin: isMasterEmail,
      subscription_status: isMasterEmail ? 'lifetime' : 'active',
      social_links: [],
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;
    return mapDbProfileToConfig(data as DbProfileRow);
  },

  async updateProfile(profileId: string, profile: ProfileConfig): Promise<void> {
    const payload: Partial<DbProfileRow> = {
      display_name: profile.display_name || profile.handle.replace(/^@/, ''),
      bio: profile.bio,
      avatar_url: profile.avatarUrl,
      banner_color: profile.themeConfig.accentColor,
      theme_mode: profile.themeConfig.mode,
      layout_style: profile.themeConfig.layoutStyle,
      social_links: profile.socials,
      whatsapp_vip_url: profile.whatsapp_vip_url || null,
      pixel_meta: profile.pixel_meta || null,
      pixel_tiktok: profile.pixel_tiktok || null,
      featured_coupon: profile.coupon ? JSON.stringify(profile.coupon) : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profileId);

    if (error) throw error;
  },

  async upsertProfile(profile: ProfileConfig): Promise<ProfileConfig> {
    if (!profile.id) throw new Error('ID do usuário é obrigatório para salvar perfil');

    const cleanSlug = profile.handle.replace(/^@+/, '').trim().toLowerCase();
    const payload: Partial<DbProfileRow> = {
      id: profile.id,
      slug: cleanSlug,
      display_name: profile.display_name || cleanSlug,
      bio: profile.bio || '',
      avatar_url: profile.avatarUrl || '',
      banner_color: profile.themeConfig.accentColor,
      theme_mode: profile.themeConfig.mode,
      layout_style: profile.themeConfig.layoutStyle,
      social_links: profile.socials,
      whatsapp_vip_url: profile.whatsapp_vip_url || null,
      pixel_meta: profile.pixel_meta || null,
      pixel_tiktok: profile.pixel_tiktok || null,
      featured_coupon: profile.coupon ? JSON.stringify(profile.coupon) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return mapDbProfileToConfig(data as DbProfileRow);
  },

  async upgradePlan(profileId: string, plan: 'pro' | 'scale', billingCycle: 'monthly' | 'yearly'): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        plan,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (error) throw error;
  },

  // --- PRODUTOS & CATEGORIAS ---
  async getProducts(profileId: string, onlyActive = false): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .eq('profile_id', profileId);

    if (onlyActive) {
      query = query.eq('active', true);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }

    return (data || []).map((row: any) =>
      mapDbProductToProduct(row as DbProductRow, row.categories?.name)
    );
  },

  async saveProduct(
    product: Partial<Product>,
    profileId: string
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      const payload: any = {
        profile_id: profileId,
        code: product.code?.replace(/^#+/, '').trim() || '001',
        title: product.title?.trim() || '',
        store_name: product.store || 'Shopee',
        current_price: String(product.currentPrice),
        old_price: product.oldPrice ? String(product.oldPrice) : null,
        image_url: product.imageUrl || '',
        affiliate_url: product.affiliateUrl || '',
        active: product.active ?? true,
      };

      if (product.id && product.id.length > 20) {
        // Atualizar existente
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
          .select('*, categories(name)')
          .single();

        if (error) throw error;
        return { success: true, product: mapDbProductToProduct(data, data.categories?.name) };
      } else {
        // Inserir novo
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('*, categories(name)')
          .single();

        if (error) throw error;
        return { success: true, product: mapDbProductToProduct(data, data.categories?.name) };
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao salvar produto';
      return { success: false, error: msg };
    }
  },

  async deleteProduct(productId: string): Promise<boolean> {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    return !error;
  },

  // --- ANALYTICS & CLIQUES ---
  async recordProductClick(productId: string, profileId: string, referrer?: string): Promise<void> {
    try {
      await supabase.rpc('increment_product_click', {
        p_product_id: productId,
        p_profile_id: profileId,
        p_referrer: referrer || (typeof document !== 'undefined' ? document.referrer : null),
      });
    } catch (err) {
      console.warn('Erro ao registrar clique via RPC:', err);
    }
  },

  async getAnalytics(profileId: string) {
    const { data: clicks, error } = await supabase
      .from('product_clicks')
      .select('id, product_id, referrer, clicked_at, products(title, code, store_name)')
      .eq('profile_id', profileId)
      .order('clicked_at', { ascending: false })
      .limit(200);

    if (error) {
      console.warn('Erro ao buscar analytics:', error);
      return { totalClicks: 0, recentClicks: [], topProducts: [] };
    }

    const totalClicks = clicks.length;
    const productStats = new Map<string, { title: string; code: string; count: number }>();

    clicks.forEach((c: any) => {
      const pId = c.product_id;
      const title = c.products?.title || 'Produto Desconhecido';
      const code = c.products?.code || '---';
      const current = productStats.get(pId) || { title, code, count: 0 };
      current.count += 1;
      productStats.set(pId, current);
    });

    const topProducts = Array.from(productStats.values()).sort((a, b) => b.count - a.count);

    return {
      totalClicks,
      recentClicks: clicks,
      topProducts,
    };
  },

  // --- STORAGE UPLOAD ---
  async uploadImage(file: File, folder = 'uploads'): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('storefront-assets')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data } = supabase.storage
      .from('storefront-assets')
      .getPublicUrl(fileName);

    return data.publicUrl;
  },
};
