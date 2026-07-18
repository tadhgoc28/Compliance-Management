import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Complyra — Compliance Management Platform",
    template: "%s · Complyra",
  },
  description:
    "Central platform for asset compliance: registers, inspections, findings, documents and mapping across multiple compliance disciplines.",
};

/**
 * Applies the stored theme before first paint. Inline and blocking on purpose:
 * doing this in a useEffect means a white flash on every load for dark-theme
 * users.
 */
const THEME_SCRIPT = `
try {
  var stored = localStorage.getItem('theme');
  var dark = stored ? stored === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${inter.variable} min-h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
