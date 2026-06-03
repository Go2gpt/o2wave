import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "o²Wave — Genera contenido para redes sociales",
  description:
    "Herramienta de generación de contenido para redes sociales dirigida a ONGs y PYMEs. Potenciado por Claude AI.",
  keywords: ["redes sociales", "ONG", "PYME", "contenido", "IA", "Claude"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className={`${montserrat.variable} font-montserrat antialiased`} style={{ backgroundColor: "#f3f4f6" }}>
        {children}
      </body>
    </html>
  );
}
