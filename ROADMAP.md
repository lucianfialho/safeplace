# Roadmap Detalhado - SafePlace

## 📊 Status Atual

**Produção:** https://safeplace-eta.vercel.app/
**Dados:** 789 incidentes coletados
**APIs:** 100% funcionais
**Monitoramento:** Dashboard ativo em `/cron-monitor`

---

## 🚧 PRÓXIMA FASE: Interface do Usuário

### Objetivo
Criar a interface web completa para usuários finais analisarem a segurança de imóveis de forma visual e intuitiva.

### Fase 6.1: Landing Page
**Prioridade:** Alta
**Estimativa:** 2-3 sessões

#### Features
- [ ] **Hero Section**
  - Título e subtítulo explicativos
  - Campo de busca de imóveis (URL do Quinto Andar)
  - CTA principal

- [ ] **Como Funciona**
  - 3 passos ilustrados
  - Explicação do Safety Score
  - Visualização dos raios de análise (500m, 1km, 2km)

- [ ] **Estatísticas em Tempo Real**
  - Total de incidentes analisados
  - Cidades cobertas
  - Últimas atualizações
  - Integração com `/api/stats`

- [ ] **Footer**
  - Links importantes
  - Informações sobre os dados (fonte OTT)
  - Disclaimer legal

#### Componentes Necessários
```
/src/components/landing/
├── Hero.tsx
├── HowItWorks.tsx
├── LiveStats.tsx
├── SearchBar.tsx
└── Footer.tsx
```

#### Rotas
- `/` - Landing page

---

### Fase 6.2: Analysis Page - Core
**Prioridade:** Alta
**Estimativa:** 3-4 sessões

#### Features
- [ ] **Header com Resumo**
  - Endereço do imóvel
  - Safety Score (0-100) com indicador visual
  - Status (Seguro / Atenção / Risco)
  - Botão de compartilhar/exportar

- [ ] **Cards de Scores por Raio**
  - 500m / 1km / 2km
  - Score individual para cada raio
  - Número de incidentes
  - Trend (↑↓→)

- [ ] **Breakdown por Tipo de Incidente**
  - Gráfico de pizza ou barras
  - Lista de tipos com contagem
  - Destaque para mais críticos
  - Períodos: 30d, 90d, 365d

- [ ] **Tabela de Incidentes Próximos**
  - Data, tipo, distância
  - Ordenação e filtros
  - Paginação
  - Link para detalhes

#### Componentes Necessários
```
/src/components/analysis/
├── ScoreHeader.tsx
├── RadiusScoreCard.tsx
├── IncidentBreakdown.tsx
├── IncidentsTable.tsx
└── TrendIndicator.tsx
```

#### Rotas
- `/analyze?url=[quinta-andar-url]` - Análise por URL
- `/analyze/manual?address=[address]` - Análise por endereço

---

### Fase 6.3: Visualizações Avançadas
**Prioridade:** Média
**Estimativa:** 3-4 sessões

#### Features
- [ ] **Mapa Interativo**
  - Pin do imóvel no centro
  - Círculos dos raios (500m, 1km, 2km)
  - Markers de incidentes (coloridos por tipo)
  - Popup com detalhes ao clicar
  - Heatmap opcional
  - Biblioteca: Leaflet ou Mapbox

- [ ] **Gráfico de Tendência Temporal**
  - Linha do tempo de incidentes
  - Filtro por período (7d, 30d, 90d, 1y)
  - Comparação com períodos anteriores
  - Biblioteca: Recharts ou Chart.js

- [ ] **Comparação de Bairros**
  - Lista de bairros próximos
  - Ranking visual
  - Gráfico de radar comparativo
  - Integração com `/api/compare-nearby`

#### Componentes Necessários
```
/src/components/analysis/
├── InteractiveMap.tsx
├── TrendChart.tsx
├── NeighborhoodComparison.tsx
└── RadarChart.tsx
```

