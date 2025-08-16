import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upseller - AI Marketplace Assistant',
  description: 'AI assistant for Facebook Marketplace sellers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
