# Vitrine de Produtos Afiliados — Minha Coleção

Aplicação web mobile-first de alta conversão para criadores e afiliados (inspirada no formato "Minha Coleção" da Shopee e Link in Bio), com vitrine pública otimizada para busca por código de vídeo curto e um Painel Admin completo sem banco de dados externo, pronto para deploy estático no Netlify.

---

## Revisão do Usuário & Decisões Críticas

> [!IMPORTANT]
> As decisões abaixo consolidam suas respostas na etapa de alinhamento e definem o escopo completo da primeira versão. Revise e aprove para iniciarmos a construção.

- **Gestão Completa no Painel Admin (Confirmado)**: O painel permitirá gerenciar tanto o catálogo de produtos (criar, editar, excluir, reordenar com pré-visualização instantânea) quanto o perfil público (`@achadinhos.oficial`, bio, avatar, degradê do banner e links sociais).
- **Recursos Extras de Conversão na Vitrine (Confirmado)**: Além da busca por código/nome e chips de categoria, a vitrine incluirá selo automático de porcentagem de desconto, filtro por loja e ordenação por preço/desconto, botão rápido de compartilhamento da oferta no WhatsApp e botão de favoritos salvos localmente no navegador do visitante.
- **Exportação e Backup para Deploy Estático (Confirmado)**: O painel contará com exportação em código TypeScript pronto para colar no projeto ou arquivo `.ts`/`.json` para download, além de importação de backup JSON com validação para migração rápida entre dispositivos.
- **Imagens Iniciais Locais de Alta Fidelidade (Padrão Recomendado)**: Para garantir carregamento instantâneo e zero links quebrados, os 6 produtos iniciais (`#001` a `#006`) e o avatar do perfil terão fotos de estúdio geradas localmente em alta resolução; no Painel Admin, você poderá colar normalmente qualquer URL externa de imagem para novos produtos (com fallback visual automático caso alguma URL externa falhe).

---

## 1. Visão Geral & Conceito Central

- **O que o aplicativo faz**: Transforma o link da bio de criadores de conteúdo (TikTok, Reels, Shorts e WhatsApp) em uma vitrine rápida, familiar e confiável, onde seguidores digitam o número mencionado no vídeo (ex.: `001` ou `#001`) e vão direto para a oferta afiliada com o mínimo de atrito.
- **Público-Alvo & Contexto**:
  - *Visitante / Seguidor*: Chega pelo celular vindo de um vídeo curto, quer encontrar o produto pelo código em segundos, comparar preço/desconto, salvar favoritos ou enviar no WhatsApp e clicar em "Ver Oferta".
  - *Criador / Afiliado (Admin)*: Precisa cadastrar achadinhos rapidamente pelo celular ou computador, conferir a aparência real do card antes de salvar e exportar os dados atualizados para publicação estática sem depender de servidor ou banco pago.
- **Valor Principal**: Elimina a perda de conversão de links genéricos ao unir busca instantânea por código, identificação visual clara de cada marketplace e autonomia total de publicação estática via `localStorage` + exportação TS/JSON.

---

## 2. Experiência do Usuário & Design Visual

### Fluxos Principais do Usuário
1. **Descoberta Rápida na Vitrine Pública**: O visitante abre o link e vê imediatamente o cabeçalho do perfil (`@achadinhos.oficial`), bio curta de até 2 linhas e pílulas de contato (TikTok, Instagram, WhatsApp). Logo abaixo, a barra fixa (sticky) oferece busca instantânea (aceitando `"001"`, `"#001"`, nome ou categoria) e carrossel horizontal de categorias dinâmicas com `"Todos"` ativo por padrão.
2. **Refinamento e Conversão**: O visitante pode filtrar por plataforma (Shopee, Mercado Livre, Amazon, Hotmart, Cakto), ordenar por destaques, menor preço, maior preço ou maior desconto, ou alternar para sua lista pessoal de favoritos. Cada card exibe foto quadrada, badge da loja, código escuro `#001`, título em 2 linhas, preço antigo riscado com cálculo automático de `% OFF`, preço atual em destaque, botão de favoritar, ação rápida para compartilhar a oferta no WhatsApp e CTA principal `"Ver Oferta"` abrindo o link em nova aba.
3. **Acesso e Gestão no Modo Admin**: No rodapé discreto da página, um botão de cadeado/engrenagem abre o modal de acesso simples (senha padrão `1234`, sem uso de popups nativos do navegador). Autenticado, o criador alterna entre 3 abas no Painel de Gerenciamento:
   - *Produtos*: Formulário completo com pré-visualização ao vivo do card idêntico ao da vitrine + lista gerenciável para editar, excluir (com confirmação inline) ou reordenar (subir/descer posição).
   - *Perfil & Redes*: Edição de `@handle`, bio, URL do avatar, seleção de degradê do banner e links sociais (TikTok, Instagram, WhatsApp) com prévia imediata.
   - *Exportar & Backup*: Geração de código TypeScript ou JSON pronto para copiar/baixar para deploy no Netlify e área para importar backup JSON (por upload de arquivo ou colagem) ou restaurar os 6 itens padrão.

