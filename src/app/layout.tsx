import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieNotice from "@/components/CookieNotice";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.o2wave.app"),
  title: "o²Wave — La IA que no se nota",
  description: "La IA que no se nota. Tu community manager personal.",
  manifest: "/manifest.json",
  openGraph: {
    title: "o2Wave — La IA que no se nota",
    description: "La IA que no se nota. Tu community manager personal. Para ONGs y pequeñas empresas.",
    url: "https://www.o2wave.app/",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "o2Wave — La IA que no se nota",
    description: "La IA que no se nota. Tu community manager personal.",
    images: ["/og-image.png"],
  },
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
