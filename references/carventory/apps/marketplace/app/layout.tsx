import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Carventory - Premium Used Car Marketplace',
  description: 'Discover premium used cars from trusted dealers. Modern, elegant car marketplace with the best selection, transparent pricing, and exceptional service.',
  keywords: 'used cars, car marketplace, premium cars, auto dealer, car sales, verified dealers, car buying',
  authors: [{ name: 'Carventory Team' }],
  creator: 'Carventory',
  publisher: 'Carventory',
  openGraph: {
    title: 'Carventory - Premium Used Car Marketplace',
    description: 'Discover premium used cars from trusted dealers with transparent pricing and quality assurance.',
    url: 'https://carventory.com',
    siteName: 'Carventory',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Carventory - Premium Used Car Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carventory - Premium Used Car Marketplace',
    description: 'Discover premium used cars from trusted dealers',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}