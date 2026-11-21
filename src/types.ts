export type StorePlatform =
  | 'Shopee'
  | 'Mercado Livre'
  | 'Amazon'
  | 'Hotmart'
  | 'Cakto';

export type SaaSSubscriptionPlan = 'free' | 'pro' | 'scale';

export interface Product {
  id: string;
  code: string; // Stored without '#', e.g. "001"
  title: string;
  category: string;
  store: StorePlatform;
  oldPrice?: number;
  currentPrice: number;
  imageUrl: string;
  affiliateUrl: string;
  profile_id?: string;
  category_id?: string | null;
  coupon_code?: string;
  is_featured?: boolean;
  clicks_count?: number;
  active?: boolean;
  created_at?: string;
}

export type SocialNetworkKey = 'tiktok' | 'instagram' | 'whatsapp';

export interface SocialLinkConfig {
  key: SocialNetworkKey;
  label: string;
  url: string;
  enabled: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'luxury';

export type LayoutStyle = 'grid' | 'list';

export type AccentColorHex =
  | '#EE4D2D'
  | '#7C3AED'
  | '#10B981'
  | '#2563EB'
  | '#EC4899';

export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: AccentColorHex;
  layoutStyle: LayoutStyle;
}

export interface CouponConfig {
  enabled: boolean;
  code: string;
  description?: string;
}

export interface ProfileConfig {
  id?: string;
  email?: string;
  slug?: string;
  handle: string; // Ex: @andrezza
  display_name?: string;
  bio: string;
  avatarUrl: string;
  banner_color?: string;
  themeConfig: ThemeConfig;
  coupon?: CouponConfig;
  socials: SocialLinkConfig[];
  plan?: SaaSSubscriptionPlan;
  is_master_admin?: boolean;
  subscription_status?: string;
  whatsapp_vip_url?: string;
  pixel_meta?: string;
  pixel_tiktok?: string;
}

export interface CategoryItem {
  id: string;
  profile_id: string;
  name: string;
  sort_order: number;
}

export interface ProductClickItem {
  id: string;
  product_id: string;
  profile_id: string;
  referrer?: string | null;
  clicked_at: string;
}

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'discount-desc';

export interface ToastItem {
  id: string;
  message: string;
  variant?: 'default' | 'success' | 'error';
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  profile: ProfileConfig;
  products: Product[];
}

export const STORE_PLATFORMS: StorePlatform[] = [
  'Shopee',
  'Mercado Livre',
  'Amazon',
  'Hotmart',
  'Cakto',
];

export const STORE_BADGE_STYLES: Record<
  StorePlatform,
  { bg: string; text: string; shortLabel: string; dotColor: string }
> = {
  Shopee: {
    bg: 'bg-[#EE4D2D]',
    text: 'text-white',
    shortLabel: 'Shopee',
    dotColor: '#EE4D2D',
  },
  'Mercado Livre': {
    bg: 'bg-[#FFE600]',
    text: 'text-[#2D3277]',
    shortLabel: 'Mercado Livre',
    dotColor: '#D4B800',
  },
  Amazon: {
    bg: 'bg-[#131921]',
    text: 'text-[#FF9900]',
    shortLabel: 'Amazon',
    dotColor: '#FF9900',
  },
  Hotmart: {
    bg: 'bg-[#F04E23]',
    text: 'text-white',
    shortLabel: 'Hotmart',
    dotColor: '#F04E23',
  },
  Cakto: {
    bg: 'bg-[#059669]',
    text: 'text-white',
    shortLabel: 'Cakto',
    dotColor: '#059669',
  },
};

export interface AccentPreset {
  hex: AccentColorHex;
  hoverHex: string;
  activeHex: string;
  gradientEnd: string;
  label: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    hex: '#EE4D2D',
    hoverHex: '#D93D1E',
    activeHex: '#C23216',
    gradientEnd: '#FF8A5B',
    label: 'Laranja',
  },
  {
    hex: '#7C3AED',
    hoverHex: '#6D28D9',
    activeHex: '#5B21B6',
    gradientEnd: '#A78BFA',
    label: 'Roxo',
  },
  {
    hex: '#10B981',
    hoverHex: '#059669',
    activeHex: '#047857',
    gradientEnd: '#34D399',
    label: 'Esmeralda',
  },
  {
    hex: '#2563EB',
    hoverHex: '#1D4ED8',
    activeHex: '#1E40AF',
    gradientEnd: '#60A5FA',
    label: 'Azul Royal',
  },
  {
    hex: '#EC4899',
    hoverHex: '#DB2777',
    activeHex: '#BE185D',
    gradientEnd: '#F472B6',
    label: 'Rosa',
  },
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'light',
  accentColor: '#EE4D2D',
  layoutStyle: 'grid',
};

export const DEFAULT_COUPON_CONFIG: CouponConfig = {
  enabled: true,
  code: 'ACHADOS10',
  description: '10% OFF extra em lojas selecionadas',
};

export function getAccentPreset(hex: string): AccentPreset {
  return (
    ACCENT_PRESETS.find(
      (preset) => preset.hex.toLowerCase() === hex.toLowerCase()
    ) ?? ACCENT_PRESETS[0]
  );
}
