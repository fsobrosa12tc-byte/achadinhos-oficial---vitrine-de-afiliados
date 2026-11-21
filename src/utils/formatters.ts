import {
  ACCENT_PRESETS,
  AccentColorHex,
  BackupPayload,
  CouponConfig,
  DEFAULT_COUPON_CONFIG,
  DEFAULT_THEME_CONFIG,
  LayoutStyle,
  Product,
  ProfileConfig,
  STORE_PLATFORMS,
  StorePlatform,
  ThemeConfig,
  ThemeMode,
} from '../types';

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function normalizeCodeInput(raw: string): string {
  const cleaned = raw.trim().replace(/^#+/, '').toUpperCase();
  if (/^\d+$/.test(cleaned)) {
    return cleaned.padStart(3, '0');
  }
  return cleaned;
}

export function displayCode(code: string): string {
  const cleaned = code.trim().replace(/^#+/, '');
  return `#${cleaned}`;
}

export function calculateDiscountPercent(
  oldPrice?: number,
  currentPrice?: number
): number | null {
  if (
    typeof oldPrice !== 'number' ||
    typeof currentPrice !== 'number' ||
    !Number.isFinite(oldPrice) ||
    !Number.isFinite(currentPrice) ||
    oldPrice <= 0 ||
    currentPrice <= 0 ||
    oldPrice <= currentPrice
  ) {
    return null;
  }
  const pct = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
  return pct >= 1 ? pct : null;
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function suggestNextCode(products: Product[]): string {
  let maxNum = 0;
  for (const item of products) {
    const digits = item.code.replace(/\D/g, '');
    if (digits) {
      const parsed = parseInt(digits, 10);
      if (parsed > maxNum) maxNum = parsed;
    }
  }
  return String(maxNum + 1).padStart(3, '0');
}

export function buildWhatsAppShareUrl(
  product: Product,
  profileHandle: string
): string {
  const discount = calculateDiscountPercent(
    product.oldPrice,
    product.currentPrice
  );
  const priceLine = discount
    ? `${formatCurrencyBRL(product.currentPrice)} (${discount}% OFF)`
    : formatCurrencyBRL(product.currentPrice);

  const text = [
    `Olha esse achadinho ${displayCode(product.code)} da vitrine ${profileHandle}:`,
    product.title,
    `Por ${priceLine} na ${product.store}`,
    product.affiliateUrl,
  ].join('\n');

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function sanitizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '#';
  } catch {
    return '#';
  }
}

export function sanitizeThemeConfig(raw: unknown): ThemeConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_THEME_CONFIG };
  }
  const obj = raw as Record<string, unknown>;
  const mode: ThemeMode = ['light', 'dark', 'luxury'].includes(String(obj.mode))
    ? (obj.mode as ThemeMode)
    : DEFAULT_THEME_CONFIG.mode;

  const validHexes = ACCENT_PRESETS.map((p) => p.hex);
  const accentColor: AccentColorHex = validHexes.includes(
    obj.accentColor as AccentColorHex
  )
    ? (obj.accentColor as AccentColorHex)
    : DEFAULT_THEME_CONFIG.accentColor;

  const layoutStyle: LayoutStyle =
    obj.layoutStyle === 'list' || obj.layoutStyle === 'grid'
      ? obj.layoutStyle
      : DEFAULT_THEME_CONFIG.layoutStyle;

  return { mode, accentColor, layoutStyle };
}

export function sanitizeCouponConfig(raw: unknown): CouponConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_COUPON_CONFIG };
  }
  const obj = raw as Record<string, unknown>;
  return {
    enabled: Boolean(obj.enabled),
    code:
      typeof obj.code === 'string' && obj.code.trim()
        ? obj.code.trim().toUpperCase()
        : DEFAULT_COUPON_CONFIG.code,
    description:
      typeof obj.description === 'string' ? obj.description.trim() : '',
  };
}

export function hydrateProfile(
  raw: unknown,
  fallback: ProfileConfig
): ProfileConfig {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const obj = raw as Record<string, unknown>;
  return {
    handle:
      typeof obj.handle === 'string' && obj.handle.trim()
        ? obj.handle.trim()
        : fallback.handle,
    bio: typeof obj.bio === 'string' ? obj.bio : fallback.bio,
    avatarUrl:
      typeof obj.avatarUrl === 'string' ? obj.avatarUrl : fallback.avatarUrl,
    themeConfig: sanitizeThemeConfig(obj.themeConfig),
    coupon:
      obj.coupon !== undefined
        ? sanitizeCouponConfig(obj.coupon)
        : fallback.coupon ?? { ...DEFAULT_COUPON_CONFIG },
    socials: Array.isArray(obj.socials)
      ? obj.socials
          .filter(
            (s): s is Record<string, unknown> =>
              Boolean(s) && typeof s === 'object'
          )
          .map((s) => ({
            key: (['tiktok', 'instagram', 'whatsapp'].includes(String(s.key))
              ? s.key
              : 'instagram') as 'tiktok' | 'instagram' | 'whatsapp',
            label: typeof s.label === 'string' ? s.label : 'Rede Social',
            url: typeof s.url === 'string' ? s.url : '',
            enabled: Boolean(s.enabled),
          }))
      : fallback.socials,
  };
}

