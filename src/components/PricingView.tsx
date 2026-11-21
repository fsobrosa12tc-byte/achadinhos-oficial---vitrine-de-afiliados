import { useState } from 'react';
import { ArrowLeft, Check, Crown, HelpCircle, Sparkles, Zap } from 'lucide-react';
import { BillingCycle, SAAS_PLANS } from '../services/billingService';
import { ProfileConfig, SaaSSubscriptionPlan } from '../types';

interface PricingViewProps {
  currentProfile?: ProfileConfig | null;
  onSelectPlan: (plan: 'pro' | 'scale', cycle: BillingCycle) => void;
  onBack: () => void;
  highlightedPlan?: SaaSSubscriptionPlan;
}

export function PricingView({
  currentProfile,
  onSelectPlan,
  onBack,
  highlightedPlan = 'pro',
}: PricingViewProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const isMaster = Boolean(currentProfile?.is_master_admin);
  const currentPlan = currentProfile?.plan || 'free';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao painel</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EE4D2D] text-white flex items-center justify-center font-black text-xs">
            AL
          </div>
          <span className="font-extrabold text-sm text-gray-900 dark:text-white">
            AchadosLink Planos
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-center">
        {/* Banner de Conta Master se aplicável */}
        {isMaster && (
          <div className="mb-8 p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-3">
            <Crown className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="text-left sm:text-center">
              <span className="font-black text-sm block sm:inline">
                👑 Conta Master Vitalícia Reconhecida!
              </span>{' '}
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Todos os recursos do <strong>Plano Scale</strong> estão liberados de forma vitalícia e gratuita para você.
              </span>
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EE4D2D]/10 text-[#EE4D2D] text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Planos Transparentes e Sem Surpresas</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          Acelere suas Vendas como Afiliado
        </h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400 max-w-lg mx-auto">
          Escolha o plano ideal para a sua vitrine. Cancele ou altere sua assinatura a qualquer momento com total segurança.
        </p>

        {/* Toggle Mensal / Anual com 20% OFF */}
        <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-gray-200/80 dark:bg-zinc-800 border border-gray-300/60 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
            }`}
          >
            Faturamento Mensal
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-zinc-900 text-[#EE4D2D] shadow-xs'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
            }`}
          >
            <span>Anual (20% OFF)</span>
            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
              Economize
            </span>
          </button>
        </div>
      </div>

      {/* Grid de Planos */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 items-stretch">
        {/* 1. PLANO STARTER */}
        <div
          className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
            currentPlan === 'free' && !isMaster
              ? 'border-emerald-500/80 bg-emerald-500/[0.02] shadow-sm'
              : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#111624]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                {SAAS_PLANS.free.name}
              </span>
              {currentPlan === 'free' && !isMaster && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                  Plano Atual
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900 dark:text-white">R$ 0</span>
              <span className="text-xs text-gray-400">/mês</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 mb-6">
              {SAAS_PLANS.free.tagline}
            </p>

            <ul className="space-y-3 text-xs text-gray-600 dark:text-zinc-300">
              {SAAS_PLANS.free.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled={currentPlan === 'free' || isMaster}
            className="mt-8 w-full h-11 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 disabled:opacity-50"
          >
            {isMaster ? 'Incluso no Master' : currentPlan === 'free' ? 'Seu Plano Atual' : 'Downgrade Grátis'}
          </button>
        </div>

        {/* 2. PLANO PRO [MAIS ESCOLHIDO] */}
        <div
          className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border-2 relative transition-all shadow-xl ${
            highlightedPlan === 'pro' || currentPlan === 'pro'
              ? 'border-[#EE4D2D] bg-white dark:bg-[#121727]'
              : 'border-orange-400/60 bg-white dark:bg-[#111624]'
          }`}
        >
          {/* Badge Mais Escolhido */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#EE4D2D] to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
            Mais Escolhido por Criadores
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 mt-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#EE4D2D]">
                {SAAS_PLANS.pro.name}
              </span>
              {currentPlan === 'pro' && !isMaster && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EE4D2D]/15 text-[#EE4D2D]">
                  Plano Ativo
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {billingCycle === 'monthly' ? SAAS_PLANS.pro.monthlyDisplay : 'R$ 20,58'}
              </span>
              <span className="text-xs text-gray-400">/mês</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-[11px] font-bold text-emerald-500 mt-1">
                Faturado anualmente: R$ 247,00 (20% OFF)
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 mb-6">
              {SAAS_PLANS.pro.tagline}
            </p>

            <ul className="space-y-3 text-xs text-gray-700 dark:text-zinc-200">
              {SAAS_PLANS.pro.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 font-medium">
                  <Check className="w-4 h-4 text-[#EE4D2D] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled={isMaster}
            onClick={() => onSelectPlan('pro', billingCycle)}
            className="mt-8 w-full h-12 rounded-2xl bg-[#EE4D2D] hover:bg-[#D93D1E] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>{isMaster ? 'Incluso no Master' : currentPlan === 'pro' ? 'Gerenciar Assinatura' : 'Assinar Plano Pro'}</span>
          </button>
        </div>

        {/* 3. PLANO SCALE / AGÊNCIA */}
        <div
          className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
            isMaster || currentPlan === 'scale'
              ? 'border-amber-500/80 bg-amber-500/[0.03] shadow-md'
              : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#111624]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-500">
                {SAAS_PLANS.scale.name}
              </span>
              {(isMaster || currentPlan === 'scale') && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                  {isMaster ? 'Master Vitalício' : 'Plano Ativo'}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {billingCycle === 'monthly' ? SAAS_PLANS.scale.monthlyDisplay : 'R$ 49,16'}
              </span>
              <span className="text-xs text-gray-400">/mês</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-[11px] font-bold text-emerald-500 mt-1">
                Faturado anualmente: R$ 590,00 (20% OFF)
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 mb-6">
              {SAAS_PLANS.scale.tagline}
            </p>

            <ul className="space-y-3 text-xs text-gray-600 dark:text-zinc-300">
              {SAAS_PLANS.scale.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled={isMaster}
            onClick={() => onSelectPlan('scale', billingCycle)}
            className="mt-8 w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Crown className="w-4 h-4" />
            <span>{isMaster ? 'Incluso no Master' : currentPlan === 'scale' ? 'Plano Ativo' : 'Assinar Plano Scale'}</span>
          </button>
        </div>
      </div>

      {/* Dúvidas / FAQ rápido */}
      <div className="max-w-3xl mx-auto mt-16 p-6 rounded-3xl bg-white dark:bg-[#111624] border border-gray-200 dark:border-zinc-800 text-xs text-gray-500 dark:text-zinc-400 space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#EE4D2D]" />
          <span>Perguntas Frequentes sobre os Planos</span>
        </h3>
        <p>
          <strong>Como funciona a cobrança?</strong> Você pode pagar via Pix com liberação imediata ou Cartão de Crédito. No plano anual, você garante 20% de desconto fixo.
        </p>
        <p>
          <strong>Posso cancelar a qualquer momento?</strong> Sim! Não há fidelidade ou contratos presos. Se cancelar, seus recursos continuam ativos até o final do período já pago.
        </p>
      </div>
    </div>
  );
}
