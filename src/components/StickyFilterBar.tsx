import { Heart, Search, X } from 'lucide-react';

interface StickyFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  favoritesCount: number;
}

export const FAVORITES_CATEGORY_KEY = '__FAVORITES__';

export function StickyFilterBar({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  favoritesCount,
}: StickyFilterBarProps) {
  return (
    <div
      className="sticky top-0 z-30 backdrop-blur-md px-3.5 pt-2.5 pb-2.5 transition-colors"
      style={{
        backgroundColor: 'var(--bg-sticky)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Real-time search input */}
      <div className="relative">
        <Search
          className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, categoria ou código (ex: 001)..."
          aria-label="Buscar produtos por nome, categoria ou código"
          className="accent-focus w-full h-10 pl-10 pr-9 rounded-xl text-sm focus:outline-none transition-all"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpar busca"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal scrollable category carousel without visible scrollbar */}
      <div
        role="tablist"
        aria-label="Filtrar por categoria"
        className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'Todos'}
          onClick={() => onSelectCategory('Todos')}
          className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 active:scale-[0.97] ${
            selectedCategory === 'Todos' ? 'accent-btn shadow-xs' : ''
          }`}
          style={
            selectedCategory === 'Todos'
              ? undefined
              : {
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }
          }
        >
          Todos
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === FAVORITES_CATEGORY_KEY}
          onClick={() => onSelectCategory(FAVORITES_CATEGORY_KEY)}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 active:scale-[0.97] ${
            selectedCategory === FAVORITES_CATEGORY_KEY
              ? 'accent-btn shadow-xs'
              : ''
          }`}
          style={
            selectedCategory === FAVORITES_CATEGORY_KEY
              ? undefined
              : {
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }
          }
        >
          <Heart
            className="w-3.5 h-3.5 shrink-0"
            style={
              selectedCategory === FAVORITES_CATEGORY_KEY
                ? { fill: '#FFFFFF', color: '#FFFFFF' }
                : favoritesCount > 0
                  ? { fill: 'var(--accent)', color: 'var(--accent)' }
                  : undefined
            }
            aria-hidden="true"
          />
          <span>Favoritos</span>
          {favoritesCount > 0 && (
            <span
              className="tabular-nums text-[11px] font-bold"
              style={{
                color:
                  selectedCategory === FAVORITES_CATEGORY_KEY
                    ? 'rgba(255,255,255,0.92)'
                    : 'var(--accent)',
              }}
            >
              {favoritesCount}
            </span>
          )}
        </button>

        {categories.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectCategory(category)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 active:scale-[0.97] ${
                isActive ? 'accent-btn shadow-xs' : ''
              }`}
              style={
                isActive
                  ? undefined
                  : {
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }
              }
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
