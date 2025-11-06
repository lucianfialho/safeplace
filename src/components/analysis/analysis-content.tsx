'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PropertyCard } from './property-card';
import { ScoreDisplay } from './score-display';
import { RadiusScoreCard } from './radius-score-card';
import { IncidentTimeline } from './incident-timeline';
import { ComparisonChart } from './comparison-chart';
import { PlacesNearby } from './places-nearby';
import { Button } from '@/components/ui/button';
import { ProductTour } from '@/components/tour/product-tour';
import { AnalysisLoading } from './analysis-loading';

// Dynamically import the map component to avoid SSR issues with Leaflet
const PropertyMap = dynamic(() => import('./property-map').then((mod) => mod.PropertyMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
      <p className="text-gray-500">Carregando mapa...</p>
    </div>
  ),
});

interface AnalysisContentProps {
  initialData: any;
  listingId: string;
}

export function AnalysisContent({ initialData, listingId }: AnalysisContentProps) {
  const [data, setData] = useState<any>(null); // Sempre começa null para forçar loading
  const searchParams = useSearchParams();
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [minLoadingPassed, setMinLoadingPassed] = useState(false);

  useEffect(() => {
    console.log('[ANALYSIS] Iniciando loading... listingId:', listingId);

    // Tempo mínimo de loading para o usuário ver a animação (5 segundos)
    const minLoadingTimer = setTimeout(() => {
      console.log('[ANALYSIS] Tempo mínimo de loading passou');
      setMinLoadingPassed(true);
    }, 5000);

    // Simular loading e depois carregar dados
    // Para demos, tentar múltiplas vezes pois pode haver race condition com sessionStorage
    let attempts = 0;
    const maxAttempts = 10;

    const tryLoadData = () => {
      if (listingId.startsWith('demo-')) {
        console.log('[ANALYSIS] É um demo, tentativa', attempts + 1, 'de', maxAttempts);

        // Tentar pegar do window object
        const windowData = typeof window !== 'undefined' ? (window as any).__DEMO_ANALYSIS_DATA : null;
        console.log('[ANALYSIS] Dados no window:', windowData ? 'encontrados' : 'não encontrados');

        if (windowData) {
          console.log('[ANALYSIS] Dados encontrados:', windowData);
          setData(windowData);
          // Limpar dados após uso
          if (typeof window !== 'undefined') {
            delete (window as any).__DEMO_ANALYSIS_DATA;
            delete (window as any).__DEMO_ANALYSIS_ID;
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryLoadData, 200); // Tentar novamente em 200ms
        } else {
          console.error('[ANALYSIS] Dados não encontrados após', maxAttempts, 'tentativas');
        }
      } else {
        console.log('[ANALYSIS] Não é demo, usando initialData');
        setData(initialData);
      }
    };

    const dataTimer = setTimeout(tryLoadData, 100); // Pequeno delay para garantir que loading aparece

    return () => {
      clearTimeout(minLoadingTimer);
      clearTimeout(dataTimer);
    };
  }, [listingId, initialData]);

  useEffect(() => {
    // Se veio com query param tour=true, abrir o tour
    if (data && minLoadingPassed && searchParams?.get('tour') === 'true') {
      // Delay para garantir que a página está renderizada
      setTimeout(() => setIsTourOpen(true), 500);
    }
  }, [data, minLoadingPassed, searchParams]);

  const tourSteps = [
    {
      title: 'Bem-vindo ao SafePlace!',
      description: 'Vamos te mostrar como funciona a análise de segurança. Clique em "Próximo" para começar.',
      position: 'center' as const,
    },
    {
      title: 'Score de Segurança',
      description: 'Este é o score geral do imóvel, baseado em incidentes reais dos últimos 90 dias. Quanto maior, mais seguro.',
      target: '[data-tour="score-display"]',
      position: 'bottom' as const,
    },
    {
      title: 'Mapa de Incidentes',
      description: 'Veja no mapa onde exatamente aconteceram os incidentes ao redor do imóvel. Cada pin mostra um tipo diferente de ocorrência.',
      target: '[data-tour="map"]',
      position: 'top' as const,
    },
    {
      title: 'Scores por Raio',
      description: 'Compare a segurança em diferentes distâncias: 500m, 1km e 2km do imóvel.',
      target: '[data-tour="radius-scores"]',
      position: 'bottom' as const,
    },
    {
      title: 'Linha do Tempo',
      description: 'Veja quando e quais tipos de incidentes aconteceram nos últimos meses.',
      target: '[data-tour="timeline"]',
      position: 'bottom' as const,
    },
    {
      title: 'Comparação',
      description: 'Compare o score deste imóvel com a média do bairro e da cidade.',
      target: '[data-tour="comparison"]',
      position: 'bottom' as const,
    },
    {
      title: 'Pronto!',
      description: 'Agora você sabe como usar o SafePlace para tomar decisões mais informadas. Cole o link de qualquer imóvel do Quinto Andar e faça sua própria análise!',
      position: 'center' as const,
    },
  ];

  // Mostrar loading enquanto dados não carregaram OU enquanto tempo mínimo não passou
  console.log('[ANALYSIS] Check loading:', {
    hasData: !!data,
    hasSafetyScore: !!data?.safetyScore,
    hasProperty: !!data?.property,
    minLoadingPassed
  });

  if (!data || !data.safetyScore || !data.property || !minLoadingPassed) {
    console.log('[ANALYSIS] Mostrando loading...');
    return <AnalysisLoading />;
  }

  console.log('[ANALYSIS] Mostrando análise completa!');

  const { property, safetyScore } = data;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Property Header */}
        <PropertyCard property={property} />

        {/* Score Display */}
        <div className="mt-8" data-tour="score-display">
          <ScoreDisplay
            score={{
              overallScore: safetyScore.overallScore,
              badge: safetyScore.badge,
            }}
            trend={safetyScore.trend}
          />
        </div>

        {/* Map Section */}
        <div className="mt-8" data-tour="map">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-2">Localização e Área de Análise</h2>
            <p className="text-gray-600 text-sm">
              Visualize o imóvel e os raios de análise: <span className="text-green-600 font-medium">500m</span>, <span className="text-yellow-600 font-medium">1km</span> e <span className="text-red-600 font-medium">2km</span>
            </p>
          </div>
          <PropertyMap
            latitude={property.latitude}
            longitude={property.longitude}
            address={property.address}
            neighborhood={property.neighborhood}
            municipality={property.municipality}
          />
        </div>

        {/* Radius Scores */}
        <div className="mt-8 grid md:grid-cols-3 gap-4" data-tour="radius-scores">
          <RadiusScoreCard
            label="500m"
            score={safetyScore.score500m}
            incidents={safetyScore.incidents.incidents500m30d}
          />
          <RadiusScoreCard
            label="1km"
            score={safetyScore.score1km}
            incidents={safetyScore.incidents.incidents1km30d}
          />
          <RadiusScoreCard
            label="2km"
            score={safetyScore.score2km}
            incidents={safetyScore.incidents.incidents2km30d}
          />
        </div>

        {/* Incident Timeline */}
        <div className="mt-8" data-tour="timeline">
          <IncidentTimeline incidents={safetyScore.incidents} />
        </div>

        {/* Comparison */}
        <div className="mt-8" data-tour="comparison">
          <ComparisonChart
            propertyScore={safetyScore.overallScore}
            comparison={safetyScore.comparison}
          />
        </div>

        {/* Places Nearby */}
        {property.placesNearby && Array.isArray(property.placesNearby) && property.placesNearby.length > 0 && (
          <div className="mt-8">
            <PlacesNearby places={property.placesNearby as any[]} />
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <a href="/">
            <Button size="lg">
              Analisar Outro Imóvel
            </Button>
          </a>
        </div>
      </div>

      {/* Product Tour */}
      <ProductTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </main>
  );
}
