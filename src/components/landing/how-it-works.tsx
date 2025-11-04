export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Cole a URL',
      description: 'Copie o link do imóvel do Quinto Andar',
      icon: '🔗',
    },
    {
      number: 2,
      title: 'Análise Automática',
      description: 'Analisamos incidentes em um raio de até 2km',
      icon: '📊',
    },
    {
      number: 3,
      title: 'Score de Segurança',
      description: 'Receba um score de 0-100 com estatísticas detalhadas',
      icon: '✅',
    },
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Como Funciona
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-5xl mb-4">{step.icon}</div>
              <div className="text-sm text-gray-500 mb-2">
                Passo {step.number}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
