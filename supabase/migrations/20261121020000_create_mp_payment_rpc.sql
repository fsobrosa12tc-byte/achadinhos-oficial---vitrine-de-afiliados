-- Migration: 20261121020000_create_mp_payment_rpc.sql
-- Descrição: Habilita extensão http, cria tabela de segredos privada e função RPC create_mp_payment

-- 1. Habilita a extensão de requisições HTTP síncronas no PostgreSQL (http / pgsql-http)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Cria uma tabela privada de configurações (protegida sem acesso público) para guardar o Access Token do Mercado Pago
CREATE TABLE IF NOT EXISTS public.private_app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativa RLS para que ninguém sem permissão expressa acesse esta tabela
ALTER TABLE public.private_app_secrets ENABLE ROW LEVEL SECURITY;

-- Insere o Access Token oficial de produção do Mercado Pago
INSERT INTO public.private_app_secrets (key, value)
VALUES ('MP_ACCESS_TOKEN', 'APP_USR-6360826522741713-112103-932ad0e4c5a0c18424edee79b5d53728-3860775143')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Garante as colunas necessárias na tabela subscription_payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_payments' AND column_name = 'qr_code') THEN
    ALTER TABLE public.subscription_payments ADD COLUMN qr_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_payments' AND column_name = 'qr_code_base64') THEN
    ALTER TABLE public.subscription_payments ADD COLUMN qr_code_base64 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_payments' AND column_name = 'pix_qr_code') THEN
    ALTER TABLE public.subscription_payments ADD COLUMN pix_qr_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_payments' AND column_name = 'pix_qr_code_base64') THEN
    ALTER TABLE public.subscription_payments ADD COLUMN pix_qr_code_base64 TEXT;
  END IF;
END $$;

