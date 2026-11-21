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
}

export const billingService = {
  calculateTotal(plan: 'pro' | 'scale', cycle: BillingCycle, includeOrderBump: boolean): number {
    const basePrice = cycle === 'yearly' ? SAAS_PLANS[plan].yearlyPrice : SAAS_PLANS[plan].monthlyPrice;
    return basePrice + (includeOrderBump ? ORDER_BUMP_PRICE : 0);
  },

  async createMercadoPagoPayment(payload: CheckoutFormPayload): Promise<CreatePaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('create-mp-payment', {
        body: {
          planTarget: payload.plan,
          billingCycle: payload.billingCycle,
          paymentMethod: payload.paymentMethod === 'credit_card' ? 'checkout_pro' : 'pix',
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
          message: error.message || 'Falha ao comunicar com o servidor de pagamentos.',
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          message: data?.error || 'Erro ao processar transação no Mercado Pago.',
        };
      }

      return {
        success: true,
        paymentRecordId: data.paymentRecordId,
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        qrCode: data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        initPoint: data.initPoint,
        sandboxInitPoint: data.sandboxInitPoint,
      };
    } catch (err: any) {
      console.error('Erro ao invocar Edge Function create-mp-payment:', err);
      return {
        success: false,
        message: err.message || 'Falha de conexão com o serviço de pagamentos.',
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