#### Bibliotecas a Adicionar
```json
{
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  "recharts": "^2.10.3"
}
```

---

### Fase 6.4: Exportação e Compartilhamento
**Prioridade:** Baixa
**Estimativa:** 2 sessões

#### Features
- [ ] **Exportar PDF**
  - Relatório completo formatado
  - Inclui mapas e gráficos
  - Biblioteca: jsPDF + html2canvas

- [ ] **Compartilhar Link**
  - URL pública da análise
  - Salvar análise no banco
  - Preview card para redes sociais (OG tags)

- [ ] **Salvar Favoritos** (opcional)
  - Sistema de contas básico (NextAuth)
  - Salvar análises favoritas
  - Alertas de novos incidentes

---

## 📅 Fase 7: Melhorias e Otimizações

### Fase 7.1: Performance
**Prioridade:** Média

- [ ] **Cache de Scores**
  - Redis ou Vercel KV
  - TTL de 1 hora para cálculos
  - Invalidação ao atualizar dados

- [ ] **Otimização de Queries**
  - Índices no PostgreSQL
  - Materializar views comuns
  - Paginação server-side

- [ ] **ISR (Incremental Static Regeneration)**
  - Pre-render de páginas comuns
  - Revalidação a cada hora

### Fase 7.2: Qualidade
**Prioridade:** Baixa

- [ ] **Testes**
  - Unit tests (Vitest)
  - Integration tests (Playwright)
  - E2E tests principais fluxos

- [ ] **CI/CD**
  - GitHub Actions
  - Lint automático
  - Tests antes de merge
  - Preview deploys

- [ ] **Monitoring**
  - Sentry para errors
  - Analytics (Plausible ou Posthog)
  - Performance monitoring

### Fase 7.3: SEO e Marketing
**Prioridade:** Média

- [ ] **SEO**
  - Meta tags otimizadas
  - Schema.org structured data
  - Sitemap dinâmico
  - robots.txt

- [ ] **Landing Page Otimizações**
  - A/B testing de CTAs
  - Social proof (testimonials)
  - Blog com dicas de segurança

---

## 🎯 Critérios de Sucesso

### Fase 6 (Interface)
- ✅ Landing page carrega em <2s
- ✅ Análise completa em <5s
- ✅ Design responsivo (mobile + desktop)
- ✅ Acessibilidade (WCAG AA)
- ✅ 100% das APIs integradas

### Fase 7 (Otimizações)
- ✅ Score 90+ no Lighthouse
- ✅ Cobertura de testes >70%
- ✅ Zero erros não tratados
- ✅ Uptime >99.5%

---

## 📝 Notas de Implementação

### Stack Frontend
- **UI Framework:** Tailwind CSS
- **Components:** shadcn/ui (opcional)
- **Maps:** React Leaflet
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **State:** React Query para cache

### Priorização
1. **Fase 6.1 e 6.2 são essenciais** - Core da aplicação
2. **Fase 6.3** - Incrementa muito o valor, mas não é bloqueante
3. **Fase 6.4** - Nice to have
4. **Fase 7** - Fazer após ter usuários reais

### Decisões Arquiteturais
- **Rendering:** SSR para SEO, Client-side para interatividade
- **Data Fetching:** Server Components + React Query
- **Styling:** Tailwind com design system customizado
- **Type Safety:** Zod schemas compartilhados com backend

---

## 🚀 Próximos Passos Imediatos

### Começar Fase 6.1 - Landing Page

1. **Setup do Design System**
   - Instalar Tailwind plugins necessários
   - Definir cores, tipografia, espaçamentos
   - Criar componentes base (Button, Card, etc)

2. **Implementar Hero Section**
   - Layout responsivo
   - SearchBar funcional
   - Integração com `/api/analyze`

3. **Implementar LiveStats**
   - Fetch de `/api/stats`
   - Números animados
   - Auto-refresh

Quer começar pela Landing Page agora?
