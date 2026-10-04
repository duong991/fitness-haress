import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import LayoutShell from '@/components/LayoutShell';

/**
 * One family carries the whole product, exactly as DESIGN-notion.md specifies.
 * Inter is self-hosted through next/font (never a <link> to a font CDN), and
 * the negative display tracking is applied explicitly per token because Inter
 * at default tracking reads looser than Notion's tuned cut.
 */
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Fitness Harness | Nhật ký tập luyện & dinh dưỡng',
  description:
    'Hệ thống ghi chép tập gym, dinh dưỡng và Adaptive TDEE. JSON là cơ sở dữ liệu, Agent là runtime.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* lang="en" is deliberate: the product is written in Vietnamese, but the
       browser formats <input type="number"> using the document language, which
       turns 71.6 into "71,6". Numeric entry stays dot-decimal and consistent
       with the JSON store; all human copy remains Vietnamese. */
    <html lang="en" className={inter.variable}>
      <body className="min-h-[100dvh] bg-canvas font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:r-utility focus:bg-primary focus:px-4 focus:py-2 focus:text-body-sm focus:text-white"
        >
          Bỏ qua tới nội dung chính
        </a>
        <LayoutShell>
          <div id="main">{children}</div>
        </LayoutShell>
      </body>
    </html>
  );
}
