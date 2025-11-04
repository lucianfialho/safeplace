import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface PropertyCardProps {
  property: {
    qaListingId: string;
    address: string;
    neighborhood: string;
    municipality: string;
    state: string;
    latitude: number;
    longitude: number;
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const qaUrl = `https://www.quintoandar.com.br/imovel/${property.qaListingId}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl mb-2">{property.address}</CardTitle>
            <p className="text-gray-600">
              {property.neighborhood}, {property.municipality} - {property.state}
            </p>
          </div>
          <a
            href={qaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            Ver no Quinto Andar
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">
          Coordenadas: {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)}
        </p>
      </CardContent>
    </Card>
  );
}
