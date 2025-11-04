'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PropertyCard } from './property-card';
import { ScoreDisplay } from './score-display';
import { RadiusScoreCard } from './radius-score-card';
import { IncidentTimeline } from './incident-timeline';
import { ComparisonChart } from './comparison-chart';
import { PlacesNearby } from './places-nearby';
import { Button } from '@/components/ui/button';

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
  const [data, setData] = useState(initialData);

  useEffect(() => {
    // Se não tem dados iniciais e é um demo, carregar do sessionStorage
    if (!data && listingId.startsWith('demo-')) {
      const storedData = sessionStorage.getItem('demo-analysis');
      if (storedData) {
        setData(JSON.parse(storedData));
      }
    }
  }, [data, listingId]);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Carregando análise...</h2>
          <p className="text-gray-600">Por favor, aguarde.</p>
        </div>
      </div>
    );
  }

  const { property, safetyScore } = data;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Property Header */}
        <PropertyCard property={property} />

        {/* Map Section */}
        <div className="mt-8">
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

        {/* Score Display */}
        <div className="mt-8">
          <ScoreDisplay
            score={{
              overallScore: safetyScore.overallScore,
              badge: safetyScore.badge,
            }}
            trend={safetyScore.trend}
          />
        </div>

        {/* Radius Scores */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
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
        <div className="mt-8">
          <IncidentTimeline incidents={safetyScore.incidents} />
        </div>

        {/* Comparison */}
        <div className="mt-8">
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
    </main>
  );
}
