import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#312e81',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'POGS',
  description: 'Personal Objectives & Goals System',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POGS',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-slate-50 text-slate-900 select-none">
        {children}
      </body>
    </html>
  );
}