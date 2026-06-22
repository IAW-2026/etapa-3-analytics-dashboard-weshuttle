import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WeShuttle | Analytics Dashboard",
  description: "Dashboard de analíticas y reportes consolidados para el ecosistema de transporte WeShuttle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="es"
        className={`${inter.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

