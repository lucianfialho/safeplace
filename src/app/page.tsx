export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          SafePlace
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Análise de Segurança para Imóveis
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-bold">✅ Projeto inicializado com sucesso!</p>
          <p className="text-sm mt-2">Next.js 15 + TypeScript + Tailwind CSS</p>
        </div>
      </div>
    </main>
  );
}
