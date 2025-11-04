import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Map, BarChart3, TrendingDown, Target } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: Map,
      title: 'Análise Geoespacial',
      description: 'Incidentes mapeados em raios de 500m, 1km e 2km do imóvel.',
    },
    {
      icon: BarChart3,
      title: 'Estatísticas Detalhadas',
      description: 'Histórico de 30, 90 e 365 dias com gráficos interativos.',
    },
    {
      icon: TrendingDown,
      title: 'Análise de Tendências',
      description: 'Veja se a segurança está melhorando ou piorando.',
    },
    {
      icon: Target,
      title: 'Comparação Regional',
      description: 'Compare com bairros vizinhos e médias da cidade.',
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Funcionalidades
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
