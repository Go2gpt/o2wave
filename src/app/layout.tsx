import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieNotice from "@/components/CookieNotice";

export const metadata: Metadata = {
  title: "o²Wave — Contenido para redes en segundos",
  description: "Genera contenido para redes sociales con IA. Diseñado para ONGs y PYMEs.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "o2Wave",
    statusBarStyle: "black-translucent",
  },
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
      <body className="min-h-screen" style={{ backgroundColor: "#0F0F0F", fontFamily: "Montserrat, sans-serif" }}>
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