### Identidade Visual & Tema
- **Direção Estética**: E-commerce mobile-first limpo, tátil e focado em conversão — familiaridade imediata de app nativo com acabamento editorial moderno, sem poluição visual de popups ou contadores artificiais.
- **Paleta de Cores & Atmosfera (60-30-10)**:
  - *60% Canvas Neutro*: Fundo geral cinza claríssimo (`#F4F5F7`) envolvendo o container centralizado de no máximo `640px` no desktop e `100%` fluido no mobile.
  - *30% Superfícies Estruturais*: Cards brancos puros (`#FFFFFF`) com cantos `rounded-2xl`, bordas sutis e sombras suaves de elevação única; texto principal em grafite profundo (`#111827`) e secundário em cinza médio (`#6B7280`).
  - *10% Acento de Conversão*: Laranja vibrante (`#EE4D2D`) concentrado nos CTAs principais ("Ver Oferta"), aba/chip ativo e foco de busca, com estados de hover (`#D93D1E`) e active (`#C23216`) bem definidos.
  - *Cores Semânticas de Plataforma*: Badges discretas com contraste acessível — Shopee (laranja `#EE4D2D`), Mercado Livre (amarelo `#FFE600` com texto azul-marinho `#2D3277`), Amazon (grafite `#131921` com detalhe âmbar `#FF9900`), Hotmart (vermelho-coral `#F04E23`) e Cakto (esmeralda `#059669`).
- **Tipografia & Hierarquia**:
  - *Base e Interface*: `Inter` (limpa e moderna, conforme solicitado) para leitura fluida em telas pequenas, títulos de produto limitados a 2 linhas (`line-clamp-2`) e controles de linha única.
  - *Números e Códigos*: Algarismos tabulares (`tabular-nums`) em todos os preços, percentuais de desconto e badges de código (`#001` a `#006`), garantindo alinhamento vertical consistente na grade.
- **Composição Espacial & Ergonomia Touch**:
  - Grade de produtos responsiva com **2 colunas no mobile** e **3 colunas no desktop** dentro da moldura de `640px`.
  - Áreas clicáveis com alvos mínimos confortáveis ao toque (`>= 40px–44px`), carrossel de categorias deslizável sem barra de rolagem visível e barra sticky compacta para manter a maior parte da tela livre para a vitrine.
- **Feedback Interativo & Micro-interações**:
  - Transições rápidas ($\le 200\text{ms}$) de elevação leve nos cards, resposta tátil de clique nos botões (`active:scale-[0.98]`), notificações toast discretas ao copiar código, favoritar produto, salvar alterações ou importar backup, e estado vazio amigável com botão para limpar filtros quando a busca não encontrar itens.

---

## 3. Decisões de Produto & Trade-Offs

- **Persistência Local + Exportação Estática (Sem Banco Externo)**
  - *Abordagem Escolhida*: Armazenamento automático em `localStorage` com chaves dedicadas para catálogo, perfil e favoritos do visitante, somado a um gerador de código TypeScript/JSON e importador de backup JSON.
  - *Por quê*: Atende ao fluxo exato de deploy estático gratuito no Netlify — o criador testa e ajusta tudo visualmente no navegador e, quando satisfeito, exporta o arquivo de dados atualizado para publicar permanentemente.
  - *Alternativas Consideradas*: Banco na nuvem (Firebase/SQL) foi descartado por exigir infraestrutura, autenticação externa e manutenção desnecessária para um Link in Bio estático.
- **Abertura Segura de Links Afiliados e WhatsApp**
  - *Abordagem Escolhida*: Uso de elementos semânticos `<a>` com `target="_blank" rel="noopener noreferrer"` para `"Ver Oferta"`, redes sociais e compartilhamento pré-formatado no WhatsApp (sem `window.open` nem diálogos bloqueantes `window.alert`).
  - *Por quê*: Garante compatibilidade total dentro de iframes, navegadores in-app do Instagram/TikTok e respeita bloqueadores de popup móveis.
- **Selo de Desconto Calculado Automaticamente**
  - *Abordagem Escolhida*: Sempre que o preço antigo for maior que o preço atual, o card calcula e exibe automaticamente a economia em percentual (ex.: `-35%`) integrado ao bloco de preço, deixando a imagem limpa com apenas o selo da loja (topo esquerdo), botão de favorito (topo direito) e código `#001` (base direita).
  - *Por quê*: Evita poluir a fotografia quadrada do produto com excesso de etiquetas enquanto maximiza a percepção de oportunidade junto ao preço.
