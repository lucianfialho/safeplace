'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, TrendingUp, MapPin } from 'lucide-react';

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
        // Armazenar dados no sessionStorage para a página de análise
        sessionStorage.setItem('demo-analysis', JSON.stringify(data.data));
        router.push(`/analyze/${mockId}`);
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
    <section className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-5xl font-bold mb-4">
        Analise a Segurança do Seu Futuro Lar
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
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
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
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
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
        <p className="text-sm text-gray-500 mt-2">
          Exemplo: https://www.quintoandar.com.br/imovel/893321695
        </p>

        {/* Demo Button */}
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={handleTestExample}
            disabled={loading}
          >
            Ou testar com exemplo em Ipanema
          </Button>
        </div>
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
