import { Shield, Database, Calculator, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Sobre o SafePlace - Análise de Segurança para Imóveis no RJ',
  description:
    'Conheça o SafePlace, plataforma que fornece análise objetiva de segurança para imóveis no Rio de Janeiro baseada em dados públicos do OTT.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Sobre o SafePlace</h1>
          <p className="text-xl text-gray-600">
            Informações transparentes sobre segurança para ajudar você a escolher onde morar
          </p>
        </div>

        {/* Nossa Missão */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-4">Nossa Missão</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Ajudar pessoas a tomar decisões informadas sobre onde morar no Rio de Janeiro,
                fornecendo dados objetivos de segurança baseados em fontes públicas e confiáveis.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Acreditamos que todos têm o direito de acessar informações claras sobre a
                segurança de seu futuro lar, sem precisar depender apenas de boatos ou
                percepções subjetivas.
              </p>
            </div>
          </div>
        </section>

        {/* Fonte de Dados */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-4">Fonte de Dados</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Nossos dados vêm do{' '}
                <a
                  href="https://instagram.com/ott.rj"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  OTT (Onde Tem Tiroteio)
                </a>
                , um aplicativo colaborativo que monitora incidentes de segurança no Rio de
                Janeiro em tempo real.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                O OTT coleta informações sobre tiroteios, disparos de arma de fogo, incêndios,
                operações policiais e outros eventos relacionados à segurança pública,
                georreferenciando cada ocorrência.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                <p className="text-sm text-blue-900">
                  <strong>Atualização:</strong> Os dados são atualizados automaticamente a cada
                  minuto, garantindo informações sempre recentes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Metodologia */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-4">Metodologia de Cálculo</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                O <strong>Score de Segurança (0-100)</strong> é calculado através de um algoritmo
                que considera múltiplos fatores:
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. Análise por Raio</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>
                      <strong>500 metros:</strong> Raio imediato (peso 1.0)
                    </li>
                    <li>
                      <strong>1 quilômetro:</strong> Raio próximo (peso 0.6)
                    </li>
                    <li>
                      <strong>2 quilômetros:</strong> Raio estendido (peso 0.3)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Análise Temporal</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>
                      <strong>Últimos 30 dias:</strong> Período mais recente (peso 1.0)
                    </li>
                    <li>
                      <strong>Últimos 90 dias:</strong> Período médio (peso 0.6)
                    </li>
                    <li>
                      <strong>Último ano:</strong> Período histórico (peso 0.3)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    3. Gravidade do Incidente
                  </h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>
                      <strong>Tiroteio:</strong> Gravidade 10 (mais grave)
                    </li>
                    <li>
                      <strong>Incêndio:</strong> Gravidade 6
                    </li>
                    <li>
                      <strong>Disparos ouvidos:</strong> Gravidade 5
                    </li>
                    <li>
                      <strong>Outros incidentes:</strong> Gravidade variável
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. Análise Comparativa</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Comparação com a média do bairro</li>
                    <li>Comparação com a média da cidade</li>
                    <li>Ranking percentil entre todas as análises</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">5. Tendência</h3>
                  <p className="text-gray-700">
                    Análise se a região está melhorando, estável ou piorando baseado na
                    comparação entre períodos recentes e históricos.
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mt-6">
                <p className="text-sm text-purple-900">
                  <strong>Score mais alto = Local mais seguro</strong>
                  <br />
                  90-100: Excelente • 75-89: Bom • 60-74: Razoável • 40-59: Preocupante • 0-39:
                  Crítico
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Aviso Legal */}
        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-yellow-900">Aviso Legal</h2>
              <div className="space-y-3 text-yellow-900">
                <p className="leading-relaxed">
                  <strong>Os dados são fornecidos apenas para fins informativos.</strong> O
                  SafePlace não garante a precisão completa dos dados e não se responsabiliza por
                  decisões tomadas com base nessas informações.
                </p>
                <p className="leading-relaxed">
                  A segurança de uma região pode variar significativamente ao longo do tempo e
                  entre diferentes horários do dia. Este score representa apenas uma análise
                  baseada em dados históricos disponíveis publicamente.
                </p>
                <p className="leading-relaxed">
                  Recomendamos que você visite a região pessoalmente, converse com moradores
                  locais e consulte outras fontes de informação antes de tomar qualquer decisão.
                </p>
                <p className="leading-relaxed font-semibold">
                  Este serviço não substitui sua própria pesquisa e avaliação pessoal.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contato */}
        <section className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Fale Conosco</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            Tem dúvidas, sugestões ou encontrou algum problema? Entre em contato conosco:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contato@safeplace.app"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enviar Email
            </a>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Voltar para Home
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
