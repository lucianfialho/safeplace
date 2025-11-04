import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  direction: 'IMPROVING' | 'STABLE' | 'WORSENING';
  percentage: number;
}

export function TrendIndicator({ direction, percentage }: TrendIndicatorProps) {
  const config = {
    IMPROVING: {
      icon: TrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      text: 'Melhorando',
    },
    STABLE: {
      icon: Minus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      text: 'Estável',
    },
    WORSENING: {
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      text: 'Piorando',
    },
  };

  const { icon: Icon, color, bgColor, text } = config[direction];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${bgColor}`}>
      <Icon className={`h-5 w-5 ${color}`} />
      <span className={`font-medium ${color}`}>
        {text} ({Math.abs(percentage).toFixed(1)}%)
      </span>
    </div>
  );
}
