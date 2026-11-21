// Supabase Edge Function: create-mp-payment
// Cria pagamentos no Mercado Pago (Pix Direto ou Checkout Pro) com validação estrita no servidor

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Tabela oficial de preços do SaaS AchadosLink (servidor é a fonte da verdade)
const PLAN_PRICES = {
  pro: {
    monthly: 29.90,
    yearly: 247.00,
  },
  scale: {
    monthly: 69.90,
    yearly: 590.00,
  },
};

const ORDER_BUMP_PRICE = 19.90;

serve(async (req: Request) => {
  // Trata requisições de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Utilize POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      planTarget,
      billingCycle,
      paymentMethod,
      hasOrderBump = false,
      payerEmail,
      payerCpf,
      payerName,
      profileId,
    } = body;

    // Validação dos parâmetros obrigatórios
    if (!planTarget || !['pro', 'scale'].includes(planTarget)) {
      return new Response(
        JSON.stringify({ error: "Plano inválido. Escolha 'pro' ou 'scale'." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      return new Response(
        JSON.stringify({ error: "Ciclo de faturamento inválido. Escolha 'monthly' ou 'yearly'." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentMethod || !['pix', 'checkout_pro', 'credit_card'].includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ error: "Método de pagamento inválido. Escolha 'pix' ou 'checkout_pro'." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profileId || !payerEmail) {
      return new Response(
        JSON.stringify({ error: 'profileId e payerEmail são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Cálculo exato do valor no servidor (protegido contra manipulação no frontend)
    const basePrice = PLAN_PRICES[planTarget as 'pro' | 'scale'][billingCycle as 'monthly' | 'yearly'];
    let calculatedAmount = basePrice;
    if (hasOrderBump) {
      calculatedAmount += ORDER_BUMP_PRICE;
    }
    const finalAmount = Math.round(calculatedAmount * 100) / 100;

    // 2. Inicializar cliente do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://nfkruisgrrpokhmiejas.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Criar registro pendente em subscription_payments
    const { data: paymentRecord, error: insertError } = await supabase
      .from('subscription_payments')
      .insert({
        profile_id: profileId,
        plan_target: planTarget,
        billing_cycle: billingCycle,
        amount: finalAmount,
        payment_method: paymentMethod === 'credit_card' ? 'checkout_pro' : paymentMethod,
        has_order_bump: !!hasOrderBump,
        payer_email: payerEmail,
        payer_cpf: payerCpf || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !paymentRecord) {
      console.error('Erro ao registrar pagamento no Supabase:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao inicializar registro de pagamento no banco de dados.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Conectar à API do Mercado Pago
    const mpAccessToken =
      Deno.env.get('MP_ACCESS_TOKEN') ||
      'APP_USR-6360826522741713-112103-932ad0e4c5a0c18424edee79b5d53728-3860775143';

    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook`;

    // 4A. Fluxo Pix Direto
    if (paymentMethod === 'pix') {
      const cleanCpf = (payerCpf || '').replace(/\D/g, '');
      const firstName = payerName ? payerName.split(' ')[0] : 'Assinante';
      const lastName = payerName ? payerName.split(' ').slice(1).join(' ') || 'AchadosLink' : 'AchadosLink';

      const mpPixPayload: any = {
        transaction_amount: Number(finalAmount.toFixed(2)),
        description: 'Assinatura AchadosLink',
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: cleanCpf,
          },
        },
        external_reference: paymentRecord.id,
        notification_url: 'https://nfkruisgrrpokhmiejas.supabase.co/functions/v1/mp-webhook',
      };

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(mpPixPayload),
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        console.error('Erro da API Mercado Pago (Pix):', mpData);
        await supabase
          .from('subscription_payments')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', paymentRecord.id);

        return new Response(
          JSON.stringify({
            error: mpData.message || 'Erro ao gerar cobrança Pix no Mercado Pago.',
            details: mpData.cause || null,
            mpError: mpData,
          }),
          { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
      const rawBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCodeBase64 = rawBase64 ? `data:image/png;base64,${rawBase64}` : null;
      const mpPaymentId = String(mpData.id);

      // Salva os dados retornados no banco para sincronização
      await supabase
        .from('subscription_payments')
        .update({
          mp_payment_id: mpPaymentId,
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          paymentRecordId: paymentRecord.id,
          paymentMethod: 'pix',
          amount: finalAmount,
          qrCode,
          qrCodeBase64,
          mpPaymentId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4B. Fluxo Checkout Pro / Cartão de Crédito
    const preferencePayload = {
      items: [
        {
          id: `achadoslink-${planTarget}-${billingCycle}`,
          title: `Assinatura SaaS AchadosLink - Plano ${planTarget.toUpperCase()} (${billingCycle === 'yearly' ? 'Anual' : 'Mensal'})`,
          description: hasOrderBump ? 'Assinatura SaaS + Pacote de Banners e Setup Express' : 'Assinatura SaaS AchadosLink',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: finalAmount,
        },
      ],
      payer: {
        email: payerEmail,
        name: payerName || 'Assinante AchadosLink',
      },
      external_reference: paymentRecord.id,
      notification_url: notificationUrl,
      back_urls: {
        success: 'https://achadinhosandrezzaferraz.netlify.app/dashboard?payment=success',
        failure: 'https://achadinhosandrezzaferraz.netlify.app/checkout?error=payment_failed',
      },
      auto_return: 'approved',
    };

    const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    const prefData = await prefResponse.json();

    if (!prefResponse.ok) {
      console.error('Erro ao gerar preferência Checkout Pro no Mercado Pago:', prefData);
      return new Response(
        JSON.stringify({ error: prefData.message || 'Erro ao gerar checkout transparente no Mercado Pago.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('subscription_payments')
      .update({
        mp_preference_id: prefData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentRecordId: paymentRecord.id,
        paymentMethod: 'checkout_pro',
        amount: finalAmount,
        initPoint: prefData.init_point,
        sandboxInitPoint: prefData.sandbox_init_point,
        preferenceId: prefData.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro inesperado na Edge Function create-mp-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor ao criar pagamento.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
