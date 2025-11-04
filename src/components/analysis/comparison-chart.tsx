'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ComparisonChartProps {
  propertyScore: number;
  comparison: {
    neighborhoodAvgScore: number;
    cityAvgScore: number;
    percentileRank: number;
    betterThanNeighborhood: boolean;
    betterThanCity: boolean;
  };
}

export function ComparisonChart({ propertyScore, comparison }: ComparisonChartProps) {
  const data = [
    {
      name: 'Este Imóvel',
      score: propertyScore,
      color: '#3b82f6',
    },
    {
      name: 'Média do Bairro',
      score: comparison.neighborhoodAvgScore,
      color: '#60a5fa',
    },
    {
      name: 'Média da Cidade',
      score: comparison.cityAvgScore,
      color: '#93c5fd',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação Regional</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Este imóvel está no{' '}
            <span className="font-bold text-blue-600">
              percentil {comparison.percentileRank.toFixed(0)}
            </span>{' '}
            de segurança da região.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="score">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
