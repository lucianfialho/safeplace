# SafePlace 🏠🛡️

Plataforma de análise de segurança para imóveis no Rio de Janeiro, baseada em dados públicos do OTT (Onde Tem Tiroteio).

## 🚀 Stack Tecnológica

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + PostGIS (geospatial queries)
- **ORM**: Prisma
- **Scraping**: Cheerio
- **Cron Jobs**: Vercel Cron (produção) ou node-cron (dev)

## 📋 Pré-requisitos

- Node.js 20+
- PostgreSQL 16+ com extensão PostGIS
- npm ou yarn

## 🛠️ Setup Local

### 1. Clone e Instale Dependências

```bash
git clone <seu-repo>
cd ott
npm install
```

### 2. Configure o PostgreSQL com PostGIS

```bash
# Instale PostgreSQL (macOS)
brew install postgresql@16
brew install postgis

# Inicie o PostgreSQL
brew services start postgresql@16

# Crie o banco de dados
createdb safeplace_dev

# Habilite PostGIS
psql safeplace_dev -c "CREATE EXTENSION postgis;"
psql safeplace_dev -c "CREATE EXTENSION postgis_topology;"
```

### 3. Configure as Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite .env.local com suas configurações
# DATABASE_URL deve apontar para seu PostgreSQL local
```

### 4. Execute as Migrations do Prisma

```bash
# Gerar o Prisma Client
npm run db:generate

# Executar migrations
npm run db:migrate

# (Opcional) Abrir Prisma Studio para ver o banco
npm run db:studio
```

### 5. Rode o Projeto em Dev

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📁 Estrutura do Projeto

```
ott/
├── .specs/                    # Especificações detalhadas do projeto
│   ├── 00-project-overview.md
│   ├── 01-database-schema.md
│   ├── 02-ott-scraper.md
│   ├── 03-quinto-andar-extractor.md
│   ├── 04-safety-score-engine.md
│   ├── 05-api-routes.md
│   ├── 06-frontend-pages.md
│   └── 07-deployment-guide.md
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js 15 App Router
│   │   ├── api/               # API routes
│   │   ├── analyze/           # Analysis pages
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/            # React components
│   │   ├── ui/                # Base UI components
│   │   ├── landing/           # Landing page components
│   │   ├── analysis/          # Analysis page components
│   │   └── shared/            # Shared components
│   ├── lib/                   # Utilities and core logic
│   │   ├── scraper/           # OTT scraper
│   │   ├── extractors/        # Quinto Andar extractor
│   │   ├── scoring/           # Safety score engine
│   │   └── prisma.ts          # Prisma client
│   ├── services/              # Database services
│   └── jobs/                  # Cron jobs
└── package.json
```

## 🗺️ Roadmap de Desenvolvimento

### ✅ Fase 1: Fundação (CONCLUÍDA)
- [x] Setup Next.js 15 + TypeScript
- [x] Configuração PostgreSQL + PostGIS
- [x] Schema Prisma
- [x] Estrutura de pastas

### 🚧 Fase 2: Coleta de Dados (EM ANDAMENTO)
- [ ] Implementar OTT Scraper
- [ ] Configurar cron job
- [ ] Coletar dados iniciais (7 dias)

### 📅 Fase 3: Extração e Scoring
- [ ] Quinto Andar Extractor
- [ ] Safety Score Engine
- [ ] API Routes

### 📅 Fase 4: Interface
- [ ] Landing Page
- [ ] Analysis Page
- [ ] Visualizações (mapas, gráficos)

### 📅 Fase 5: Deploy
- [ ] Deploy Vercel
- [ ] Configurar banco em produção (Neon/Supabase)
- [ ] Monitoramento

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Roda em desenvolvimento
npm run build        # Build para produção
npm run start        # Inicia servidor de produção
npm run lint         # Lint do código

# Prisma
npm run db:generate  # Gera Prisma Client
npm run db:push      # Push schema para DB (sem migrations)
npm run db:migrate   # Cria e executa migrations
npm run db:studio    # Abre Prisma Studio

# Scraper
npm run scrape       # Executa scraper manualmente
```

## 📖 Documentação Completa

Toda a documentação detalhada está no folder `.specs/`:

- **Visão Geral**: `.specs/00-project-overview.md`
- **Database Schema**: `.specs/01-database-schema.md`
- **OTT Scraper**: `.specs/02-ott-scraper.md`
- **Quinto Andar Extractor**: `.specs/03-quinto-andar-extractor.md`
- **Safety Score Engine**: `.specs/04-safety-score-engine.md`
- **API Routes**: `.specs/05-api-routes.md`
- **Frontend Pages**: `.specs/06-frontend-pages.md`
- **Deployment Guide**: `.specs/07-deployment-guide.md`

## 🚀 Deploy em Produção

Veja o guia completo em `.specs/07-deployment-guide.md`

### Quick Start

1. Deploy no Vercel
2. Configure PostgreSQL (Neon/Supabase)
3. Adicione environment variables
4. Configure Vercel Cron para scraper

## 🤝 Contribuindo

Este projeto usa **spec-driven development**. Antes de implementar features, revise/atualize as specs em `.specs/`.

## 📝 Licença

MIT

## 🆘 Troubleshooting

### Database connection failed
- Verifique se PostgreSQL está rodando: `brew services list`
- Verifique DATABASE_URL em `.env.local`
- Teste conexão: `psql safeplace_dev`

### PostGIS extension not found
```bash
psql safeplace_dev -c "CREATE EXTENSION postgis;"
```

### Prisma Client out of sync
```bash
npm run db:generate
```

## 📧 Contato

Para dúvidas ou sugestões, abra uma issue no repositório.
