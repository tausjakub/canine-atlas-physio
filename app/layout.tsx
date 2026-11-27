import type { Metadata, Viewport } from 'next';
import './globals.css';
import './theme-palette.css';
import './theme-ui.css';
import './responsive.css';
import { sitePath } from './site-path';
export const metadata: Metadata = {
  manifest: sitePath('/manifest.webmanifest'),
  title: 'Canine Atlas · Anatomy for movement',
  description:
    'Explore canine bones and muscles in 3D and study movement anatomy for canine physiotherapy.',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e1720',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
