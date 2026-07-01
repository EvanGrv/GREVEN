import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_JP, Noto_Serif_JP, Playfair_Display } from 'next/font/google';
import { NeuralBackdrop } from '@/scenes/NeuralCanvas/NeuralBackdrop';
import '@/styles/globals.css';

// High-contrast display serif for the GREVEN wordmark and Latin headings.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

// Kept for Japanese glyphs (kanji headings).
const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-serif-jp',
  display: 'swap',
});

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GREVEN — AI Research Portfolio',
    template: '%s — GREVEN',
  },
  description:
    'Portfolio de recherche d’Evan Greven consacré au Machine Learning, aux réseaux de neurones, au Reinforcement Learning et aux systèmes d’intelligence artificielle.',
  authors: [{ name: 'Evan Greven' }],
  keywords: [
    'Machine Learning',
    'Reinforcement Learning',
    'réseaux de neurones',
    'recherche IA',
    'Evan Greven',
    'portfolio',
  ],
  openGraph: {
    type: 'website',
    title: 'GREVEN — AI Research Portfolio',
    description:
      'Une exploration à l’intérieur d’un réseau de neurones : recherche en Machine Learning et intelligence artificielle.',
    siteName: 'GREVEN',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GREVEN — AI Research Portfolio',
    description:
      'Portfolio de recherche d’Evan Greven — Machine Learning, réseaux de neurones et IA.',
  },
};

export const viewport: Viewport = {
  themeColor: '#24261e',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${playfair.variable} ${notoSerifJp.variable} ${notoSansJp.variable} ${inter.variable}`}
    >
      <body>
        <a href="#content" className="sr-only">
          Aller au contenu principal
        </a>
        <NeuralBackdrop />
        <div className="content-layer">{children}</div>
      </body>
    </html>
  );
}
