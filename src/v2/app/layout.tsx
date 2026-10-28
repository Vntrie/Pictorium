import type { Metadata } from "next";
import "@/v2/styles/design-tokens.css";

export const metadata: Metadata = {
  title: "FlameForge 2.0 | Cinematic",
  description: "The immersive cinematic poster studio.",
};

export default function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <main className="relative w-full h-screen overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
