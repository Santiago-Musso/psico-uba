import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PsicoUBA — Planificador de cursadas",
  description: "Armá tu horario de cursada en la Facultad de Psicología de la UBA. Buscá tus materias, elegí tus comisiones y visualizá tu semana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
