'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector do elemento a destacar
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface ProductTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

export function ProductTour({ steps, isOpen, onClose }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (!isOpen) return;

    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setTargetElement(element);

        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Calculate tooltip position
        const rect = element.getBoundingClientRect();
        const position = step.position || 'bottom';

        let top = 0;
        let left = 0;

        switch (position) {
          case 'bottom':
            top = rect.bottom + window.scrollY + 20;
            left = rect.left + window.scrollX + rect.width / 2;
            break;
          case 'top':
            top = rect.top + window.scrollY - 20;
            left = rect.left + window.scrollX + rect.width / 2;
            break;
          case 'left':
            top = rect.top + window.scrollY + rect.height / 2;
            left = rect.left + window.scrollX - 20;
            break;
          case 'right':
            top = rect.top + window.scrollY + rect.height / 2;
            left = rect.right + window.scrollX + 20;
            break;
          case 'center':
            top = window.innerHeight / 2 + window.scrollY;
            left = window.innerWidth / 2 + window.scrollX;
            break;
        }

        setTooltipPosition({ top, left });
      }
    } else {
      setTargetElement(null);
    }
  }, [currentStep, step, isOpen]);

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={handleClose} />

      {/* Spotlight on target element */}
      {targetElement && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top + window.scrollY - 8,
            left: targetElement.getBoundingClientRect().left + window.scrollX - 8,
            width: targetElement.offsetWidth + 16,
            height: targetElement.offsetHeight + 16,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
          }}
        />
      )}

      {/* Tooltip */}
      <Card
        className="fixed z-50 p-6 max-w-md shadow-2xl"
        style={{
          top: step.target ? tooltipPosition.top : '50%',
          left: step.target ? tooltipPosition.left : '50%',
          transform: step.target
            ? 'translateX(-50%)'
            : 'translate(-50%, -50%)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              {currentStep + 1} de {steps.length}
            </span>
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900">{step.title}</h3>
          <p className="text-gray-600">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext} className="gap-2">
            {isLastStep ? 'Concluir' : 'Próximo'}
            {!isLastStep && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    </>
  );
}
