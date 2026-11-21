// Supabase Edge Function: mp-webhook
// Recebe notificações de pagamento do Mercado Pago e libera os planos automaticamente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req: Request) => {
  // Tratar OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health-check rápido via GET
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'Webhook Mercado Pago ativo e operacional.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      // Body pode estar vazio em caso de webhook querystring
    }

    console.log('Notificação Mercado Pago recebida:', {
      query: Object.fromEntries(url.searchParams.entries()),
      body,
    });

    // 1. Extrair o ID do pagamento no Mercado Pago
    const mpPaymentId =
      body?.data?.id ||
      body?.id ||
      url.searchParams.get('data.id') ||
      url.searchParams.get('id');

    const topic =
      body?.type ||
      body?.topic ||
      body?.action ||
      url.searchParams.get('topic') ||
      url.searchParams.get('type');

    if (!mpPaymentId) {
      // Notificação sem ID de pagamento (ex: merchant_order ou teste de conexão)
      return new Response(
        JSON.stringify({ received: true, ignored: true, reason: 'Sem payment ID no payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Consultar o pagamento real na API oficial do Mercado Pago (Segurança contra Webhook Falso)
    const mpAccessToken =
      Deno.env.get('MP_ACCESS_TOKEN') ||
      'APP_USR-6360826522741713-112103-932ad0e4c5a0c18424edee79b5d53728-3860775143';

    const mpCheckResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
      },
    });

    if (!mpCheckResponse.ok) {
      console.warn(`Pagamento ${mpPaymentId} não encontrado ou erro na API MP: ${mpCheckResponse.status}`);
      // Retorna 200 para evitar que o Mercado Pago faça retentativas desnecessárias se o ID não existir
      return new Response(
        JSON.stringify({ received: true, error: 'Pagamento não localizado na API oficial' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await mpCheckResponse.json();
    const mpStatus = paymentData.status; // 'approved', 'pending', 'rejected', 'cancelled', etc.
    const externalReference = paymentData.external_reference; // ID do registro em subscription_payments

    console.log(`Status do pagamento ${mpPaymentId}: ${mpStatus} | External Reference: ${externalReference}`);

    // 3. Inicializar Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://nfkruisgrrpokhmiejas.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Localizar o registro do pagamento no banco de dados
    let paymentRecord: any = null;
    if (externalReference) {
      const { data } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('id', externalReference)
        .maybeSingle();
      paymentRecord = data;
    }

    if (!paymentRecord && mpPaymentId) {
      const { data } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('mp_payment_id', String(mpPaymentId))
        .maybeSingle();
      paymentRecord = data;
    }

    // 5. Se o pagamento foi aprovado, liberar o plano do usuário
    if (mpStatus === 'approved') {
      const now = new Date();
      // Calcular data de expiração
      const isYearly = paymentRecord?.billing_cycle === 'yearly';
      const daysToAdd = isYearly ? 365 : 30;
      const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      // 5A. Atualizar status na tabela subscription_payments
      if (paymentRecord) {
        await supabase
          .from('subscription_payments')
          .update({
            status: 'approved',
            mp_payment_id: String(mpPaymentId),
            updated_at: now.toISOString(),
          })
          .eq('id', paymentRecord.id);
      }

      // 5B. Atualizar o plano na tabela profiles
      const profileId = paymentRecord?.profile_id;
      const targetPlan = paymentRecord?.plan_target || 'pro';

      if (profileId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            plan: targetPlan,
            subscription_status: 'active',
            plan_expires_at: expiresAt,
            updated_at: now.toISOString(),
          })
          .eq('id', profileId);

        if (profileError) {
          console.error(`Erro ao atualizar profile ${profileId}:`, profileError);
        } else {
          console.log(`Plano ${targetPlan} ativado com sucesso para o usuário ${profileId} até ${expiresAt}`);
        }
      }
    } else if (['rejected', 'cancelled', 'refunded'].includes(mpStatus)) {
      if (paymentRecord) {
        await supabase
          .from('subscription_payments')
          .update({
            status: mpStatus,
            mp_payment_id: String(mpPaymentId),
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentRecord.id);
      }
    }

    // 6. Retornar resposta HTTP 200 imediata para o Mercado Pago
    return new Response(
      JSON.stringify({
        received: true,
        mpPaymentId,
        status: mpStatus,
        planActivated: mpStatus === 'approved',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro crítico no processamento do webhook Mercado Pago:', error);
    // Retornamos 200 mesmo em exceções não tratadas para que o webhook não fique travado
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno no processamento do webhook' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
