'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ShieldCheck, TrendingUp, MapPin, Link as LinkIcon, Sparkles } from 'lucide-react';

export function HeroSection() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleAnalyze() {
    if (!url) return;

    setLoading(true);
    setError('');

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
        setError(data.error || 'Erro ao analisar imóvel. Tente novamente.');
      }
    } catch (error) {
      setError('Erro ao analisar imóvel. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestExample() {
    setLoading(true);
    setError('');

    try {
      // Usar API de análise manual com endereço de exemplo (Ipanema)
      // Coordenadas aproximadas da Rua Visconde de Pirajá, 550
      const response = await fetch('/api/analyze-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'Rua Visconde de Pirajá, 550',
          latitude: -22.9845,
          longitude: -43.1977,
          neighborhood: 'Ipanema',
          municipality: 'Rio de Janeiro',
          state: 'RJ',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Criar um ID mock para a demo
        const mockId = 'demo-ipanema-' + Date.now();
        console.log('[HERO] Salvando dados:', data.data);

        // Usar window object para persistir dados entre navegações
        if (typeof window !== 'undefined') {
          (window as any).__DEMO_ANALYSIS_DATA = data.data;
          (window as any).__DEMO_ANALYSIS_ID = mockId;
          console.log('[HERO] Dados salvos em window.__DEMO_ANALYSIS_DATA');
        }

        console.log('[HERO] Navegando para:', `/analyze/${mockId}?tour=true`);
        router.push(`/analyze/${mockId}?tour=true`);
      } else {
        setError(data.error || 'Erro ao gerar exemplo. Tente novamente.');
      }
    } catch (error) {
      setError('Erro ao gerar exemplo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden bg-gray-900">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2340&auto=format&fit=crop)',
          filter: 'brightness(0.7)'
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-4xl mx-auto text-left mb-8">
            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg leading-tight">
              O que te espera na casa dos seus sonhos?
            </h1>
            <p className="text-base md:text-lg text-white/90 drop-shadow">
              Independente de alugar ou comprar, cheque se você não está entrando em uma roubada.
            </p>
          </div>

          {/* Horizontal Search Card - Estilo Airbnb */}
          <Card className="p-6 bg-white shadow-2xl max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {/* Input Section */}
              <div className="flex-1 text-left">
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Link do Quinto Andar
                </label>
                <Input
                  type="url"
                  placeholder="https://www.quintoandar.com.br/imovel/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="h-14 text-base border-0 border-b-2 border-gray-200 focus:border-blue-600 rounded-none px-0"
                  disabled={loading}
                />
              </div>

              {/* Button */}
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={!url || loading}
                className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-base font-semibold whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analisando...
                  </span>
                ) : (
                  'Ver o que acontece'
                )}
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Demo link */}
            <div className="mt-4 text-center">
              <button
                onClick={handleTestExample}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                ou ver um exemplo
              </button>
            </div>
          </Card>

          {/* Trust indicators - Horizontal */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-white">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium drop-shadow">Incidentes mapeados</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium drop-shadow">Dados do ISP em tempo real</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium drop-shadow">100% transparente e gratuito</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
