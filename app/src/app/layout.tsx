import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SynWeb",
  description: "Synthetic focus groups — web interface"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
