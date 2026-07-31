import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces", weight: ["400", "500", "600"] });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Syn - Synthetic Focus Groups",
  description: "Multi-persona focus groups for Worqshop"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {/* etracker analytics + consent manager (data-block-cookies: cookieless bis Einwilligung) */}
        <Script
          id="_etLoader"
          src="https://code.etracker.com/code/e.js"
          strategy="afterInteractive"
          data-block-cookies="true"
          data-secure-code="Lr3tVb"
          charSet="UTF-8"
        />
      </body>
    </html>
  );
}
