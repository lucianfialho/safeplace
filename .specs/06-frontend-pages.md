# Frontend Pages Specification

## Overview
Next.js 15 App Router pages built with React Server Components and TypeScript. Modern, responsive UI using Tailwind CSS and shadcn/ui components.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Maps**: Mapbox GL JS or Leaflet
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## File Structure
```
/app
  layout.tsx                    # Root layout
  page.tsx                      # Landing page (/)
  /analyze
    /[listingId]
      page.tsx                  # Analysis results page
  /about
    page.tsx                    # About page
  /api                          # API routes (see 05-api-routes.md)

/components
  /ui                           # shadcn/ui components
    button.tsx
    card.tsx
    badge.tsx
    input.tsx
    ...
  /landing
    hero.tsx
    features.tsx
    how-it-works.tsx
  /analysis
    property-card.tsx
    score-display.tsx
    incident-map.tsx
    incident-timeline.tsx
    comparison-chart.tsx
    trend-indicator.tsx
  /shared
    header.tsx
    footer.tsx
    loading-spinner.tsx
```

## Pages

### 1. Landing Page (`/`)

**Purpose**: Convert visitors into users by explaining value proposition and providing URL input.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│              Header/Nav                 │
├─────────────────────────────────────────┤
│              Hero Section                │
│  - Headline                             │
│  - Subheadline                          │
│  - URL Input + Analyze Button          │
│  - Trust indicators                     │
├─────────────────────────────────────────┤
│           How It Works (3 steps)        │
├─────────────────────────────────────────┤
│           Features (3-4 cards)          │
├─────────────────────────────────────────┤
│           Example Analysis              │
│  - Mock score card                      │
│  - Screenshot/preview                   │
├─────────────────────────────────────────┤
│              Call to Action             │
├─────────────────────────────────────────┤
│              Footer                     │
└─────────────────────────────────────────┘
```

#### Hero Section
```tsx
// /app/page.tsx

import { HeroSection } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Features } from '@/components/landing/features';
import { ExampleAnalysis } from '@/components/landing/example-analysis';
import { CallToAction } from '@/components/landing/call-to-action';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <HowItWorks />
      <Features />
      <ExampleAnalysis />
      <CallToAction />
    </main>
  );
}
```

#### Hero Component
```tsx
// /components/landing/hero.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, TrendingUp, MapPin } from 'lucide-react';

export function HeroSection() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAnalyze() {
    if (!url) return;

    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to analysis page
        router.push(`/analyze/${data.data.property.qaListingId}`);
      } else {
        alert(data.error.message);
      }
    } catch (error) {
      alert('Erro ao analisar imóvel. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-5xl font-bold mb-4">
        Analise a Segurança do Seu Futuro Lar
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        Score de segurança em tempo real para imóveis no Rio de Janeiro,
        baseado em dados públicos de incidentes.
      </p>

      {/* URL Input */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Cole a URL do Quinto Andar aqui..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-lg h-14"
          />
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={!url || loading}
            className="h-14 px-8"
          >
            {loading ? 'Analisando...' : 'Analisar'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Exemplo: https://www.quintoandar.com.br/imovel/893321695
        </p>
      </div>

      {/* Trust Indicators */}
      <div className="flex justify-center gap-8 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-green-500" />
          <span className="text-sm">100% Gratuito</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-blue-500" />
          <span className="text-sm">Dados em Tempo Real</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="text-orange-500" />
          <span className="text-sm">Cobertura no RJ</span>
        </div>
      </div>
    </section>
  );
}
```

#### How It Works Section
```tsx
// /components/landing/how-it-works.tsx

export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Cole a URL',
      description: 'Copie o link do imóvel do Quinto Andar',
      icon: '🔗',
    },
    {
      number: 2,
      title: 'Análise Automática',
      description: 'Analisamos incidentes em um raio de até 2km',
      icon: '📊',
    },
    {
      number: 3,
      title: 'Score de Segurança',
      description: 'Receba um score de 0-100 com estatísticas detalhadas',
      icon: '✅',
    },
  ];

  return (
    <section className="bg-muted py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Como Funciona
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-5xl mb-4">{step.icon}</div>
              <div className="text-sm text-muted-foreground mb-2">
                Passo {step.number}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### 2. Analysis Results Page (`/analyze/[listingId]`)

**Purpose**: Display comprehensive safety analysis for a property.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│              Header/Nav                 │
├─────────────────────────────────────────┤
│           Property Header               │
│  - Address/Neighborhood                 │
│  - Price, Specs                         │
│  - Link to Original Listing            │
├─────────────────────────────────────────┤
│         Overall Score Card              │
│  - Large score badge (0-100)           │
│  - Rating (Excellent/Good/Fair...)     │
│  - Trend indicator                      │
├─────────────────────────────────────────┤
│          Radius Scores (3 cards)        │
│  [500m]  [1km]  [2km]                  │
├─────────────────────────────────────────┤
│            Incident Map                 │
│  - Property marker                      │
│  - Incident pins (color-coded)         │
│  - Radius circles                       │
├─────────────────────────────────────────┤
│         Incident Statistics             │
│  - Timeline chart (30/90/365d)         │
│  - Breakdown by type                    │
├─────────────────────────────────────────┤
│         Comparison Section              │
│  - vs Neighborhood Average              │
│  - vs City Average                      │
│  - Percentile Rank                      │
├─────────────────────────────────────────┤
│            Call to Action               │
│  - Share Results                        │
│  - Analyze Another                      │
└─────────────────────────────────────────┘
```

#### Page Implementation
```tsx
// /app/analyze/[listingId]/page.tsx

import { notFound } from 'next/navigation';
import { PropertyCard } from '@/components/analysis/property-card';
import { ScoreDisplay } from '@/components/analysis/score-display';
import { IncidentMap } from '@/components/analysis/incident-map';
import { IncidentTimeline } from '@/components/analysis/incident-timeline';
import { ComparisonChart } from '@/components/analysis/comparison-chart';

interface PageProps {
  params: {
    listingId: string;
  };
}

async function getAnalysisData(listingId: string) {
  // Fetch from database or call API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/property/${listingId}`,
    { cache: 'no-store' }
  );

  if (!response.ok) return null;
  return response.json();
}

