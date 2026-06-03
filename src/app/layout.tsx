import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "o²Wave — Contenido para redes en segundos",
  description: "Genera contenido para redes sociales con IA. Diseñado para ONGs y PYMEs.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F0F0F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen" style={{ background: "var(--bg)", fontFamily: "Montserrat, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
