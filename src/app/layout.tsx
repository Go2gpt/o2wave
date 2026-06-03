import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "o²Wave — Generador de contenido para ONGs y PYMEs",
  description: "Genera contenido para redes sociales con IA, optimizado para organizaciones sin fines de lucro y pequeñas empresas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: "var(--background)" }}>
        <Header />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
