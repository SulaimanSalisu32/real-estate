import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Haven — Find a place to call home',
  description:
    'Thoughtfully selected homes, apartments, and land from local real-estate agents.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
