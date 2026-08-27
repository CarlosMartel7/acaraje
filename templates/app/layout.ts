import type { Metadata } from "next";
import { DM_Mono, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Acaraje Admin",
  description: "Simple and quick admin panel for Prisma apps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.log("test");

  return (
    <html lang= "en" className = { cn("dark", "font-sans", geist.variable) } >
      <body className={ `${geist.variable} ${mono.variable} font-sans antialiased` }>
        <QueryProvider>
        <Toaster />
  { children }
  </QueryProvider>
    </body>
    </html>
  );
}
