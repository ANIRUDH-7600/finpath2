import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import AuthProvider from '@/components/AuthProvider'
import ThemeProvider from '@/components/ThemeProvider'
import Sidebar from '@/components/Sidebar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FinPath — AI Personal Finance',
  description: 'AI-powered personal finance for ambitious Indians',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-surface text-text-base`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 min-h-screen overflow-auto">
                {children}
              </main>
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: 12,
                  fontSize: 14,
                  fontFamily: inter.style.fontFamily,
                  background: 'var(--surface-raised)',
                  color: 'var(--text-base)',
                  border: '1px solid var(--border)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