- **Catálogo Inicial Realista (#001 a #006)**
  - *Abordagem Escolhida*: 6 produtos de alta saída em 4 categorias (`Casa & Cozinha`, `Eletrônicos`, `Beleza` e `Setup`), distribuídos entre Shopee, Mercado Livre, Amazon e Hotmart/Cakto para demonstrar imediatamente todas as badges, filtros dinâmicos, busca por código e cálculo de desconto.

---

## 4. Arquitetura Técnica & Estratégia de Dados *(Referência Técnica)*

### Diagrama de Arquitetura e Fluxo de Componentes

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Persistência Local (Browser)                     │
│  [localStorage: products] [localStorage: profile] [localStorage: fav]│
└───────────────────────────────┬──────────────────────────────────────┘
                                │ hidratação inicial + auto-sync
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│              Container Mobile-First Centralizado (max 640px)         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Cabeçalho de Perfil                                            │  │
│  │ Banner degradê · Avatar circular · @handle · Bio · Redes (pill)│  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Barra Sticky de Busca, Categorias e Ordenação                  │  │
│  │ [Busca: nome / #001 / categoria]                               │  │
│  │ [Todos] [Casa & Cozinha] [Eletrônicos] [Beleza] [Setup] [Favs] │  │
│  │ [Filtro Loja ▾]  [Ordenar por ▾]  (Contagem de resultados)     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Grade de Produtos (2 cols mobile / 3 cols desktop)             │  │
│  │ ┌────────────────────┐  ┌────────────────────┐                 │  │
│  │ │ [Loja]        [♥]  │  │ Foto 1:1 + fallback│                 │  │
│  │ │              [#001]│  │ Título (2 linhas)  │                 │  │
│  │ │ R$ 89,90  [-35%]   │  │ [Ver Oferta] [WA]  │                 │  │
│  │ └────────────────────┘  └────────────────────┘                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Rodapé Discreto · Copyright + Botão [🔒 Admin]                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────────────────────────┬───────────────┘
                │ clique em [🔒 Admin]                  │ feedback global
                ▼                                      ▼
┌─────────────────────────────────────────┐   ┌────────────────────────┐
│ Modal de Login (Senha padrão: 1234)     │   │ Sistema de Toasts      │
│   └─► Painel Gerenciador (3 Abas)       │   │ (Salvo, Copiado, Erro) │
│       ├─ 1. Produtos (Form + Live Card  │   └────────────────────────┘
│       │     Preview + Editar/Reordenar) │
│       ├─ 2. Perfil & Redes (Live Header)│
│       └─ 3. Exportar TS/JSON & Importar │
└─────────────────────────────────────────┘
```

### Modelo de Dados & Estado
- **Produto (`Product`)**: `id`, `code` (ex.: `"001"` exibido como `#001`), `title`, `category`, `store` (`'Shopee' | 'Mercado Livre' | 'Amazon' | 'Hotmart' | 'Cakto'`), `oldPrice` (opcional, número), `currentPrice` (número), `imageUrl`, `affiliateUrl`.
- **Perfil (`ProfileConfig`)**: `handle` (`@achadinhos.oficial`), `bio` (texto curto de até 2 linhas), `avatarUrl`, `bannerGradientId` (presets harmônicos com o tema laranja/quente), e `socials` (TikTok, Instagram, WhatsApp com URL e estado ativo).
- **Estado de Vitrine (Filtros & Favoritos)**: `searchQuery`, `selectedCategory` (`"Todos"` ou `"Favoritos"` ou categoria dinâmica), `selectedStore` (`"Todas"` ou loja específica), `sortBy` (`"featured" | "price-asc" | "price-desc" | "discount-desc"`), e `favoriteIds` persistido separadamente no `localStorage`.

### Mapeamento de Interações & Handlers
- **Busca Inteligente por Código e Texto**: Normaliza acentos, caixa alta/baixa e o prefixo `#` (buscar `"001"`, `"#001"` ou `"1"` encontra `#001`), combinando com filtros de categoria, favoritos e loja em tempo real via memoização.
- **Favoritos & Compartilhamento WhatsApp**: Clicar no coração alterna o ID em `favoriteIds` com atualização imediata da contagem; clicar em compartilhar abre link `wa.me` formatado com código, título, preço e link da oferta (e oferece opção de copiar texto formatado).
- **Fluxo de Autenticação Admin**: Modal valida a senha (`1234`) com feedback visual inline em caso de erro e mantém estado autenticado na sessão, permitindo sair com segurança.
- **CRUD & Reordenação de Produtos**: Formulário valida campos obrigatórios (código, título, categoria, preço atual e link), gera código sequencial sugerido automaticamente para novos itens, renderiza o próprio componente `ProductCard` na pré-visualização ao vivo, suporta edição in-place, exclusão com confirmação inline (evitando cliques acidentais) e reordenação imediata com persistência automática.
- **Exportação & Importação de Backup**:
  - *Exportação*: Gera dinamicamente string TypeScript exportando `INITIAL_PROFILE` e `INITIAL_PRODUCTS` ou JSON estruturado, com botões de copiar para área de transferência e download direto via `Blob`.
  - *Importação*: Aceita upload `.json` ou colagem manual, valida estrutura mínima dos objetos (rejeitando payloads inválidos com mensagem clara) e atualiza estado + `localStorage` atomicamente.