export default async function AnalysisPage({ params }: PageProps) {
  const data = await getAnalysisData(params.listingId);

  if (!data) {
    notFound();
  }

  const { property, score, incidents, trend, comparison } = data.data;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Property Header */}
        <PropertyCard property={property} />

        {/* Score Display */}
        <div className="mt-8">
          <ScoreDisplay
            score={score}
            trend={trend}
          />
        </div>

        {/* Radius Scores */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <RadiusScoreCard
            label="500m"
            score={score.score500m}
            incidents={incidents.incidents500m30d}
          />
          <RadiusScoreCard
            label="1km"
            score={score.score1km}
            incidents={incidents.incidents1km30d}
          />
          <RadiusScoreCard
            label="2km"
            score={score.score2km}
            incidents={incidents.incidents2km30d}
          />
        </div>

        {/* Incident Map */}
        <div className="mt-8">
          <IncidentMap
            center={[property.latitude, property.longitude]}
            incidents={[]}  // Fetch from API
            radii={[500, 1000, 2000]}
          />
        </div>

        {/* Incident Timeline */}
        <div className="mt-8">
          <IncidentTimeline incidents={incidents} />
        </div>

        {/* Comparison */}
        <div className="mt-8">
          <ComparisonChart
            propertyScore={score.overallScore}
            comparison={comparison}
          />
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <a href="/">Analisar Outro Imóvel</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

#### Score Display Component
```tsx
// /components/analysis/score-display.tsx

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendIndicator } from './trend-indicator';

interface ScoreDisplayProps {
  score: {
    overallScore: number;
    badge: {
      label: string;
      color: string;
      description: string;
    };
  };
  trend: {
    direction: 'IMPROVING' | 'STABLE' | 'WORSENING';
    percentage: number;
  };
}

export function ScoreDisplay({ score, trend }: ScoreDisplayProps) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-2xl font-semibold mb-4">Score de Segurança</h2>

      {/* Large Score */}
      <div className="mb-4">
        <div
          className={`text-7xl font-bold ${getScoreColor(score.overallScore)}`}
        >
          {score.overallScore}
        </div>
        <div className="text-muted-foreground">de 100</div>
      </div>

      {/* Badge */}
      <Badge
        variant="secondary"
        className={`text-lg px-4 py-2 bg-${score.badge.color}-100`}
      >
        {score.badge.label}
      </Badge>

      <p className="text-muted-foreground mt-4">{score.badge.description}</p>

      {/* Trend */}
      <div className="mt-6">
        <TrendIndicator direction={trend.direction} percentage={trend.percentage} />
      </div>
    </Card>
  );
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}
```

#### Incident Map Component
```tsx
// /components/analysis/incident-map.tsx

'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface IncidentMapProps {
  center: [number, number]; // [lat, lng]
  incidents: Array<{
    id: string;
    latitude: number;
    longitude: number;
    incidentType: string;
    occurredAt: string;
  }>;
  radii: number[]; // meters
}

export function IncidentMap({ center, incidents, radii }: IncidentMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [center[1], center[0]], // Mapbox uses [lng, lat]
      zoom: 14,
    });

    // Add property marker
    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([center[1], center[0]])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>Imóvel</strong>'))
      .addTo(map.current);

    // Add radius circles
    radii.forEach((radius) => {
      const circle = createCircle(center, radius);
      map.current!.on('load', () => {
        map.current!.addSource(`circle-${radius}`, {
          type: 'geojson',
          data: circle,
        });
        map.current!.addLayer({
          id: `circle-${radius}`,
          type: 'fill',
          source: `circle-${radius}`,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.1,
          },
        });
      });
    });

    // Add incident markers
    incidents.forEach((incident) => {
      const color = getIncidentColor(incident.incidentType);
      new mapboxgl.Marker({ color })
        .setLngLat([incident.longitude, incident.latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>${incident.incidentType}</strong><br>${new Date(
              incident.occurredAt
            ).toLocaleDateString()}`
          )
        )
        .addTo(map.current!);
    });

    return () => {
      map.current?.remove();
    };
  }, [center, incidents, radii]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Incidentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={mapContainer} className="h-[500px] rounded-lg" />
      </CardContent>
    </Card>
  );
}

