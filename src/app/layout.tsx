import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Ball Battle — 9:16 video generator',
  description:
    'Seeded ball fights in a circle, rendered as vertical 1080×1920 video with a soundtrack synthesised from the collisions. Everything is generated: no footage, no samples.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
