'use client'

import { useState } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { signIn } from 'next-auth/react'
import toast from 'react-hot-toast'

export default function SignInPage() {
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch {
      toast.error('Google sign in failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-surface">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="bg-brand rounded-xl p-2">
            <Zap size={22} className="text-[#0A0A0A] fill-[#0A0A0A]" />
          </div>
          <span className="text-3xl font-bold text-text-base">FinPath</span>
        </div>

        <div className="bg-surface-raised border border-border rounded-2xl p-8">
          <h1 className="text-xl font-bold text-text-base mb-1">Welcome back</h1>
          <p className="text-sm text-text-muted mb-7">Sign in to your AI finance dashboard</p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3.5 text-sm transition-all disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            {loading ? 'Redirecting to Google...' : 'Continue with Google'}
          </button>

          <p className="text-xs text-text-faint text-center mt-5 leading-relaxed">
            Redirects to Google for secure authentication.<br />
            No passwords stored.
          </p>
        </div>

        <div className="mt-5 p-4 bg-surface-raised border border-border rounded-xl">
          <p className="text-xs text-text-muted font-semibold mb-1">New user?</p>
          <p className="text-xs text-text-faint">Sign in with Google and you&apos;ll be guided through setup automatically.</p>
        </div>
      </div>
    </div>
  )
}
