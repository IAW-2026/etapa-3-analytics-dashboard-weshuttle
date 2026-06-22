import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
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
        className={`${plusJakartaSans.variable} h-full antialiased`}
      >
        <head>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
        </head>
        <body className="min-h-full flex flex-col font-sans bg-[#11131b] text-slate-100">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

