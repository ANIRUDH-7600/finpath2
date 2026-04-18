'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Receipt, Target, TrendingUp, Zap, LogOut, LineChart, ShoppingBag, Sparkles, Repeat2 } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/transactions', label: 'Expenses', icon: Receipt },
  { href: '/portfolio', label: 'Portfolio', icon: TrendingUp },
  { href: '/investments', label: 'Investments', icon: LineChart },
  { href: '/recommendations', label: 'Smart Buy', icon: ShoppingBag },
  { href: '/autopilot', label: 'Autopilot', icon: Sparkles },
  { href: '/cashflow', label: 'Cash Flow', icon: Repeat2 },
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
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-surface border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <Zap size={14} className="text-[#060606] fill-[#060606]" />
        </div>
        <span className="text-base font-bold tracking-tight text-text-base">FinPath</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 pb-4 space-y-0.5">
        <p className="px-3 pb-2 pt-1 text-[11px] font-bold tracking-widest uppercase text-text-faint">Menu</p>
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? 'text-brand bg-brand/[0.08]'
                  : 'text-text-muted hover:text-text-base hover:bg-surface-raised'
              }`}
            >
              <Icon size={16} className={active ? 'text-brand' : 'text-text-faint group-hover:text-text-muted'} />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-text-muted font-bold tracking-widest uppercase">Theme</span>
          <ThemeToggle />
        </div>

        {session?.user && (
          <div className="flex items-center gap-2.5 px-1">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ''}
                width={28}
                height={28}
                className="rounded-full ring-1 ring-border"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand/15 flex items-center justify-center shrink-0 ring-1 ring-brand/20">
                <span className="text-brand text-xs font-bold">
                  {(session.user.name ?? 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-text-base truncate leading-tight">{session.user.name}</p>
              <p className="text-[11px] text-text-muted truncate leading-tight">{session.user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-text-faint hover:text-red-400 transition-colors shrink-0 p-1"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
