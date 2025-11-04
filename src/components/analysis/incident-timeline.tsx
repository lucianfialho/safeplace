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
