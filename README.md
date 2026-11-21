<div align="center">

# 🛍️ AchadosLink — Multi-Affiliate Storefront SaaS

**Transforme o link da sua bio em uma vitrine de alta conversão para múltiplos marketplaces.**  
**Turn your bio link into a high-converting storefront for multiple marketplaces.**  
**Convierte el enlace de tu biografía en un escaparate de alta conversión para múltiples marketplaces.**

[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com/)

[🇧🇷 Português](#-português-br) • [🇺🇸 English](#-english) • [🇪🇸 Español](#-español)

</div>

---

## 🇧🇷 Português (BR)

### 📌 Visão Geral
O **AchadosLink** é um Micro-SaaS *Mobile-First* desenvolvido para criadores de conteúdo, influenciadores e afiliados digitais (Shopee, Mercado Livre, Amazon, TikTok Shop, Hotmart, Cakto, entre outros). A plataforma permite que qualquer afiliado crie, em menos de 2 minutos, uma vitrine personalizada estilo *Storefront* com URL exclusiva (`[seusite.com/@usuario](https://seusite.com/@usuario)`), busca instantânea por código numérico de vídeo (`#001`, `#014`), temas dinâmicos e lista de favoritos sem atrito para o comprador final.

### ✨ Principais Funcionalidades

#### 👤 Para o Criador / Afiliado (Área Autenticada)
* **Autenticação Rápida:** Login seguro em 1 clique via **Google OAuth** (Supabase Auth).
* **Onboarding Instantâneo:** Criação de perfil com validação de `@slug` único, upload de avatar e configuração de bio/redes sociais.
* **Gestão Completa de Produtos (CRUD):** Cadastro de links de afiliado com código numérico (`#001`), preço original riscado, preço promocional, badge automática da loja, cupom de desconto copiável e ativação/pausa rápida.
* **Motor de Temas Dinâmicos:** Personalização visual com modos **Light**, **Dark** e **Luxury**, paletas de cores dinâmicas (`--accent`), escolha entre layout **Grid (2 colunas)** ou **Lista Horizontal**, e banner de cupom em destaque.
* **Analytics de Cliques (Plano Pro/Scale):** Rastreamento seguro via RPC no PostgreSQL contabilizando cliques por produto, código de vídeo e origem de tráfego.

#### 🛒 Para o Comprador / Visitante (Vitrine Pública)
* **Experiência Zero-Atrito (Sem Login):** Navegação instantânea otimizada para os navegadores internos do TikTok, Instagram e WhatsApp.
* **Busca Inteligente por Código ou Nome:** Filtro em tempo real pelo número citado no vídeo (ex.: `#014`) ou palavra-chave.
* **Lista de Favoritos Local:** Persistência automática via `localStorage` permitindo que o visitante salve produtos para comprar depois e compartilhe sua lista no WhatsApp.

### 💎 Planos e Monetização (Estrutura SaaS)

| Recurso | Grátis (Starter) | Pro (R$ 29,90/mês) | Scale (R$ 69,90/mês) |
| :--- | :---: | :---: | :---: |
| **Produtos Ativos** | Até 15 itens | Ilimitados | Ilimitados |
| **Temas e Cores** | Tema Claro padrão | Light, Dark + Cores livres | Todos + Tema Luxury + Banners |
| **Layout de Exibição** | Grade (2 colunas) | Grade ou Lista Horizontal | Grade, Lista ou Hero Destaque |
| **Analytics de Cliques** | ❌ | ✅ Completo | ✅ Completo + Exportação |
| **Pixels de Rastreamento** | ❌ | Meta & TikTok Pixel | Meta, TikTok & Google Tag |
| **Múltiplas Vitrines / Domínio** | 1 vitrine (subrota) | 1 vitrine sem marca d'água | Até 5 vitrines + Domínio próprio |

### 🛠️ Stack Tecnológica
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Backend & BaaS:** Supabase (PostgreSQL, Row Level Security, Google OAuth, Storage, Edge/RPC Functions).
* **Hospedagem & CI/CD:** Netlify com roteamento SPA (`_redirects`).

### 🗄️ Estrutura do Banco de Dados (Supabase)
* `profiles`: Dados da vitrine, `slug`, configurações de tema (`theme_mode`, `accent_color`, `layout_style`), plano ativo e pixels.
* `categories`: Categorias personalizadas ordenáveis por vitrine.
* `products`: Catálogo de links de afiliado, preços, códigos numéricos, cupons e contador de cliques.
* `product_clicks`: Histórico analítico de cliques alimentado pela função `increment_product_click`.

### 🚀 Instalação e Execução Local

    # 1. Clone o repositório
    git clone [https://github.com/fsobrosa12tc-byte/achadoslink-saas.git](https://github.com/fsobrosa12tc-byte/achadoslink-saas.git)

    # 2. Acesse o diretório do projeto
    cd achadoslink-saas

    # 3. Instale as dependências
    npm install

    # 4. Configure as variáveis de ambiente (.env)
    VITE_SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
    VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

    # 5. Inicie o servidor de desenvolvimento
    npm run dev

### 🌐 Deploy no Netlify
1. Conecte o repositório ao **Netlify**.
2. Defina o comando de build como `npm run build` e o diretório de publicação como `dist`.
3. Adicione as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Site settings > Environment variables**.
4. Garanta a existência do arquivo `public/_redirects` com o conteúdo `/* /index.html 200` para suporte às rotas dinâmicas (`/:slug`).

---

## 🇺🇸 English

### 📌 Overview
**AchadosLink** is a *Mobile-First* Micro-SaaS built for content creators, influencers, and affiliate marketers (Shopee, Mercado Libre, Amazon, TikTok Shop, Hotmart, and more). It enables any affiliate to launch a high-converting storefront in under 2 minutes with a custom URL (`[yourdomain.com/@username](https://yourdomain.com/@username)`), instant video-code search (`#001`, `#014`), dynamic themes, and a frictionless wishlist for shoppers.

### ✨ Key Features

#### 👤 For Creators & Affiliates (Authenticated Dashboard)
* **One-Click Authentication:** Fast and secure login via **Google OAuth** (Supabase Auth).
* **Instant Onboarding:** Profile setup with real-time `@slug` availability check, avatar upload, and social links configuration.
* **Full Product Management (CRUD):** Manage affiliate links with numeric video tags (`#001`), strikethrough pricing, promotional prices, automatic marketplace badges, copyable discount coupons, and instant toggle visibility.
* **Dynamic Theme Engine:** Switch between **Light**, **Dark**, and **Luxury** modes, customizable accent colors (`--accent`), **2-Column Grid** or **Horizontal List** layouts, and featured coupon banners.
* **Click Analytics (Pro/Scale Plans):** Secure PostgreSQL RPC click tracking measuring performance by product, video code, and traffic referrer.

#### 🛒 For Shoppers & Visitors (Public Storefront)
* **Zero-Friction Experience (No Login Required):** Instant loading optimized for TikTok, Instagram, and WhatsApp in-app browsers.
* **Smart Code & Keyword Search:** Real-time filtering by the exact product number mentioned in short-form videos (e.g., `#014`) or keywords.
* **Local Wishlist (`localStorage`):** Visitors can bookmark favorite items without creating an account and share their curated wishlist via WhatsApp.

### 💎 SaaS Plans & Monetization

| Feature | Free (Starter) | Pro ($5.90 / R$ 29,90 mo) | Scale ($13.90 / R$ 69,90 mo) |
| :--- | :---: | :---: | :---: |
| **Active Products** | Up to 15 items | Unlimited | Unlimited |
| **Themes & Colors** | Default Light theme | Light, Dark + Custom colors | All + Luxury theme + Banners |
| **Display Layout** | 2-Column Grid | Grid or Horizontal List | Grid, List, or Hero Highlight |
| **Click Analytics** | ❌ | ✅ Full Dashboard | ✅ Full + CSV Export |
| **Tracking Pixels** | ❌ | Meta & TikTok Pixel | Meta, TikTok & Google Tag |
| **Storefronts & Domain** | 1 storefront (subpath) | 1 watermark-free storefront | Up to 5 storefronts + Custom domain |

### 🛠️ Tech Stack
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Backend & BaaS:** Supabase (PostgreSQL, Row Level Security, Google OAuth, Storage, RPC Functions).
* **Hosting & CI/CD:** Netlify with SPA routing (`_redirects`).

### 🚀 Local Setup

    # 1. Clone the repository
    git clone [https://github.com/fsobrosa12tc-byte/achadoslink-saas.git](https://github.com/fsobrosa12tc-byte/achadoslink-saas.git)

    # 2. Navigate to the project folder
    cd achadoslink-saas

    # 3. Install dependencies
    npm install

    # 4. Set up environment variables (.env)
    VITE_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
    VITE_SUPABASE_ANON_KEY=your-public-anon-key

    # 5. Start the development server
    npm run dev

---

## 🇪🇸 Español

### 📌 Visión General
**AchadosLink** es un Micro-SaaS *Mobile-First* diseñado para creadores de contenido, influencers y afiliados digitales (Shopee, Mercado Libre, Amazon, TikTok Shop, Hotmart, entre otros). Permite a cualquier afiliado crear en menos de 2 minutos un escaparate personalizado de alta conversión con URL propia (`[tusitio.com/@usuario](https://tusitio.com/@usuario)`), búsqueda instantánea por código numérico de video (`#001`, `#014`), temas dinámicos y lista de favoritos sin registro para el comprador.

### ✨ Características Principales

#### 👤 Para el Creador / Afiliado (Panel Autenticado)
* **Autenticación Rápida:** Inicio de sesión en 1 clic mediante **Google OAuth** (Supabase Auth).
* **Onboarding Instantáneo:** Creación de perfil con validación de `@slug` único, carga de avatar y configuración de redes sociales.
* **Gestión Completa de Productos (CRUD):** Administración de enlaces de afiliado con código numérico (`#001`), precio anterior tachado, precio promocional, insignia automática de tienda, cupón copiable y activación/pausa rápida.
* **Motor de Temas Dinámicos:** Personalización visual con modos **Light**, **Dark** y **Luxury**, colores de acento dinámicos (`--accent`), diseño en **Cuadrícula (2 columnas)** o **Lista Horizontal**, y banner de cupón destacado.
* **Analítica de Clics (Plan Pro/Scale):** Seguimiento seguro mediante funciones RPC en PostgreSQL para medir clics por producto, código de video y origen del tráfico.

####
