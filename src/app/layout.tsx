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
  // SVG 이미지를 Data URI로 직접 렌더링 (사파리가 아이콘을 100% 읽어오도록 강제)
  const svgIcon = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="112" fill="#312e81"/>
      <circle cx="256" cy="256" r="192" fill="none" stroke="#6366f1" stroke-width="20"/>
      <path d="M256 64 L256 96 M256 448 L256 416 M64 256 L96 256 M448 256 L416 256" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
      <polygon points="256,102 215,256 297,256" fill="#f43f5e"/>
      <polygon points="256,410 215,256 297,256" fill="#e0e7ff"/>
      <circle cx="256" cy="256" r="32" fill="#ffffff"/>
    </svg>
  `);
  
  const iconUrl = `data:image/svg+xml;charset=utf-8,${svgIcon}`;

  return (
    <html lang="ko">
      <head>
        <link rel="icon" type="image/svg+xml" href={iconUrl} />
        <link rel="apple-touch-icon" href={iconUrl} />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900 select-none">
        {children}
      </body>
    </html>
  );
}