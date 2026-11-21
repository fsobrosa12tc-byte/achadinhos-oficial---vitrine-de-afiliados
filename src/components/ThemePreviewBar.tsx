import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  LayoutGrid,
  List,
  Moon,
  Palette,
  Sun,
  Ticket,
} from 'lucide-react';
import {
  ACCENT_PRESETS,
  AccentColorHex,
  LayoutStyle,
  ThemeConfig,
  ThemeMode,
} from '../types';

interface ThemePreviewBarProps {
  themeConfig: ThemeConfig;
  couponEnabled: boolean;
  onChangeTheme: (next: Partial<ThemeConfig>) => void;
  onToggleCoupon: () => void;
}

const MODE_OPTIONS: {
  value: ThemeMode;
  label: string;
  Icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
  { value: 'luxury', label: 'Luxury', Icon: Crown },
];

export function ThemePreviewBar({
  themeConfig,
  couponEnabled,
  onChangeTheme,
  onToggleCoupon,
}: ThemePreviewBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      aria-label="Barra de Preview de Tema"
      className="w-full max-w-[640px] mx-auto px-2.5 sm:px-0 mb-2.5"
    >
      <div
        className="rounded-2xl px-3 py-2 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Palette
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--accent)' }}
              aria-hidden="true"
            />
            <span
              className="text-[11px] font-semibold tracking-tight truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              Preview de Tema
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface-muted)',
            }}
          >
            <span>{collapsed ? 'Mostrar' : 'Ocultar'}</span>
            {collapsed ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-2 pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)]">
            {/* Color Mode Segmented Control */}
            <div
              role="group"
              aria-label="Modo de cor"
              className="inline-flex items-center p-0.5 rounded-xl gap-0.5"
              style={{ backgroundColor: 'var(--bg-surface-muted)' }}
            >
              {MODE_OPTIONS.map(({ value, label, Icon }) => {
                const active = themeConfig.mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeTheme({ mode: value })}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap"
                    style={
                      active
                        ? {
                            backgroundColor: 'var(--bg-surface)',
                            color:
                              value === 'luxury'
                                ? 'var(--luxury-gold)'
                                : 'var(--text-primary)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                          }
                        : {
                            color: 'var(--text-muted)',
                          }
                    }
                  >
                    <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Accent Color Swatches */}
            <div
              role="group"
              aria-label="Cor de destaque"
              className="flex items-center gap-1.5"
            >
              {ACCENT_PRESETS.map((preset) => {
                const selected =
                  themeConfig.accentColor.toLowerCase() ===
                  preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    title={preset.label}
                    aria-label={`Cor de destaque ${preset.label}`}
                    aria-pressed={selected}
                    onClick={() =>
                      onChangeTheme({
                        accentColor: preset.hex as AccentColorHex,
                      })
                    }
                    className={`w-6 h-6 rounded-full transition-transform active:scale-90 ${
                      selected ? 'scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: preset.hex,
                      boxShadow: selected
                        ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${preset.hex}`
                        : 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                    }}
                  />
                );
              })}
            </div>

            {/* Layout Style + Coupon Toggle */}
            <div className="flex items-center gap-1.5">
              <div
                role="group"
                aria-label="Formato de exibição"
                className="inline-flex items-center p-0.5 rounded-xl gap-0.5"
                style={{ backgroundColor: 'var(--bg-surface-muted)' }}
              >
                {(
                  [
                    { value: 'grid', label: 'Grade', Icon: LayoutGrid },
                    { value: 'list', label: 'Lista', Icon: List },
                  ] as {
                    value: LayoutStyle;
                    label: string;
                    Icon: typeof LayoutGrid;
                  }[]
                ).map(({ value, label, Icon }) => {
                  const active = themeConfig.layoutStyle === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeTheme({ layoutStyle: value })}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap"
                      style={
                        active
                          ? {
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            }
                          : { color: 'var(--text-muted)' }
                      }
                    >
                      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-pressed={couponEnabled}
                onClick={onToggleCoupon}
                title="Exibir ou ocultar banner de cupom"
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap"
                style={
                  couponEnabled
                    ? {
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--coupon-label)',
                        border: '1px solid var(--accent-soft-border)',
                      }
                    : {
                        backgroundColor: 'var(--bg-surface-muted)',
                        color: 'var(--text-muted)',
                        border: '1px solid transparent',
                      }
                }
              >
                <Ticket className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Cupom</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
