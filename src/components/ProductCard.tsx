import { useEffect, useState } from 'react';
import { ExternalLink, Heart, ImageOff, Share2 } from 'lucide-react';
import { LayoutStyle, Product, STORE_BADGE_STYLES } from '../types';
import {
  buildWhatsAppShareUrl,
  calculateDiscountPercent,
  displayCode,
  formatCurrencyBRL,
  sanitizeExternalUrl,
} from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  profileHandle: string;
  layoutStyle?: LayoutStyle;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  onCopyCode?: (code: string) => void;
  isPreview?: boolean;
}

export function ProductCard({
  product,
  profileHandle,
  layoutStyle = 'grid',
  isFavorite = false,
  onToggleFavorite,
  onCopyCode,
  isPreview = false,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [product.imageUrl]);

  const storeBadge =
    STORE_BADGE_STYLES[product.store] ?? STORE_BADGE_STYLES.Shopee;
  const discountPercent = calculateDiscountPercent(
    product.oldPrice,
    product.currentPrice
  );
  const formattedCode = displayCode(product.code || '000');
  const safeOfferUrl = sanitizeExternalUrl(product.affiliateUrl);
  const whatsAppShareUrl = buildWhatsAppShareUrl(product, profileHandle);

  const isList = layoutStyle === 'list';

  return (
    <article
      className={`group card-surface card-surface-hover rounded-2xl transition-all duration-200 hover:-translate-y-0.5 overflow-hidden flex ${
        isList ? 'flex-row items-stretch' : 'flex-col'
      }`}
    >
      {/* Square product image + overlays */}
      <div
        className={`relative aspect-square overflow-hidden shrink-0 ${
          isList ? 'w-30 sm:w-36' : 'w-full'
        }`}
        style={{ backgroundColor: 'var(--bg-surface-muted)' }}
      >
        {product.imageUrl && !imageError ? (
          <img
            src={product.imageUrl}
            alt={product.title || 'Foto do produto'}
            loading={isPreview ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center"
            style={{
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-muted)',
            }}
          >
            <ImageOff className="w-6 h-6 opacity-60" aria-hidden="true" />
            <span className="text-[11px] font-medium line-clamp-2">
              {product.title || 'Prévia da imagem'}
            </span>
          </div>
        )}

        {/* Top-left discrete platform badge */}
        <span
          className={`absolute top-2 left-2 z-10 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shadow-xs ${storeBadge.bg} ${storeBadge.text}`}
        >
          {storeBadge.shortLabel}
        </span>

        {/* Top-right favorite toggle (grid layout only; in list layout it sits in header row) */}
        {!isList && (
          <button
            type="button"
            onClick={() => {
              if (!isPreview && onToggleFavorite) {
                onToggleFavorite(product.id);
              }
            }}
            aria-label={
              isFavorite
                ? `Remover ${product.title} dos favoritos`
                : `Salvar ${product.title} nos favoritos`
            }
            aria-pressed={isFavorite}
            className="absolute top-1.5 right-1.5 z-10 w-8 h-8 rounded-full backdrop-blur-xs shadow-xs flex items-center justify-center active:scale-90 transition-all"
            style={{
              backgroundColor: 'var(--bg-overlay-btn)',
              color: isFavorite ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <Heart
              className="w-4 h-4 transition-colors"
              style={
                isFavorite
                  ? { fill: 'var(--accent)', color: 'var(--accent)' }
                  : undefined
              }
            />
          </button>
        )}

        {/* Bottom-right dark numeric code badge */}
        <button
          type="button"
          onClick={() => {
            if (!isPreview && onCopyCode) {
              onCopyCode(formattedCode);
            }
          }}
          title={`Copiar código ${formattedCode}`}
          aria-label={`Código ${formattedCode}. Clique para copiar`}
          className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-lg text-white font-mono text-[11px] font-semibold tabular-nums tracking-tight backdrop-blur-xs shadow-xs transition-opacity hover:opacity-95"
          style={{ backgroundColor: 'var(--bg-code-badge)' }}
        >
          {formattedCode}
        </button>
      </div>

      {/* Product body */}
      <div
        className={`flex flex-col flex-1 min-w-0 ${
          isList ? 'p-3 justify-between' : 'p-2.5 sm:p-3'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            className={`font-semibold leading-[1.35] line-clamp-2 ${
              isList
                ? 'text-[13.5px] sm:text-sm'
                : 'text-[12.5px] sm:text-[13px] min-h-[2.7em]'
            }`}
            style={{ color: 'var(--text-primary)' }}
          >
            {product.title || 'Título do produto aparecerá aqui'}
          </h2>

          {isList && (
            <button
              type="button"
              onClick={() => {
                if (!isPreview && onToggleFavorite) {
                  onToggleFavorite(product.id);
                }
              }}
              aria-label={
                isFavorite
                  ? `Remover ${product.title} dos favoritos`
                  : `Salvar ${product.title} nos favoritos`
              }
              aria-pressed={isFavorite}
              className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
              style={{
                color: isFavorite ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <Heart
                className="w-4 h-4 transition-colors"
                style={
                  isFavorite
                    ? { fill: 'var(--accent)', color: 'var(--accent)' }
                    : undefined
                }
              />
            </button>
          )}
        </div>

        {/* Pricing block with automatic discount percentage */}
        <div className={isList ? 'mt-1.5' : 'mt-auto pt-2'}>
          <div className="flex items-center gap-1.5 min-h-[18px]">
            {product.oldPrice && product.oldPrice > product.currentPrice ? (
              <>
                <span
                  className="text-[11px] line-through tabular-nums"
                  style={{ color: 'var(--text-strike)' }}
                >
                  {formatCurrencyBRL(product.oldPrice)}
                </span>
                {discountPercent && (
                  <span
                    className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-md tabular-nums leading-none"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    }}
                  >
                    -{discountPercent}%
                  </span>
                )}
              </>
            ) : (
              <span
                className="text-[11px] truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                {product.category || 'Oferta'}
              </span>
            )}
          </div>

          <p
            className="mt-0.5 text-[16px] sm:text-[17px] font-extrabold tracking-tight tabular-nums leading-tight"
            style={{ color: 'var(--accent)' }}
          >
            {formatCurrencyBRL(product.currentPrice || 0)}
          </p>
        </div>

        {/* CTA row: Ver Oferta + Quick WhatsApp Share */}
        <div className={`${isList ? 'mt-2' : 'mt-2.5'} flex items-center gap-1.5`}>
          <a
            href={isPreview ? undefined : safeOfferUrl}
            target={isPreview ? undefined : '_blank'}
            rel={isPreview ? undefined : 'noopener noreferrer'}
            onClick={(e) => {
              if (isPreview || safeOfferUrl === '#') {
                e.preventDefault();
              }
            }}
            className="accent-btn flex-1 h-9 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98] whitespace-nowrap"
          >
            <span>Ver Oferta</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </a>

          <a
            href={isPreview ? undefined : whatsAppShareUrl}
            target={isPreview ? undefined : '_blank'}
            rel={isPreview ? undefined : 'noopener noreferrer'}
            onClick={(e) => {
              if (isPreview) e.preventDefault();
            }}
            title="Compartilhar oferta no WhatsApp"
            aria-label={`Compartilhar ${product.title} no WhatsApp`}
            className="w-9 h-9 shrink-0 rounded-xl active:scale-95 flex items-center justify-center transition-colors hover:opacity-85"
            style={{
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
