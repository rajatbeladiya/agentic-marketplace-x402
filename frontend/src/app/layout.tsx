import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "x402 Agentic Marketplace | Connect Your Shopify Store to AI Agents",
  description:
    "Make your Shopify products discoverable by AI agents. Enable automated purchases with secure blockchain payments on Movement Network.",
  keywords: [
    "Shopify",
    "AI agents",
    "x402",
    "Movement blockchain",
    "agentic commerce",
    "crypto payments",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
