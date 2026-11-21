-- Migration: 20261121000000_init_saas.sql
-- Descrição: Estruturação completa do SaaS AchadosLink (Perfis, Categorias, Produtos, Analytics, Triggers, RLS e Storage)

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela profiles (cria ou atualiza para schema completo)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  banner_color TEXT DEFAULT '#EE4D2D',
  theme_mode TEXT DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'luxury')),
  layout_style TEXT DEFAULT 'grid' CHECK (layout_style IN ('grid', 'list')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'scale')),
  is_master_admin BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'active',
  social_links JSONB DEFAULT '[]'::jsonb,
  whatsapp_vip_url TEXT,
  featured_coupon TEXT,
  pixel_meta TEXT,
  pixel_tiktok TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas caso profiles já existisse com schema anterior
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'layout_style') THEN
    ALTER TABLE public.profiles ADD COLUMN layout_style TEXT DEFAULT 'grid' CHECK (layout_style IN ('grid', 'list'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_master_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_master_admin BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_status') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'active';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'featured_coupon') THEN
    ALTER TABLE public.profiles ADD COLUMN featured_coupon TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Índices para busca rápida de perfil
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles (slug);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- 3. Função e Trigger de Regra Master Admin / Planos no Profile
CREATE OR REPLACE FUNCTION public.handle_profile_plan_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Regra da Conta Master
  IF LOWER(COALESCE(NEW.email, '')) = 'atendimentoandrezzaferraz@gmail.com' THEN
    NEW.plan := 'scale';
    NEW.is_master_admin := TRUE;
    NEW.subscription_status := 'lifetime';
  ELSE
    -- Garante que novos usuários iniciem obrigatoriamente no plano gratuito
    IF TG_OP = 'INSERT' THEN
      NEW.plan := 'free';
      NEW.is_master_admin := FALSE;
      NEW.subscription_status := 'active';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_plan_assignment ON public.profiles;
CREATE TRIGGER trg_profile_plan_assignment
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_plan_assignment();

-- 4. Tabela categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_profile_id ON public.categories (profile_id);

-- 5. Tabela products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  store_name TEXT NOT NULL,
  old_price TEXT,
  current_price TEXT NOT NULL,
  image_url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  coupon_code TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  clicks_count INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_profile_id ON public.products (profile_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products (profile_id, code);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (profile_id, active);

-- Trigger para bloquear criação do 16º produto ativo no plano Free
CREATE OR REPLACE FUNCTION public.check_product_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan TEXT;
  v_active_count INT;
BEGIN
  -- Se o produto estiver sendo desativado ou já for update sem alterar 'active', não precisa barrar
  IF TG_OP = 'UPDATE' AND (OLD.active = NEW.active AND NEW.active = FALSE) THEN
    RETURN NEW;
  END IF;

  IF NEW.active = TRUE THEN
    SELECT plan INTO v_plan FROM public.profiles WHERE id = NEW.profile_id;
    
    IF v_plan = 'free' THEN
      SELECT COUNT(*) INTO v_active_count 
      FROM public.products 
      WHERE profile_id = NEW.profile_id AND active = TRUE AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
      
      IF v_active_count >= 15 THEN
        RAISE EXCEPTION 'Limite de 15 produtos atingido no Plano Free. Faça upgrade para Pro ou Scale para cadastrar produtos ilimitados.';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_product_plan_limit ON public.products;
CREATE TRIGGER trg_check_product_plan_limit
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_product_plan_limit();

-- 6. Tabela product_clicks (Analytics)
CREATE TABLE IF NOT EXISTS public.product_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_clicks_profile ON public.product_clicks (profile_id, clicked_at);
CREATE INDEX IF NOT EXISTS idx_product_clicks_product ON public.product_clicks (product_id);

-- 7. Função RPC para registrar cliques com SECURITY DEFINER (visitantes anônimos da vitrine)
CREATE OR REPLACE FUNCTION public.increment_product_click(
  p_product_id UUID,
  p_profile_id UUID,
  p_referrer TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrementa o contador na tabela products
  UPDATE public.products
  SET clicks_count = COALESCE(clicks_count, 0) + 1
  WHERE id = p_product_id;

  -- Registra o clique para detalhamento no Analytics
  INSERT INTO public.product_clicks (product_id, profile_id, referrer, clicked_at)
  VALUES (p_product_id, p_profile_id, p_referrer, NOW());
END;
$$;

-- Liberar execução da RPC para usuários anônimos e autenticados
GRANT EXECUTE ON FUNCTION public.increment_product_click(UUID, UUID, TEXT) TO anon, authenticated;

-- 8. Configuração de Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_clicks ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "Leitura pública de perfis" ON public.profiles;
CREATE POLICY "Leitura pública de perfis"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuário autenticado insere seu perfil" ON public.profiles;
CREATE POLICY "Usuário autenticado insere seu perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário autenticado atualiza seu perfil" ON public.profiles;
CREATE POLICY "Usuário autenticado atualiza seu perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário autenticado deleta seu perfil" ON public.profiles;
CREATE POLICY "Usuário autenticado deleta seu perfil"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- Políticas para categories
DROP POLICY IF EXISTS "Leitura pública de categorias" ON public.categories;
CREATE POLICY "Leitura pública de categorias"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Dono da vitrine gerencia categorias" ON public.categories;
CREATE POLICY "Dono da vitrine gerencia categorias"
  ON public.categories FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Políticas para products
DROP POLICY IF EXISTS "Leitura de produtos ativos ou pelo dono" ON public.products;
CREATE POLICY "Leitura de produtos ativos ou pelo dono"
  ON public.products FOR SELECT
  USING (active = TRUE OR auth.uid() = profile_id);

DROP POLICY IF EXISTS "Dono da vitrine gerencia produtos" ON public.products;
CREATE POLICY "Dono da vitrine gerencia produtos"
  ON public.products FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Políticas para product_clicks
DROP POLICY IF EXISTS "Dono da vitrine visualiza seus cliques" ON public.product_clicks;
CREATE POLICY "Dono da vitrine visualiza seus cliques"
  ON public.product_clicks FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Permitir inserção de cliques anônima ou autenticada" ON public.product_clicks;
CREATE POLICY "Permitir inserção de cliques anônima ou autenticada"
  ON public.product_clicks FOR INSERT
  WITH CHECK (true);

-- 9. Storage Bucket: storefront-assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'storefront-assets',
  'storefront-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas para storage.objects
DROP POLICY IF EXISTS "Acesso público a imagens de storefront" ON storage.objects;
CREATE POLICY "Acesso público a imagens de storefront"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'storefront-assets');

DROP POLICY IF EXISTS "Usuários autenticados enviam imagens de storefront" ON storage.objects;
CREATE POLICY "Usuários autenticados enviam imagens de storefront"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'storefront-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários autenticados atualizam suas imagens de storefront" ON storage.objects;
CREATE POLICY "Usuários autenticados atualizam suas imagens de storefront"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'storefront-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários autenticados deletam suas imagens de storefront" ON storage.objects;
CREATE POLICY "Usuários autenticados deletam suas imagens de storefront"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'storefront-assets' AND auth.role() = 'authenticated');
