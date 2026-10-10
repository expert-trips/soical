import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'بوابة السفر المؤسسي | خبراء الرحلات',
  description: 'منصة تشغيل السفر المؤسسي الداخلية لخبراء الرحلات',
  openGraph: {
    title: 'بوابة السفر المؤسسي | خبراء الرحلات',
    description: 'تشغيل موحّد لكل خدمات السفر المؤسسي',
    images: [{ url: '/og.png', width: 1792, height: 1024, alt: 'بوابة السفر المؤسسي من خبراء الرحلات' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'بوابة السفر المؤسسي | خبراء الرحلات',
    description: 'تشغيل موحّد لكل خدمات السفر المؤسسي',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
