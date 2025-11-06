'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface LoadingStep {
  id: string;
  label: string;
  duration: number; // ms
}

const STEPS: LoadingStep[] = [
  { id: 'extract', label: 'Extraindo dados do imóvel', duration: 1000 },
  { id: 'location', label: 'Localizando endereço', duration: 800 },
  { id: 'incidents', label: 'Buscando incidentes na região', duration: 1500 },
  { id: 'calculate', label: 'Calculando score de segurança', duration: 1200 },
  { id: 'finalize', label: 'Finalizando análise', duration: 500 },
];

export function AnalysisLoading() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStep >= STEPS.length) return;

    const step = STEPS[currentStep];
    const startTime = Date.now();

    // Animate progress bar
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const stepProgress = Math.min((elapsed / step.duration) * 100, 100);
      setProgress(stepProgress);

      if (stepProgress >= 100) {
        clearInterval(progressInterval);
        // Move to next step after a small delay
        setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
          setProgress(0);
        }, 200);
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStep]);

  const totalProgress = ((currentStep / STEPS.length) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Analisando imóvel</h2>
          <p className="text-gray-600 text-sm">Isso pode levar alguns segundos...</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progresso</span>
            <span className="font-semibold">{totalProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isPending ? 'opacity-40' : 'opacity-100'
                }`}
              >
                {isCompleted && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                {isCurrent && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                )}
                {isPending && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}

                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      isCompleted
                        ? 'text-gray-700 line-through'
                        : isCurrent
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </p>

                  {/* Progress bar for current step */}
                  {isCurrent && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-900">
            <span className="font-semibold">💡 Dica:</span> Estamos analisando dados reais do ISP dos últimos 90 dias para garantir precisão.
          </p>
        </div>
      </Card>
    </div>
  );
}
