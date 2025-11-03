import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafePlace - Análise de Segurança para Imóveis",
  description: "Score de segurança em tempo real para imóveis no Rio de Janeiro, baseado em dados públicos de incidentes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
