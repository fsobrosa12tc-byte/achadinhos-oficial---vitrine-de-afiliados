import { useEffect, useState } from 'react';
import { BarChart3, Crown, ExternalLink, Lock, MousePointerClick, TrendingUp, Users } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { SaaSSubscriptionPlan } from '../types';

interface AnalyticsViewProps {
  profileId: string;
  plan: SaaSSubscriptionPlan;
  isMasterAdmin?: boolean;
  onOpenUpgrade: () => void;
}

export function AnalyticsView({
  profileId,
  plan,
  isMasterAdmin = false,
  onOpenUpgrade,
}: AnalyticsViewProps) {
  const [stats, setStats] = useState<{
    totalClicks: number;
    recentClicks: any[];
    topProducts: { title: string; code: string; count: number }[];
  }>({ totalClicks: 0, recentClicks: [], topProducts: [] });
  const [isLoading, setIsLoading] = useState(true);

  const isFreePlan = plan === 'free' && !isMasterAdmin;

  useEffect(() => {
    if (isFreePlan) {
      setIsLoading(false);
      return;
    }

    async function loadStats() {
      try {
        setIsLoading(true);
        const data = await supabaseService.getAnalytics(profileId);
        setStats(data);
      } catch (err) {
        console.error('Erro ao carregar analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [profileId, isFreePlan]);

  // Se o usuário estiver no plano FREE, exibe a tela de bloqueio com feature gate
  if (isFreePlan) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center relative overflow-hidden border border-amber-500/20">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
          <Crown className="w-3.5 h-3.5" />
          <span>Recurso Exclusivo PRO & SCALE</span>
        </div>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Analytics & Rastreamento de Cliques
        </h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-[340px] mx-auto mt-1 mb-6">
          Descubra quais produtos geram mais cliques, quais vídeos mais convertem e a origem exata do seu tráfego (TikTok, Instagram ou WhatsApp).
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-[360px] mx-auto mb-6 text-left opacity-60 pointer-events-none select-none blur-[1px]">
          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed border-gray-300 dark:border-zinc-700">
            <span className="text-[10px] text-gray-400">Total de Cliques</span>
            <div className="text-lg font-bold">1.482</div>
          </div>
          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed border-gray-300 dark:border-zinc-700">
            <span className="text-[10px] text-gray-400">Conversão de Códigos</span>
            <div className="text-lg font-bold">34.8%</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenUpgrade}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[#EE4D2D] to-orange-500 text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer"
        >
          <Crown className="w-4 h-4" />
          <span>Liberar Analytics no Plano Pro</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card-surface rounded-2xl p-12 text-center">
        <div className="w-8 h-8 border-2 border-[#EE4D2D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-gray-500">Carregando métricas em tempo real...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold">Total de Cliques</span>
            <MousePointerClick className="w-4 h-4 text-[#EE4D2D]" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.totalClicks}
          </div>
          <span className="text-[10px] text-emerald-500 font-medium">Cliques em links oficiais</span>
        </div>

        <div className="card-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold">Top Produtos</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.topProducts.length}
          </div>
          <span className="text-[10px] text-gray-400 font-medium">Itens com interação</span>
        </div>

        <div className="card-surface rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-semibold">Status do Rastreamento</span>
            <BarChart3 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-bold text-emerald-500 flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>RPC PostgreSQL Ativo</span>
          </div>
          <span className="text-[10px] text-gray-400">Contabilização sem atrito</span>
        </div>
      </div>

      {/* Tabela dos Produtos Mais Clicados */}
      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#EE4D2D]" />
          <span>Ranking de Cliques por Produto</span>
        </h4>

        {stats.topProducts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            Nenhum clique registrado ainda. Compartilhe sua vitrine para acompanhar as métricas!
          </p>
        ) : (
          <div className="space-y-2">
            {stats.topProducts.slice(0, 10).map((item, index) => (
              <div
                key={item.code + index}
                className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-gray-100 dark:border-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-zinc-300">
                    {index + 1}
                  </span>
                  <span className="font-mono font-bold text-[#EE4D2D]">#{item.code}</span>
                  <span className="truncate font-medium text-gray-800 dark:text-gray-200">
                    {item.title}
                  </span>
                </div>
                <div className="shrink-0 font-bold text-gray-900 dark:text-white pl-3">
                  {item.count} {item.count === 1 ? 'clique' : 'cliques'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cliques Recentes */}
      <div className="card-surface rounded-2xl p-4">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3">
          Histórico de Cliques Recentes
        </h4>

        {stats.recentClicks.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">
            Aguardando primeiras interações na vitrine pública.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {stats.recentClicks.slice(0, 15).map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[#EE4D2D]">#{c.products?.code || '---'}</span>
                  <span className="truncate text-gray-700 dark:text-zinc-300">
                    {c.products?.title || 'Produto'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 shrink-0 pl-2">
                  {new Date(c.clicked_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
