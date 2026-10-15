import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VVOS Media Test",
  description: "Prototype for independent vehicle media modules",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
