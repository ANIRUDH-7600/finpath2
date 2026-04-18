// app/layout.tsx
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import AuthProvider from '@/components/AuthProvider'
import ThemeProvider from '@/components/ThemeProvider'
import Sidebar from '@/components/Sidebar'
import { FinanceChat } from '@/components/FinanceGPT'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinPath — AI Personal Finance',
  description: 'AI-powered personal finance for ambitious Indians',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface text-text-base font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 min-h-screen overflow-auto">
                {children}
              </main>
            </div>
            <FinanceChat />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: 10,
                  fontSize: 13,
                  fontFamily: 'Satoshi, system-ui, sans-serif',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-base)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}