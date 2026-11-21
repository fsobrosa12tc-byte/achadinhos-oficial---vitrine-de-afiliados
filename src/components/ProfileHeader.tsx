import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Check,
  Copy,
  Instagram,
  MessageCircle,
  Music2,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import { ProfileConfig, SocialNetworkKey } from '../types';
import { sanitizeExternalUrl } from '../utils/formatters';

interface ProfileHeaderProps {
  profile: ProfileConfig;
  compact?: boolean;
  onCopyCoupon?: (code: string) => void;
}

const SOCIAL_ICON_MAP: Record<SocialNetworkKey, typeof Instagram> = {
  tiktok: Music2,
  instagram: Instagram,
  whatsapp: MessageCircle,
};

export function ProfileHeader({
  profile,
  compact = false,
  onCopyCoupon,
}: ProfileHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [profile.avatarUrl]);

  const mode = profile.themeConfig?.mode ?? 'light';
  const isLuxury = mode === 'luxury';
  const isDark = mode === 'dark';

  const activeSocials = profile.socials.filter(
    (social) => social.enabled && social.url.trim().length > 0
  );

  const showCoupon = Boolean(
    profile.coupon?.enabled && profile.coupon.code.trim().length > 0
  );

  const handleCopyCoupon = async () => {
    const code = profile.coupon?.code.trim();
    if (!code || compact) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback handled by toast
    }
    setCouponCopied(true);
    onCopyCoupon?.(code);
    window.setTimeout(() => setCouponCopied(false), 2200);
  };

  const bannerBackground = isLuxury
    ? 'linear-gradient(135deg, #09090B 0%, color-mix(in srgb, var(--accent) 42%, #111115) 55%, color-mix(in srgb, #D4AF37 38%, var(--accent)) 100%)'
    : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-end) 100%)';

  const getSocialButtonStyle = (key: SocialNetworkKey) => {
    if (isLuxury) {
      if (key === 'whatsapp') {
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.14)',
          color: '#6EE7B7',
          borderColor: 'rgba(16, 185, 129, 0.34)',
        };
      }
      return {
        backgroundColor: '#1A1A20',
        color: '#FAF7F0',
        borderColor: 'rgba(212, 175, 55, 0.3)',
      };
    }

    if (isDark) {
      if (key === 'whatsapp') {
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.16)',
          color: '#6EE7B7',
          borderColor: 'rgba(16, 185, 129, 0.3)',
        };
      }
      return {
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        borderColor: 'rgba(148, 163, 184, 0.24)',
      };
    }

    if (key === 'tiktok') {
      return {
        backgroundColor: '#111827',
        color: '#FFFFFF',
        borderColor: 'transparent',
      };
    }
    if (key === 'whatsapp') {
      return {
        backgroundColor: '#ECFDF5',
        color: '#047857',
        borderColor: '#A7F3D0',
      };
    }
    return {
      backgroundColor: '#FFFFFF',
      color: '#111827',
      borderColor: 'rgba(17, 24, 39, 0.12)',
    };
  };

  return (
    <header
      className="overflow-hidden transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top gradient banner powered by dynamic --accent */}
      <div
        className={`relative w-full ${compact ? 'h-20' : 'h-26 sm:h-28'}`}
        style={{
          background: bannerBackground,
          borderBottom: isLuxury
            ? '1px solid rgba(212, 175, 55, 0.35)'
            : undefined,
        }}
      >
        <div
          className="absolute inset-0 opacity-22"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.65) 0%, transparent 50%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.45) 0%, transparent 45%)',
          }}
        />
      </div>

      {/* Overlapping avatar + profile info */}
      <div className={`px-4 ${compact ? 'pb-4' : 'pb-5'} text-center`}>
        <div
          className={`relative mx-auto ${compact ? '-mt-10 w-18 h-18' : '-mt-11 w-22 h-22'} rounded-full shadow-md overflow-hidden flex items-center justify-center`}
          style={{
            boxShadow: `0 0 0 4px var(--ring-avatar), 0 6px 18px rgba(0,0,0,0.16)`,
            backgroundColor: 'var(--bg-surface-muted)',
          }}
        >
          {profile.avatarUrl && !imgError ? (
            <img
              src={profile.avatarUrl}
              alt={`Foto de perfil ${profile.handle}`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent), var(--accent-end))',
              }}
            >
              <ShoppingBag className={compact ? 'w-7 h-7' : 'w-8 h-8'} />
            </div>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          <h1
            className={`${compact ? 'text-base' : 'text-lg sm:text-[19px]'} font-bold tracking-tight`}
            style={{ color: 'var(--text-primary)' }}
          >
            {profile.handle || '@achadinhos.oficial'}
          </h1>
          <BadgeCheck
            className="w-4.5 h-4.5 shrink-0"
            style={{
              color: isLuxury ? 'var(--luxury-gold)' : 'var(--accent)',
            }}
            aria-label="Perfil verificado"
          />
        </div>

        {profile.bio && (
          <p
            className="mt-1 text-[13px] sm:text-sm leading-snug max-w-[440px] mx-auto line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {profile.bio}
          </p>
        )}

        {/* Highlighted Copyable Coupon Banner right below the bio */}
        {showCoupon && profile.coupon && (
          <div
            className="mt-3.5 max-w-[430px] mx-auto rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 text-left transition-all"
            style={{
              background: 'var(--coupon-bg)',
              border: '1px dashed var(--coupon-border)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isLuxury
                    ? 'rgba(212, 175, 55, 0.16)'
                    : 'var(--accent-soft)',
                  color: 'var(--coupon-label)',
                }}
              >
                <Ticket className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-tight truncate">
                  <span
                    className="font-semibold mr-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    CUPOM:
                  </span>
                  <span
                    className="font-mono tracking-wide"
                    style={{ color: 'var(--coupon-label)' }}
                  >
                    {profile.coupon.code}
                  </span>
                </p>
                {profile.coupon.description && (
                  <p
                    className="text-[11px] truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {profile.coupon.description}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCoupon}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[11.5px] font-semibold transition-all active:scale-[0.96] whitespace-nowrap shrink-0"
              style={
                couponCopied
                  ? {
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                    }
                  : isLuxury
                    ? {
                        backgroundColor: 'rgba(212, 175, 55, 0.18)',
                        color: '#E5C158',
                        border: '1px solid rgba(212, 175, 55, 0.45)',
                      }
                    : {
                        backgroundColor: 'var(--accent)',
                        color: '#FFFFFF',
                      }
              }
            >
              {couponCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Social pill buttons */}
        {activeSocials.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            {activeSocials.map((social) => {
              const Icon = SOCIAL_ICON_MAP[social.key] ?? MessageCircle;
              const styleObj = getSocialButtonStyle(social.key);

              return (
                <a
                  key={social.key}
                  href={sanitizeExternalUrl(social.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (compact) e.preventDefault();
                  }}
                  style={styleObj}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.97] whitespace-nowrap shrink-0"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{social.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
