import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  billingService,
  BillingCycle,
  ORDER_BUMP_DESCRIPTION,
  ORDER_BUMP_PRICE,
  ORDER_BUMP_TITLE,
  SAAS_PLANS,
} from '../services/billingService';
import { ProfileConfig } from '../types';
import { supabase } from '../lib/supabase';

interface CheckoutViewProps {
  user: any;
  currentProfile: ProfileConfig | null;
  selectedPlan: 'pro' | 'scale';
  billingCycle: BillingCycle;
  onSuccess: (updatedProfile: ProfileConfig) => void;
  onBack: () => void;
}

interface PixPaymentData {
  paymentRecordId: string;
  qrCode: string;
  qrCodeBase64?: string;
  amount: number;
}

export function CheckoutView({
  user,
  currentProfile,
  selectedPlan,
  billingCycle,
  onSuccess,
  onBack,
}: CheckoutViewProps) {
  // Form fields
  const [document, setDocument] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [includeOrderBump, setIncludeOrderBump] = useState(false);

  // Credit card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.user_metadata?.full_name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Processing & Pix Modal states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);

  const isMasterUser =
    user?.email === 'atendimentoandrezzaferraz@gmail.com' ||
    currentProfile?.is_master_admin === true;

  const planInfo = SAAS_PLANS[selectedPlan];
  const totalPrice = billingService.calculateTotal(selectedPlan, billingCycle, includeOrderBump);

  // Formatador de CPF/CNPJ
  const formatDocument = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    if (raw.length <= 11) {
      return raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Formatador de WhatsApp
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      return raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return raw.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  // Formatador de Cartão
  const formatCardNum = (val: string) => {
    return val
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})/g, '$1 ')
      .trim();
  };

  const formatExpiry = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      return `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    return raw;
  };

  // Listener Realtime para confirmação instantânea do pagamento
  useEffect(() => {
    if (!pixData?.paymentRecordId || paymentApproved) return;

    const channelName = `sub-payment-${pixData.paymentRecordId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscription_payments',
          filter: `id=eq.${pixData.paymentRecordId}`,
        },
        (payload: any) => {
          if (payload?.new?.status === 'approved') {
            triggerSuccessApproval();
          }
        }
      )
      .subscribe();

    // Também escuta a tabela profiles em paralelo
    const profileChannelName = `profile-sub-${currentProfile?.id || user?.id}`;
    const profileChannel = supabase
      .channel(profileChannelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentProfile?.id || user?.id}`,
        },
        (payload: any) => {
          if (payload?.new?.plan === selectedPlan) {
            triggerSuccessApproval();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(profileChannel);
    };
  }, [pixData?.paymentRecordId, paymentApproved, currentProfile?.id, user?.id, selectedPlan]);

  const triggerSuccessApproval = () => {
    setPaymentApproved(true);
    setTimeout(() => {
      if (currentProfile) {
        onSuccess({
          ...currentProfile,
          plan: selectedPlan,
          subscription_status: 'active',
        });
      }
    }, 1800);
  };

  const copyPixCode = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Submissão do Checkout via Mercado Pago Edge Function
  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Bypass para Conta Master
    if (isMasterUser) {
      if (currentProfile) {
        onSuccess({
          ...currentProfile,
          plan: 'scale',
          subscription_status: 'lifetime',
          is_master_admin: true,
        });
      }
      return;
    }

    if (!document || document.replace(/\D/g, '').length < 11) {
      setErrorMessage('Por favor, informe um CPF ou CNPJ válido.');
      return;
    }
    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
      setErrorMessage('Por favor, informe um número de WhatsApp com DDD válido.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const payload = {
        profileId: currentProfile?.id || user?.id,
        plan: selectedPlan,
        billingCycle,
        name: user?.user_metadata?.full_name || 'Assinante AchadosLink',
        email: user?.email || '',
        document: document.replace(/\D/g, ''),
        whatsapp: whatsapp.replace(/\D/g, ''),
        paymentMethod,
        includeOrderBump,
      };

      const result = await billingService.createMercadoPagoPayment(payload);

      if (!result.success) {
        // Se a function falhar por não estar ainda ativa na nuvem, sugerimos usar o Sandbox
        setErrorMessage(
          result.message || 'Erro ao processar com a API do Mercado Pago. Utilize a opção de Sandbox abaixo.'
        );
        setIsProcessing(false);
        return;
      }

      if (paymentMethod === 'pix' && result.qrCode) {
        setPixData({
          paymentRecordId: result.paymentRecordId!,
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          amount: result.amount || totalPrice,
        });
        setPixModalOpen(true);
        setIsProcessing(false);
      } else if (result.paymentMethod === 'checkout_pro' && result.initPoint) {
        // Redireciona para o Checkout Pro oficial do Mercado Pago
        window.location.href = result.initPoint;
      } else {
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Erro ao conectar ao checkout do Mercado Pago:', err);
      setErrorMessage(err.message || 'Erro de comunicação com o serviço de pagamentos.');
      setIsProcessing(false);
    }
  };

  // Simulação instantânea no Sandbox (para testes imediatos)
  const executeSimulation = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage('');

      const result = await billingService.simulateSandboxCheckout({
        profileId: currentProfile?.id || user?.id,
        plan: selectedPlan,
        billingCycle,
        name: user?.user_metadata?.full_name || 'Usuário Google',
        email: user?.email || '',
        document,
        whatsapp,
        paymentMethod,
        includeOrderBump,
      });

      if (result.success && currentProfile) {
        triggerSuccessApproval();
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar assinatura.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para planos</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Mercado Pago SSL 256-bit Seguro</span>
        </div>
      </div>

      {/* Alerta de Conta Master Admin */}
      {isMasterUser && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-3 text-xs">
            <Crown className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <strong className="block font-bold">Conta Master Admin Reconhecida!</strong>
              <span>Você possui o plano Scale Vitalício gratuito sem necessidade de pagamento.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              currentProfile &&
              onSuccess({
                ...currentProfile,
                plan: 'scale',
                subscription_status: 'lifetime',
                is_master_admin: true,
              })
            }
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
          >
            Liberar Dashboard Master
          </button>
        </div>
      )}

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Dados de Pagamento */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111624] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-zinc-800">
          <div className="mb-6">
            <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>Finalizar Assinatura</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EE4D2D]/10 text-[#EE4D2D]">
                Plano {planInfo.name}
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Conclua seus dados abaixo para ativar seus recursos ilimitados imediatamente.
            </p>
          </div>

          {/* Dados do usuário logado via Google */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-700/60 mb-6 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 font-medium block">Assinando como:</span>
              <strong className="text-gray-800 dark:text-gray-200 font-bold">
                {user?.user_metadata?.full_name || 'Criador AchadosLink'}
              </strong>
              <span className="text-gray-500 block text-[11px]">{user?.email}</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleCheckoutSubmit} className="space-y-5">
            {/* CPF e WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                  CPF ou CNPJ (para nota fiscal) *
                </label>
                <input
                  type="text"
                  required
                  value={document}
                  onChange={(e) => setDocument(formatDocument(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full h-11 px-3.5 rounded-xl text-xs font-mono font-medium bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full h-11 px-3.5 rounded-xl text-xs font-mono font-medium bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                />
              </div>
            </div>

            {/* Escolha da Forma de Pagamento */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
                Forma de Pagamento Oficial Mercado Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'border-[#EE4D2D] bg-[#EE4D2D]/5 text-[#EE4D2D]'
                      : 'border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/40 text-gray-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Pix</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">QR Code Direto</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    paymentMethod === 'credit_card'
                      ? 'border-[#EE4D2D] bg-[#EE4D2D]/5 text-[#EE4D2D]'
                      : 'border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/40 text-gray-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Cartão / Checkout Pro</span>
                    <span className="text-[10px] text-gray-400">Até 12x Seguro</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Aviso sobre Cartão de Crédito via Checkout Pro Oficial */}
            {paymentMethod === 'credit_card' && (
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-3">
                <CreditCard className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Checkout Seguro Mercado Pago</strong>
                  <span>
                    Ao clicar em finalizar, você será redirecionado para o ambiente protegido do Mercado Pago para parcelar em até 12x no cartão de crédito com liberação automática da sua conta.
                  </span>
                </div>
              </div>
            )}

            {/* Botão de Finalização Principal */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full h-13 rounded-2xl bg-[#EE4D2D] hover:bg-[#D93D1E] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-6"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Conectando ao Mercado Pago...</span>
                </div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    Finalizar Assinatura — R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </>
              )}
            </button>

            {/* Botão de Sandbox para Testes Rápidos */}
            <div className="pt-2 text-center">
              <button
                type="button"
                disabled={isProcessing}
                onClick={executeSimulation}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#EE4D2D]/40 text-[#EE4D2D] text-xs font-bold hover:bg-[#EE4D2D]/5 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simular Aprovação Imediata (Ambiente Sandbox)</span>
              </button>
              <p className="text-[10.5px] text-gray-400 mt-1">
                Ativa o plano instantaneamente no Supabase para validar todas as travas visuais no Dashboard
              </p>
            </div>
          </form>
        </div>

        {/* Coluna Direita: Resumo do Pedido & Order Bump */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#111624] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
              Resumo da Assinatura
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
                <span>Plano {planInfo.name} ({billingCycle === 'yearly' ? 'Anual 20% OFF' : 'Mensal'})</span>
                <span>
                  R$ {(billingCycle === 'yearly' ? planInfo.yearlyPrice : planInfo.monthlyPrice).toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Order Bump Box */}
              <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 text-xs space-y-2 mt-4">
                <label className="flex items-start gap-2.5 cursor-pointer font-bold text-gray-900 dark:text-white">
                  <input
                    type="checkbox"
                    checked={includeOrderBump}
                    onChange={(e) => setIncludeOrderBump(e.target.checked)}
                    className="mt-0.5 rounded text-[#EE4D2D] focus:ring-0 cursor-pointer"
                  />
                  <span>
                    SIM! Quero o {ORDER_BUMP_TITLE} (+ R$ 19,90)
                  </span>
                </label>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 pl-6 leading-relaxed">
                  {ORDER_BUMP_DESCRIPTION}
                </p>
              </div>

              {includeOrderBump && (
                <div className="flex items-center justify-between text-gray-600 dark:text-zinc-400 pt-2">
                  <span>Pacote de Banners Express</span>
                  <span>R$ {ORDER_BUMP_PRICE.toFixed(2).replace('.', ',')}</span>
                </div>
              )}

              {/* Total Final */}
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-gray-900 dark:text-white">Total a pagar:</span>
                <span className="text-2xl font-black text-[#EE4D2D]">
                  R$ {totalPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Benefícios que serão liberados */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Benefícios liberados na hora:
              </span>
              {planInfo.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Real de QR Code Pix e Realtime */}
      {pixModalOpen && pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 text-center shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95">
            {paymentApproved ? (
              <div className="py-8 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  Pagamento Confirmado! 🎉
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Seu plano <strong>{planInfo.name}</strong> foi ativado com sucesso no Supabase. Redirecionando para o seu dashboard...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Pague com Pix Oficial
                    </h3>
                  </div>
                  <span className="text-xs font-black text-[#EE4D2D]">
                    R$ {pixData.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 text-left">
                  Abra o aplicativo do seu banco, escolha <strong>Pagar com Pix</strong> e aponte a câmera para o QR Code abaixo ou copie a chave Pix:
                </p>

                {/* Exibição da Imagem do QR Code Base64 do Mercado Pago */}
                <div className="w-56 h-56 mx-auto bg-white rounded-2xl p-2.5 border border-gray-200 shadow-inner flex items-center justify-center mb-4">
                  {pixData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code Pix Oficial"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4 text-gray-400 text-xs">
                      <QrCode className="w-24 h-24 mx-auto mb-2 text-gray-700" />
                      <span>Use o código Copia e Cola abaixo</span>
                    </div>
                  )}
                </div>

                {/* Chave Pix Copia e Cola */}
                <div className="space-y-2 mb-4">
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-zinc-400 text-left">
                    Código Pix Copia e Cola:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={pixData.qrCode}
                      className="w-full h-10 px-3 pr-20 rounded-xl text-[11px] font-mono bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={copyPixCode}
                      className="absolute right-1 top-1 h-8 px-3 rounded-lg bg-[#EE4D2D] hover:bg-[#D93D1E] text-white font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedPix ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status em Tempo Real via Supabase Realtime */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center justify-center gap-2 mb-4">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Aguardando confirmação bancária em tempo real...</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPixModalOpen(false)}
                    className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-bold text-xs hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={executeSimulation}
                    className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Simular Pagamento</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