export function generateTypeScriptExport(
  profile: ProfileConfig,
  products: Product[]
): string {
  return `import { Product, ProfileConfig } from '../types';

export const INITIAL_PROFILE: ProfileConfig = ${JSON.stringify(profile, null, 2)};

export const INITIAL_PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};
`;
}

export function generateJsonExport(
  profile: ProfileConfig,
  products: Product[]
): string {
  const payload: BackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    profile,
    products,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackupJson(rawText: string): {
  profile?: ProfileConfig;
  products: Product[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      'JSON inválido. Verifique a sintaxe do arquivo ou texto colado.'
    );
  }

  let rawProducts: unknown;
  let rawProfile: unknown;

  if (Array.isArray(parsed)) {
    rawProducts = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    rawProducts = obj.products;
    rawProfile = obj.profile;
  }

  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    throw new Error(
      'O JSON precisa conter uma lista válida de produtos (campo "products" ou array direto).'
    );
  }

  const validProducts: Product[] = rawProducts.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Item #${idx + 1} está em formato inválido.`);
    }
    const p = item as Record<string, unknown>;
    const title = typeof p.title === 'string' ? p.title.trim() : '';
    const code =
      typeof p.code === 'string'
        ? normalizeCodeInput(p.code)
        : String(idx + 1).padStart(3, '0');
    const category =
      typeof p.category === 'string' && p.category.trim()
        ? p.category.trim()
        : 'Geral';
    const rawStore = typeof p.store === 'string' ? p.store : 'Shopee';
    const store: StorePlatform = STORE_PLATFORMS.includes(
      rawStore as StorePlatform
    )
      ? (rawStore as StorePlatform)
      : 'Shopee';
    const currentPrice = Number(p.currentPrice);
    const oldPrice =
      p.oldPrice !== undefined && p.oldPrice !== null && p.oldPrice !== ''
        ? Number(p.oldPrice)
        : undefined;
    const imageUrl = typeof p.imageUrl === 'string' ? p.imageUrl.trim() : '';
    const affiliateUrl =
      typeof p.affiliateUrl === 'string' ? p.affiliateUrl.trim() : '';

    if (!title || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      throw new Error(
        `Produto na posição ${idx + 1} precisa de título e preço atual válidos.`
      );
    }

    return {
      id:
        typeof p.id === 'string' && p.id.trim()
          ? p.id.trim()
          : `prod-imp-${Date.now()}-${idx}`,
      code,
      title,
      category,
      store,
      oldPrice:
        oldPrice !== undefined && Number.isFinite(oldPrice) && oldPrice > 0
          ? oldPrice
          : undefined,
      currentPrice,
      imageUrl,
      affiliateUrl: affiliateUrl || 'https://shopee.com.br',
    };
  });

  let validatedProfile: ProfileConfig | undefined;
  if (rawProfile && typeof rawProfile === 'object') {
    const prof = rawProfile as Record<string, unknown>;
    if (typeof prof.handle === 'string' && prof.handle.trim()) {
      const socials = Array.isArray(prof.socials)
        ? prof.socials
            .filter(
              (s): s is Record<string, unknown> =>
                Boolean(s) && typeof s === 'object'
            )
            .map((s) => ({
              key: (['tiktok', 'instagram', 'whatsapp'].includes(String(s.key))
                ? s.key
                : 'instagram') as 'tiktok' | 'instagram' | 'whatsapp',
              label: typeof s.label === 'string' ? s.label : 'Rede Social',
              url: typeof s.url === 'string' ? s.url : '',
              enabled: Boolean(s.enabled),
            }))
        : [];

      validatedProfile = {
        handle: prof.handle.trim(),
        bio: typeof prof.bio === 'string' ? prof.bio.trim() : '',
        avatarUrl:
          typeof prof.avatarUrl === 'string' ? prof.avatarUrl.trim() : '',
        themeConfig: sanitizeThemeConfig(prof.themeConfig),
        coupon:
          prof.coupon !== undefined
            ? sanitizeCouponConfig(prof.coupon)
            : { ...DEFAULT_COUPON_CONFIG },
        socials,
      };
    }
  }

  return { profile: validatedProfile, products: validProducts };
}

export function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
