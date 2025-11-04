'use client';

import { Button } from '@/components/ui/button';

export function CallToAction() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="bg-blue-600 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Pronto para Avaliar Seu Futuro Lar?
        </h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
          Tome decisões mais informadas com dados de segurança em tempo real.
        </p>
        <Button
          size="lg"
          onClick={scrollToTop}
          className="bg-white text-blue-600 hover:bg-gray-100"
        >
          Analisar Agora
        </Button>
      </div>
    </section>
  );
}
