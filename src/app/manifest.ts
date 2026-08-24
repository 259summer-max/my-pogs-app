import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POGS Life Dashboard',
    short_name: 'POGS',
    description: 'Purpose, Objectives, Goals, Standards Dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}