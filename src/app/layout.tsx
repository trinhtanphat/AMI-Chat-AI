import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'VNSO Chat AI',
  description: 'HQG VNSO - Trợ lý AI thông minh',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Script src="/libs/live2d.min.js" strategy="beforeInteractive" />
        <Script src="/libs/live2dcubismcore.min.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
