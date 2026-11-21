import { Check, Crown, Sparkles, X, Zap } from 'lucide-react';
import { SaaSSubscriptionPlan } from '../types';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: SaaSSubscriptionPlan;
  isMasterAdmin?: boolean;
  onSelectPlan?: (plan: 'pro' | 'scale', cycle?: 'monthly' | 'yearly') => void;
  triggerReason?: string;
}

export function PlanUpgradeModal({
  isOpen,
  onClose,
  currentPlan = 'free',
  isMasterAdmin = false,
  onSelectPlan,
  triggerReason,
}: PlanUpgradeModalProps) {
  if (!isOpen) return null;

  const handleSelectPlan = (plan: 'pro' | 'scale') => {
    onClose();
    if (onSelectPlan) {
      onSelectPlan(plan, 'monthly');
    } else {
      const targetUrl = `/checkout?plan=${plan}&billing=monthly`;
      window.history.pushState(null, '', targetUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[620px] rounded-3xl shadow-2xl overflow-hidden p-6 my-8 animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Planos & Recursos AchadosLink
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Evolua sua vitrine de afiliados para o próximo nível
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {triggerReason && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" />
            <span>{triggerReason}</span>
          </div>
        )}

        {isMasterAdmin && (
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span>👑 Conta Master Reconhecida — Nível Scale Ativo (Vitalício)</span>
              <p className="text-[11px] font-normal text-amber-600 dark:text-amber-400 mt-0.5">
                Todos os recursos premium estão 100% liberados para sua conta de forma ilimitada sem necessidade de assinatura.
              </p>
            </div>
          </div>
        )}

        {/* Grade de Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          {/* Starter (Free) */}
          <div
            className={`p-4 rounded-2xl flex flex-col justify-between border ${
              currentPlan === 'free' && !isMasterAdmin
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-gray-200 dark:border-zinc-800 bg-black/[0.02] dark:bg-white/[0.02]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Starter</span>
                {currentPlan === 'free' && !isMasterAdmin && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    Atual
                  </span>
                )}
              </div>
              <div className="text-lg font-black text-gray-900 dark:text-white">
                Grátis
              </div>
              <p className="text-[11px] text-gray-500 mt-1 mb-4">
                Ideal para quem está começando a divulgar achados.
              </p>

              <ul className="space-y-2 text-[11px] text-gray-600 dark:text-zinc-400">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Até 15 produtos ativos</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Tema Claro padrão</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Grade de 2 colunas</span>
                </li>
                <li className="flex items-center gap-1.5 opacity-50">
                  <X className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Com marca d'água</span>
                </li>
                <li className="flex items-center gap-1.5 opacity-50">
                  <X className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Sem Analytics de cliques</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 text-center">
              <span className="text-[11px] font-medium text-gray-400 block py-1">
                {isMasterAdmin ? 'Incluso no Master' : currentPlan === 'free' ? 'Plano Atual' : 'Disponível'}
              </span>
            </div>
          </div>

          {/* Pro */}
          <div
            className={`p-4 rounded-2xl flex flex-col justify-between border relative ${
              currentPlan === 'pro' && !isMasterAdmin
                ? 'border-purple-500 bg-purple-500/5'
                : 'border-orange-300 dark:border-orange-500/40 bg-orange-500/[0.03]'
            }`}
          >
            <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
              Mais Popular
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-500">Pro</span>
                {currentPlan === 'pro' && !isMasterAdmin && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500 text-white">
                    Atual
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-gray-900 dark:text-white">R$ 29,90</span>
                <span className="text-[11px] text-gray-500">/mês</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 mb-4">
                Para criadores que querem conversão máxima e personalização.
              </p>

              <ul className="space-y-2 text-[11px] text-gray-600 dark:text-zinc-400">
                <li className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-200">
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Produtos Ilimitados</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Temas Light, Dark & Luxury</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Layout Grade ou Lista</span>
                </li>
                <li className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Sem marca d'água</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Analytics completo</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Pixels Meta & TikTok</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={currentPlan === 'pro' || isMasterAdmin}
              onClick={() => handleSelectPlan('pro')}
              className="mt-5 w-full h-9 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 bg-[#EE4D2D] hover:bg-[#D93D1E] text-white disabled:opacity-50 cursor-pointer"
            >
              {isMasterAdmin ? 'Incluso no Master Vitalício' : currentPlan === 'pro' ? 'Plano Ativo' : 'Assinar Pro'}
            </button>
          </div>

          {/* Scale */}
          <div
            className={`p-4 rounded-2xl flex flex-col justify-between border ${
              currentPlan === 'scale' || isMasterAdmin
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-gray-200 dark:border-zinc-800 bg-black/[0.02] dark:bg-white/[0.02]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Scale</span>
                {(currentPlan === 'scale' || isMasterAdmin) && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                    {isMasterAdmin ? 'SCALE — Atual (Master Vitalício)' : 'Atual'}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-gray-900 dark:text-white">R$ 69,90</span>
                <span className="text-[11px] text-gray-500">/mês</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 mb-4">
                Para influenciadores com múltiplas contas e alto tráfego.
              </p>

              <ul className="space-y-2 text-[11px] text-gray-600 dark:text-zinc-400">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Tudo incluso no Plano Pro</span>
                </li>
                <li className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-200">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Até 5 vitrines exclusivas</span>
                </li>
                <li className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-200">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Domínio Próprio (.com.br)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Exportação de relatórios</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Suporte VIP WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={currentPlan === 'scale' || isMasterAdmin}
              onClick={() => handleSelectPlan('scale')}
              className="mt-5 w-full h-9 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white disabled:opacity-50 cursor-pointer"
            >
              {isMasterAdmin ? 'Plano Master Vitalício Ativo' : currentPlan === 'scale' ? 'Plano Ativo' : 'Assinar Scale'}
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Pagamento 100% seguro. Cancele ou altere seu plano quando quiser.
          </p>
        </div>
      </div>
    </div>
  );
}
