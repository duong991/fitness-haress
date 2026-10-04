import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Fitness Harness | Theo Dõi Gym, Calo & Adaptive TDEE',
  description: 'Hệ thống theo dõi thể hình và dinh dưỡng JSON-first, tối ưu cho AI Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-background text-zinc-100 antialiased selection:bg-neon-lime selection:text-black">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
