import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building2, School, ShoppingCart, Trees, MapPin, Hospital } from 'lucide-react';

interface Place {
  name: string;
  type: string;
  slug: string;
}

interface PlacesNearbyProps {
  places: Place[];
}

const PLACE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  SCHOOL: {
    label: 'Escolas',
    icon: <School className="w-4 h-4" />,
    color: 'text-blue-600 bg-blue-50',
  },
  UNIVERSITY_OR_COLLEGE: {
    label: 'Universidades',
    icon: <Building2 className="w-4 h-4" />,
    color: 'text-purple-600 bg-purple-50',
  },
  SHOPPING_MALL: {
    label: 'Shoppings',
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'text-pink-600 bg-pink-50',
  },
  PARK_OR_GREEN_AREA: {
    label: 'Parques e Áreas Verdes',
    icon: <Trees className="w-4 h-4" />,
    color: 'text-green-600 bg-green-50',
  },
  HOSPITAL: {
    label: 'Hospitais',
    icon: <Hospital className="w-4 h-4" />,
    color: 'text-red-600 bg-red-50',
  },
};

export function PlacesNearby({ places }: PlacesNearbyProps) {
  if (!places || places.length === 0) {
    return null;
  }

  // Group places by type
  const placesByType = places.reduce(
    (acc, place) => {
      const type = place.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(place);
      return acc;
    },
    {} as Record<string, Place[]>
  );

  // Sort types by priority
  const sortedTypes = Object.keys(placesByType).sort((a, b) => {
    const priority = ['SHOPPING_MALL', 'HOSPITAL', 'SCHOOL', 'UNIVERSITY_OR_COLLEGE', 'PARK_OR_GREEN_AREA'];
    return priority.indexOf(a) - priority.indexOf(b);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          O que tem por perto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedTypes.map((type) => {
            const config = PLACE_TYPE_CONFIG[type] || {
              label: type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' '),
              icon: <MapPin className="w-4 h-4" />,
              color: 'text-gray-600 bg-gray-50',
            };

            const typePlaces = placesByType[type];

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>{config.icon}</div>
                  <h3 className="font-semibold text-sm">
                    {config.label} ({typePlaces.length})
                  </h3>
                </div>
                <ul className="space-y-2 ml-10">
                  {typePlaces.slice(0, 5).map((place, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {place.name}
                    </li>
                  ))}
                  {typePlaces.length > 5 && (
                    <li className="text-sm text-gray-400 italic">
                      + {typePlaces.length - 5} outros
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
