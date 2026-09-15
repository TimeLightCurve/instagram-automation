import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (deploymentHost ? `https://${deploymentHost}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Orbit IG — Instagram Operations',
  description: 'Plan content, manage approvals, and run safe Instagram workflows from one focused workspace.',
  openGraph: {
    title: 'Orbit IG — Instagram Operations',
    description: 'Plan. Approve. Automate safely.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Orbit IG' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orbit IG — Instagram Operations',
    description: 'Plan. Approve. Automate safely.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