-- 3. Cria a RPC Function que gera o Pix ou Checkout Pro direto na API do Mercado Pago
CREATE OR REPLACE FUNCTION public.create_mp_payment(
  p_plan_target TEXT,
  p_billing_cycle TEXT,
  p_payment_method TEXT,
  p_has_order_bump BOOLEAN,
  p_payer_email TEXT,
  p_payer_cpf TEXT,
  p_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_mp_token TEXT;
  v_amount NUMERIC(10, 2);
  v_payment_id UUID;
  v_clean_cpf TEXT;
  v_payload JSONB;
  v_http_response extensions.http_response;
  v_mp_body JSONB;
BEGIN
  -- Busca o token seguro na tabela privada
  SELECT value INTO v_mp_token FROM public.private_app_secrets WHERE key = 'MP_ACCESS_TOKEN';

  IF v_mp_token IS NULL THEN
    v_mp_token := 'APP_USR-6360826522741713-112103-932ad0e4c5a0c18424edee79b5d53728-3860775143';
  END IF;

  -- Calcula o valor oficial no servidor (proteção total contra adulteração no frontend)
  IF p_plan_target = 'pro' THEN
    v_amount := CASE WHEN p_billing_cycle = 'yearly' THEN 247.00 ELSE 29.90 END;
  ELSIF p_plan_target = 'scale' THEN
    v_amount := CASE WHEN p_billing_cycle = 'yearly' THEN 590.00 ELSE 69.90 END;
  ELSE
    RAISE EXCEPTION 'Plano inválido: %', p_plan_target;
  END IF;

  IF p_has_order_bump THEN
    v_amount := v_amount + 19.90;
  END IF;

  v_clean_cpf := regexp_replace(COALESCE(p_payer_cpf, ''), '\D', '', 'g');

  -- Registra a intenção de pagamento na tabela subscription_payments
  INSERT INTO public.subscription_payments (
    profile_id,
    plan_target,
    billing_cycle,
    has_order_bump,
    amount,
    payment_method,
    status
  ) VALUES (
    p_profile_id,
    p_plan_target,
    p_billing_cycle,
    COALESCE(p_has_order_bump, false),
    v_amount,
    p_payment_method,
    'pending'
  ) RETURNING id INTO v_payment_id;

  -- Monta requisição para PIX Direto ou Checkout Pro (Cartão)
  IF p_payment_method = 'pix' THEN
    v_payload := jsonb_build_object(
      'transaction_amount', v_amount,
      'description', 'Assinatura AchadosLink - Plano ' || upper(p_plan_target),
      'payment_method_id', 'pix',
      'external_reference', v_payment_id::TEXT,
      'notification_url', 'https://nfkruisgrrpokhmiejas.supabase.co/functions/v1/mp-webhook',
      'payer', jsonb_build_object(
        'email', p_payer_email,
        'identification', jsonb_build_object(
          'type', 'CPF',
          'number', v_clean_cpf
        )
      )
    );

    SELECT * INTO v_http_response FROM extensions.http((
      'POST',
      'https://api.mercadopago.com/v1/payments',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || v_mp_token),
        extensions.http_header('X-Idempotency-Key', gen_random_uuid()::TEXT),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      v_payload::TEXT
    )::extensions.http_request);

    v_mp_body := v_http_response.content::JSONB;

    IF v_http_response.status >= 400 THEN
      UPDATE public.subscription_payments
      SET status = 'rejected', updated_at = NOW()
      WHERE id = v_payment_id;

      RETURN jsonb_build_object(
        'success', false,
        'error', COALESCE(v_mp_body->>'message', 'Erro ao gerar Pix no Mercado Pago'),
        'details', v_mp_body,
        'status', v_http_response.status
      );
    END IF;

    UPDATE public.subscription_payments
    SET mp_payment_id = (v_mp_body->>'id'),
        qr_code = v_mp_body->'point_of_interaction'->'transaction_data'->>'qr_code',
        qr_code_base64 = v_mp_body->'point_of_interaction'->'transaction_data'->>'qr_code_base64',
        pix_qr_code = v_mp_body->'point_of_interaction'->'transaction_data'->>'qr_code',
        pix_qr_code_base64 = v_mp_body->'point_of_interaction'->'transaction_data'->>'qr_code_base64',
        updated_at = NOW()
    WHERE id = v_payment_id;

    RETURN jsonb_build_object(
      'success', true,
      'paymentRecordId', v_payment_id,
      'mpPaymentId', v_mp_body->>'id',
      'qr_code', v_mp_body->'point_of_interaction'->'transaction_data'->>'qr_code',
      'qr_code_base64', 'data:image/png;base64,' || (v_mp_body->'point_of_interaction'->'transaction_data'->>'qr_code_base64')
    );

  ELSE
    -- Checkout Pro (Cartão de Crédito)
    v_payload := jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'achadoslink-' || p_plan_target || '-' || p_billing_cycle,
          'title', 'Assinatura AchadosLink - Plano ' || upper(p_plan_target),
          'quantity', 1,
          'currency_id', 'BRL',
          'unit_price', v_amount
        )
      ),
      'payer', jsonb_build_object('email', p_payer_email),
      'external_reference', v_payment_id::TEXT,
      'notification_url', 'https://nfkruisgrrpokhmiejas.supabase.co/functions/v1/mp-webhook',
      'back_urls', jsonb_build_object(
        'success', 'https://achadinhosandrezzaferraz.netlify.app/dashboard?payment=success',
        'failure', 'https://achadinhosandrezzaferraz.netlify.app/checkout?error=payment_failed',
        'pending', 'https://achadinhosandrezzaferraz.netlify.app/dashboard?payment=pending'
      ),
      'auto_return', 'approved'
    );

    SELECT * INTO v_http_response FROM extensions.http((
      'POST',
      'https://api.mercadopago.com/checkout/preferences',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || v_mp_token),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      v_payload::TEXT
    )::extensions.http_request);

    v_mp_body := v_http_response.content::JSONB;

    IF v_http_response.status >= 400 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', COALESCE(v_mp_body->>'message', 'Erro ao criar Checkout Pro'),
        'details', v_mp_body,
        'status', v_http_response.status
      );
    END IF;

    UPDATE public.subscription_payments
    SET mp_preference_id = (v_mp_body->>'id'), updated_at = NOW()
    WHERE id = v_payment_id;

    RETURN jsonb_build_object(
      'success', true,
      'paymentRecordId', v_payment_id,
      'init_point', v_mp_body->>'init_point'
    );
  END IF;
END;
$$;

-- Concede permissão de execução
GRANT EXECUTE ON FUNCTION public.create_mp_payment(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mp_payment(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, UUID) TO anon;
