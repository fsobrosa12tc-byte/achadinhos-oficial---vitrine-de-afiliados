-- Migration: 20261121010000_subscription_payments.sql
-- Descrição: Tabela subscription_payments, coluna plan_expires_at em profiles e configuração de Realtime

-- 1. Adicionar plan_expires_at na tabela profiles se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_expires_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN plan_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Criar tabela subscription_payments
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_target TEXT NOT NULL CHECK (plan_target IN ('pro', 'scale')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  has_order_bump BOOLEAN DEFAULT FALSE,
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  payer_email TEXT,
  payer_cpf TEXT,
  qr_code TEXT,
  qr_code_base64 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_sub_payments_profile ON public.subscription_payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_mp_id ON public.subscription_payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status ON public.subscription_payments(status);

-- 3. Habilitar RLS em subscription_payments
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Dono visualiza seus pagamentos" ON public.subscription_payments;
CREATE POLICY "Dono visualiza seus pagamentos"
  ON public.subscription_payments FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Dono ou service role cria pagamentos" ON public.subscription_payments;
CREATE POLICY "Dono ou service role cria pagamentos"
  ON public.subscription_payments FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR auth.role() = 'service_role' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Dono ou service role atualiza pagamentos" ON public.subscription_payments;
CREATE POLICY "Dono ou service role atualiza pagamentos"
  ON public.subscription_payments FOR UPDATE
  USING (auth.uid() = profile_id OR auth.role() = 'service_role');

-- 4. Habilitar Realtime para subscription_payments e profiles
ALTER TABLE public.subscription_payments REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação supabase_realtime se ainda não estiverem
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_payments;
  EXCEPTION WHEN duplicate_object THEN
    -- Já existe na publicação
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    -- Já existe na publicação
  END;
END $$;
