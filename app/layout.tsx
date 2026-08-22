import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/context/auth-context'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'TeachFlow — Trợ lý giáo viên',
  description: 'Không gian làm việc thông minh dành cho giáo viên tiểu học.',
  generator: 'TeachFlow',

  icons: {
    icon: '/apple-icon.png',
    shortcut: '/apple-icon.png',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="bg-slate-50">
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
