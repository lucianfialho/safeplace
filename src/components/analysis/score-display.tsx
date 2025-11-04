import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendIndicator } from './trend-indicator';

interface ScoreDisplayProps {
  score: {
    overallScore: number;
    badge: {
      label: string;
      color: string;
      description: string;
    };
  };
  trend: {
    direction: 'IMPROVING' | 'STABLE' | 'WORSENING';
    percentage: number;
  };
}

export function ScoreDisplay({ score, trend }: ScoreDisplayProps) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-2xl font-semibold mb-2">Índice de Segurança</h2>
      <p className="text-sm text-gray-500 mb-6">Quanto maior, mais seguro</p>

      {/* Large Score */}
      <div className="mb-4">
        <div
          className={`text-7xl font-bold ${getScoreColor(score.overallScore)}`}
        >
          {score.overallScore}
        </div>
        <div className="text-gray-500">de 100</div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(
            score.overallScore
          )}`}
          style={{ width: `${score.overallScore}%` }}
        ></div>
      </div>

      {/* Badge */}
      <Badge
        variant={getBadgeVariant(score.badge.color)}
        className="text-lg px-4 py-2"
      >
        {score.badge.label}
      </Badge>

      <p className="text-gray-600 mt-4">{score.badge.description}</p>

      {/* Trend */}
      <div className="mt-6 flex justify-center">
        <TrendIndicator direction={trend.direction} percentage={trend.percentage} />
      </div>
    </Card>
  );
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getProgressBarColor(score: number): string {
  if (score >= 90) return 'bg-green-600';
  if (score >= 75) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getBadgeVariant(color: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (color.includes('green')) return 'default';
  if (color.includes('yellow')) return 'secondary';
  if (color.includes('red')) return 'destructive';
  return 'secondary';
}
