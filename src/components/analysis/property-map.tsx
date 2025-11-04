'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Incident {
  id: string;
  occurredAt: string;
  neighborhood: string;
  municipality: string;
  latitude: number;
  longitude: number;
  type: string;
  severityScore: number;
  distanceMeters: number;
}

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  neighborhood: string;
  municipality: string;
}

// Custom icons for different incident types
const createIncidentIcon = (type: string) => {
  const color = getIncidentColor(type);

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    className: 'custom-incident-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

function getIncidentColor(type: string): string {
  switch (type) {
    case 'TIROTEIO':
      return '#dc2626'; // red-600
    case 'DISPAROS_OUVIDOS':
      return '#ea580c'; // orange-600
    case 'INCENDIO':
      return '#ca8a04'; // yellow-600
    case 'EXPLOSAO':
      return '#9333ea'; // purple-600
    case 'CONFRONTO':
      return '#e11d48'; // rose-600
    case 'ARRASTAO':
      return '#be123c'; // rose-700
    case 'OPERACAO_POLICIAL':
      return '#2563eb'; // blue-600
    default:
      return '#6b7280'; // gray-500
  }
}

function getIncidentLabel(type: string): string {
  const labels: Record<string, string> = {
    TIROTEIO: 'Tiroteio',
    DISPAROS_OUVIDOS: 'Disparos Ouvidos',
    INCENDIO: 'Incêndio',
    EXPLOSAO: 'Explosão',
    CONFRONTO: 'Confronto',
    ARRASTAO: 'Arrastão',
    OPERACAO_POLICIAL: 'Operação Policial',
    BARRICADA: 'Barricada',
    ROUBO_TRANSITO: 'Roubo em Trânsito',
    SEQUESTRO: 'Sequestro',
    HOMICIDIO: 'Homicídio',
    OUTROS: 'Outros',
  };
  return labels[type] || type;
}

export function PropertyMap({
  latitude,
  longitude,
  address,
  neighborhood,
  municipality,
}: PropertyMapProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch incidents within 2km radius
    async function fetchIncidents() {
      try {
        const response = await fetch(
          `/api/incidents/nearby?lat=${latitude}&lng=${longitude}&radius=2000&days=90&limit=100`
        );
        const data = await response.json();

        if (data.success) {
          setIncidents(data.data.incidents);
        }
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();
  }, [latitude, longitude]);

  const position: [number, number] = [latitude, longitude];

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Property marker */}
        <Marker position={position}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{neighborhood}</p>
              {address && <p className="text-gray-600">{address}</p>}
              <p className="text-gray-500">{municipality}</p>
            </div>
          </Popup>
        </Marker>

        {/* Incident markers */}
        {!loading &&
          incidents.map((incident) => (
            <Marker
              key={incident.id}
              position={[incident.latitude, incident.longitude]}
              icon={createIncidentIcon(incident.type)}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getIncidentColor(incident.type) }}
                    />
                    <p className="font-semibold">{getIncidentLabel(incident.type)}</p>
                  </div>
                  <p className="text-gray-600 mb-1">
                    📍 {incident.neighborhood}, {incident.municipality}
                  </p>
                  <p className="text-gray-500 text-xs mb-1">
                    📅 {new Date(incident.occurredAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-gray-500 text-xs">
                    📏 {incident.distanceMeters}m de distância
                  </p>
                  {incident.severityScore > 0 && (
                    <p className="text-gray-500 text-xs mt-1">
                      ⚠️ Gravidade: {incident.severityScore}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 500m radius circle */}
        <Circle
          center={position}
          radius={500}
          pathOptions={{
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.1,
            weight: 2,
          }}
        />

        {/* 1km radius circle */}
        <Circle
          center={position}
          radius={1000}
          pathOptions={{
            color: '#eab308',
            fillColor: '#eab308',
            fillOpacity: 0.05,
            weight: 2,
          }}
        />

        {/* 2km radius circle */}
        <Circle
          center={position}
          radius={2000}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.03,
            weight: 2,
          }}
        />
      </MapContainer>

      {/* Legend */}
      {!loading && incidents.length > 0 && (
        <div className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs">
          <p className="font-semibold mb-1">Legenda de Incidentes:</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }} />
              <span>Tiroteio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ea580c' }} />
              <span>Disparos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ca8a04' }} />
              <span>Incêndio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2563eb' }} />
              <span>Op. Policial</span>
            </div>
          </div>
          <p className="mt-1 text-gray-500">
            {incidents.length} incidente{incidents.length !== 1 ? 's' : ''} nos últimos 90 dias
          </p>
        </div>
      )}
    </div>
  );
}