function createCircle(center: [number, number], radiusMeters: number) {
  // Create GeoJSON circle
  const points = 64;
  const coords = {
    latitude: center[0],
    longitude: center[1],
  };

  const km = radiusMeters / 1000;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
  };
}

function getIncidentColor(type: string): string {
  switch (type) {
    case 'TIROTEIO':
      return '#ef4444';
    case 'DISPAROS_OUVIDOS':
      return '#f97316';
    case 'INCENDIO':
      return '#eab308';
    default:
      return '#6b7280';
  }
}
```

#### Incident Timeline Component
```tsx
// /components/analysis/incident-timeline.tsx

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IncidentTimelineProps {
  incidents: {
    incidents500m30d: number;
    incidents500m90d: number;
    incidents500m365d: number;
    incidents1km30d: number;
    incidents1km90d: number;
    incidents1km365d: number;
    incidents2km30d: number;
    incidents2km90d: number;
    incidents2km365d: number;
  };
}

export function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  const data = [
    {
      period: '30 dias',
      '500m': incidents.incidents500m30d,
      '1km': incidents.incidents1km30d,
      '2km': incidents.incidents2km30d,
    },
    {
      period: '90 dias',
      '500m': incidents.incidents500m90d,
      '1km': incidents.incidents1km90d,
      '2km': incidents.incidents2km90d,
    },
    {
      period: '1 ano',
      '500m': incidents.incidents500m365d,
      '1km': incidents.incidents1km365d,
      '2km': incidents.incidents2km365d,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Incidentes</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="500m" fill="#3b82f6" />
            <Bar dataKey="1km" fill="#60a5fa" />
            <Bar dataKey="2km" fill="#93c5fd" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

### 3. About Page (`/about`)

Simple page explaining the project, data sources, and methodology.

```tsx
// /app/about/page.tsx

export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Sobre o SafePlace</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Nossa Missão</h2>
        <p className="text-muted-foreground">
          Ajudar pessoas a tomar decisões informadas sobre onde morar,
          fornecendo dados objetivos de segurança baseados em fontes públicas.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Fonte de Dados</h2>
        <p className="text-muted-foreground">
          Nossos dados vêm do OTT (Onde Tem Tiroteio), um aplicativo
          colaborativo que monitora incidentes de segurança no Rio de Janeiro
          em tempo real.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Metodologia</h2>
        <p className="text-muted-foreground mb-4">
          O score de segurança (0-100) é calculado considerando:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>Número de incidentes em múltiplos raios (500m, 1km, 2km)</li>
          <li>Gravidade dos incidentes (tiroteios têm mais peso)</li>
          <li>Recência (incidentes recentes têm mais peso)</li>
          <li>Comparação com médias do bairro e cidade</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Aviso Legal</h2>
        <p className="text-muted-foreground text-sm">
          Os dados são fornecidos apenas para fins informativos. Não
          garantimos a precisão completa dos dados e não nos
          responsabilizamos por decisões tomadas com base nessas informações.
        </p>
      </section>
    </main>
  );
}
```

---

## Responsive Design

All components should be mobile-first and responsive:

```tsx
// Mobile: Stack vertically
// Tablet: 2 columns
// Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

---

## Loading States

```tsx
// /components/shared/loading-spinner.tsx

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}

// Usage in page
export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AnalysisContent />
    </Suspense>
  );
}
```

---

## SEO & Meta Tags

```tsx
// /app/analyze/[listingId]/page.tsx

export async function generateMetadata({ params }: PageProps) {
  const data = await getAnalysisData(params.listingId);

  if (!data) {
    return {
      title: 'Imóvel não encontrado',
    };
  }

  const { property, score } = data.data;

  return {
    title: `Score ${score.overallScore} - ${property.neighborhood}, ${property.municipality}`,
    description: `Análise de segurança para imóvel em ${property.neighborhood}. Score: ${score.overallScore}/100 (${score.badge.label})`,
    openGraph: {
      title: `SafePlace - ${property.neighborhood}`,
      description: `Score de segurança: ${score.overallScore}/100`,
      images: ['/og-image.png'],
    },
  };
}
```

---

## Performance Optimization

- Use Next.js Image component for all images
- Lazy load maps and charts
- Implement skeleton loaders
- Cache API responses with `revalidate`
- Use React Server Components where possible

## Accessibility

- Proper semantic HTML
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast ratios (WCAG AA)
- Screen reader tested
