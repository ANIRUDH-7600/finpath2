'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Receipt, Target, TrendingUp, Zap, LogOut, LineChart } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/transactions', label: 'Expenses', icon: Receipt },
  { href: '/portfolio', label: 'Portfolio', icon: TrendingUp },
  { href: '/investments', label: 'Investments', icon: LineChart },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const isAuthPage = pathname.startsWith('/auth') || pathname === '/' || pathname === '/onboarding'
  if (isAuthPage) return null

  async function handleSignOut() {
    localStorage.removeItem('finpath_user')
    localStorage.removeItem('finpath_portfolio')
    await signOut({ redirect: false })
    router.replace('/')
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-surface-raised border-r border-border shrink-0">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-border">
        <div className="bg-brand rounded-xl p-1.5">
          <Zap size={18} className="text-[#0A0A0A] fill-[#0A0A0A]" />
        </div>
        <span className="text-xl font-bold text-text-base">FinPath</span>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-brand-muted text-brand border border-brand/20'
                  : 'text-text-muted hover:bg-surface hover:text-text-base'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-faint font-medium uppercase tracking-wider">Theme</span>
          <ThemeToggle />
        </div>

        {session?.user && (
          <div className="flex items-center gap-3 px-1 py-1">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ''}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-brand/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                <span className="text-brand text-sm font-bold">
                  {(session.user.name ?? 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-base truncate">{session.user.name}</p>
              <p className="text-xs text-text-faint truncate">{session.user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-text-faint hover:text-red-400 transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
