import { supabaseService } from './supabaseService';
import { supabase } from '../lib/supabase';
import { SaaSSubscriptionPlan } from '../types';

export type BillingCycle = 'monthly' | 'yearly';

export interface PlanPricing {
  id: SaaSSubscriptionPlan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyDisplay: string;
  yearlyDisplay: string;
  yearlySavings: string;
  features: string[];
  isPopular?: boolean;
}

export const SAAS_PLANS: Record<SaaSSubscriptionPlan, PlanPricing> = {
  free: {
    id: 'free',
    name: 'Starter',
    tagline: 'Ideal para começar a divulgar seus primeiros links.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyDisplay: 'R$ 0',
    yearlyDisplay: 'R$ 0',
    yearlySavings: '',
    features: [
      'Até 15 produtos ativos na vitrine',
      'Busca por código numérico (#001) e categorias',
      'Lista de favoritos para compradores (sem login)',
      'Tema Claro padrão e grade em 2 colunas',
      'Subrota exclusiva (achadoslink.com/@seunome)',
      'Com marca d’água discreta no rodapé',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Para criadores ativos no TikTok, Reels e Shorts.',
    monthlyPrice: 29.9,
    yearlyPrice: 247.0,
    monthlyDisplay: 'R$ 29,90',
    yearlyDisplay: 'R$ 247,00',
    yearlySavings: 'Economize 20% no plano anual (R$ 20,58/mês)',
    isPopular: true,
    features: [
      'Produtos e links ilimitados',
      'Remoção total da marca d’água',
      'Analytics de Cliques em tempo real',
      'Temas Light & Dark + Cores personalizadas',
      'Layout em Grade ou Lista Horizontal',
      'Integração com Meta Pixel e TikTok Pixel',
    ],
  },
  scale: {
    id: 'scale',
    name: 'Scale / Agência',
    tagline: 'Para top afiliados, páginas de ofertas e múltiplas operações.',
    monthlyPrice: 69.9,
    yearlyPrice: 590.0,
    monthlyDisplay: 'R$ 69,90',
    yearlyDisplay: 'R$ 590,00',
    yearlySavings: 'Economize 20% no plano anual (R$ 49,16/mês)',
    features: [
      'Tudo do Pro incluso',
      'Até 5 vitrines/perfis independentes',
      'Domínio Próprio personalizado (seusite.com.br)',
      'Tema exclusivo Luxury + Banners de topo',
      'Destaque Hero para o produto principal',
      'Exportação de relatórios de cliques (CSV)',
      'Suporte prioritário VIP via WhatsApp',
    ],
  },
};

export const ORDER_BUMP_PRICE = 19.9;
export const ORDER_BUMP_TITLE = 'Pacote de Banners & Setup Express';
export const ORDER_BUMP_DESCRIPTION = 'Receba 10 capas prontas de alta conversão + configuração inicial profissional da sua vitrine.';

export interface CheckoutFormPayload {
  profileId: string;
  plan: 'pro' | 'scale';
  billingCycle: BillingCycle;
  name: string;
  email: string;
  document: string; // CPF ou CNPJ
  whatsapp: string;
  paymentMethod: 'pix' | 'credit_card';
  includeOrderBump: boolean;
  creditCard?: {
    number: string;
    holder: string;
    expiry: string;
    cvv: string;
  };
}

export interface CreatePaymentResult {
  success: boolean;
  paymentRecordId?: string;
  paymentMethod?: 'pix' | 'checkout_pro';
  amount?: number;
  qrCode?: string;
  qrCodeBase64?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  message?: string;
  rawError?: any;
}

export const billingService = {
  calculateTotal(plan: 'pro' | 'scale', cycle: BillingCycle, includeOrderBump: boolean): number {
    const basePrice = cycle === 'yearly' ? SAAS_PLANS[plan].yearlyPrice : SAAS_PLANS[plan].monthlyPrice;
    return basePrice + (includeOrderBump ? ORDER_BUMP_PRICE : 0);
  },

  async createMercadoPagoPayment(payload: CheckoutFormPayload): Promise<CreatePaymentResult> {
    const totalAmount = this.calculateTotal(payload.plan, payload.billingCycle, payload.includeOrderBump);
    const paymentMethod = payload.paymentMethod === 'credit_card' ? 'checkout_pro' : 'pix';

    try {
      // 1. Chamada primária via RPC nativa PostgreSQL (Elimina 100% de erros de CORS no navegador)
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_mp_payment', {
        p_plan_target: payload.plan,
        p_billing_cycle: payload.billingCycle,
        p_payment_method: paymentMethod,
        p_has_order_bump: payload.includeOrderBump,
        p_payer_email: payload.email,
        p_payer_cpf: payload.document,
        p_profile_id: payload.profileId,
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          console.error('Erro retornado pela RPC create_mp_payment:', rpcData);
          return {
            success: false,
            message: rpcData.error || 'Erro ao processar cobrança no Mercado Pago.',
            rawError: rpcData,
          };
        }

        return {
          success: true,
          paymentRecordId: rpcData.paymentRecordId,
          paymentMethod: paymentMethod === 'checkout_pro' ? 'checkout_pro' : 'pix',
          amount: totalAmount,
          qrCode: rpcData.qr_code || rpcData.qrCode,
          qrCodeBase64: rpcData.qr_code_base64 || rpcData.qrCodeBase64,
          initPoint: rpcData.init_point || rpcData.initPoint,
        };
      }

      console.warn('RPC create_mp_payment não encontrada ou com erro, tentando fallback Edge Function:', rpcError);

      // 2. Fallback via Edge Function (caso a RPC ainda não esteja instalada no banco)
      const { data, error } = await supabase.functions.invoke('create-mp-payment', {
        body: {
          planTarget: payload.plan,
          billingCycle: payload.billingCycle,
          paymentMethod,
          hasOrderBump: payload.includeOrderBump,
          payerEmail: payload.email,
          payerCpf: payload.document,
          payerName: payload.name,
          profileId: payload.profileId,
        },
      });

      if (error) {
        console.error('Erro na resposta da Edge Function create-mp-payment:', error);
        return {
          success: false,
          message: error.message || rpcError?.message || 'Falha ao comunicar com o servidor de pagamentos.',
          rawError: error,
        };
      }

      if (!data || !data.success) {
        console.error('Erro retornado pela API do Mercado Pago:', data);
        return {
          success: false,
          message: data?.error || 'Erro ao processar transação no Mercado Pago.',
          rawError: data,
        };
      }

      return {
        success: true,
        paymentRecordId: data.paymentRecordId,
        paymentMethod: data.paymentMethod,
        amount: data.amount || totalAmount,
        qrCode: data.qrCode || data.qr_code,
        qrCodeBase64: data.qrCodeBase64 || data.qr_code_base64,
        initPoint: data.initPoint || data.init_point,
        sandboxInitPoint: data.sandboxInitPoint,
      };
    } catch (err: any) {
      console.error('Exceção ao invocar processador de pagamento:', err);
      return {
        success: false,
        message: err.message || 'Falha de conexão com o servidor de pagamentos.',
        rawError: err,
      };
    }
  },

  async simulateSandboxCheckout(payload: CheckoutFormPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Simulação com pequeno delay para feedback visual
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Atualiza o plano diretamente no Supabase
      await supabaseService.upgradePlan(payload.profileId, payload.plan, payload.billingCycle);

      return {
        success: true,
        message: `Pagamento aprovado com sucesso! Plano ${SAAS_PLANS[payload.plan].name} ativado.`,
      };
    } catch (err: any) {
      console.error('Erro no checkout sandbox:', err);
      return {
        success: false,
        message: err.message || 'Falha ao processar assinatura no Sandbox.',
      };
    }
  },
};
