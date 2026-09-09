import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSeo } from '../lib/seo'
import { supabase } from '../lib/supabase'

type AdminProfile = {
  id: string
  email: string
  full_name: string | null
}

const authorisedAdmins = {
  'haami@haktindustries.co.nz': 'Haami Phillips',
  'beetit.solutions@gmail.com': 'Donna Pokere Phillips',
} as const

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/clients', label: 'Clients', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function Admin() {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loginEmail, setLoginEmail] = useState('haami@haktindustries.co.nz')
  const [loginSent, setLoginSent] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  useSeo({
    title: 'Admin',
    description: 'Secure Beet It Solutions administration area.',
    path: '/admin',
    noIndex: true,
  })

  const checkAdmin = useCallback(async () => {
    if (!supabase) {
      setCheckingAuth(false)
      setLoginError('Supabase environment variables are not available in this deployment.')
      return
    }

    const { data } = await supabase.auth.getSession()
    const user = data.session?.user

    if (!user) {
      setProfile(null)
      setCheckingAuth(false)
      return
    }

    const { data: adminProfile, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !adminProfile) {
      await supabase.auth.signOut()
      setProfile(null)
      setLoginError('This account is not authorised for the Beet It Solutions admin area.')
      setCheckingAuth(false)
      return
    }

    window.localStorage.removeItem('beetit_admin_login_pending')
    setProfile(adminProfile as AdminProfile)
    setCheckingAuth(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void checkAdmin()
    })

    if (!supabase) return
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void checkAdmin()
    })

    return () => listener.subscription.unsubscribe()
  }, [checkAdmin])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    setLoginSent(false)

    if (!supabase) {
      setLoginError('Supabase is not configured.')
      return
    }

    const normalizedEmail = loginEmail.trim().toLowerCase()
    const fullName = authorisedAdmins[normalizedEmail as keyof typeof authorisedAdmins]

    if (!fullName) {
      setLoginError('That email address is not approved for admin access.')
      return
    }

    window.localStorage.setItem('beetit_admin_login_pending', '1')

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/admin`,
        data: { full_name: fullName },
      },
    })

    if (error) {
      window.localStorage.removeItem('beetit_admin_login_pending')
      setLoginError(error.message)
      return
    }

    setLoginEmail(normalizedEmail)
    setLoginSent(true)
  }

  async function handleSignOut() {
    if (!supabase) return
    window.localStorage.removeItem('beetit_admin_login_pending')
    await supabase.auth.signOut()
    setProfile(null)
  }

  if (checkingAuth) {
    return (
      <section className="page-section admin-page">
        <div className="admin-card admin-loading">
          <LockKeyhole size={30} />
          <p>Checking secure access…</p>
        </div>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="page-section admin-page">
        <form className="admin-card" onSubmit={handleLogin}>
          <LockKeyhole size={30} />
          <p className="eyebrow">Secure admin</p>
          <h1>Admin dashboard</h1>
          <p>Sign in with an approved Beet It Solutions or HAKT Industries admin email address.</p>

          <label className="admin-email-label">
            Admin email
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {loginSent && (
            <div className="form-status success" role="status">
              Check {loginEmail} for the secure sign in link.
            </div>
          )}
          {loginError && <div className="form-status error" role="alert">{loginError}</div>}

          <button className="button primary full-width" type="submit">
            Email secure sign in link
          </button>
        </form>
      </section>
    )
  }

  return (
    <div className="admin-shell">
      <aside className={navOpen ? 'admin-sidebar open' : 'admin-sidebar'}>
        <div className="admin-brand">
          <div className="brand-mark">B</div>
          <div>
            <strong>Beet It Solutions</strong>
            <span>Secure Administration</span>
          </div>
          <button className="admin-nav-close" type="button" aria-label="Close admin navigation" onClick={() => setNavOpen(false)}>
            <X size={21} />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {adminNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setNavOpen(false)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <span>Signed in as</span>
          <strong>{profile.full_name ?? profile.email}</strong>
          <button type="button" onClick={handleSignOut}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      {navOpen && <button className="admin-nav-backdrop" type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}

      <div className="admin-main">
        <header className="admin-mobile-header">
          <button type="button" aria-label="Open admin navigation" onClick={() => setNavOpen(true)}>
            <Menu size={22} />
          </button>
          <strong>Beet It Admin</strong>
        </header>
        <main className="admin-content">
          <Outlet context={{ profile }} />
        </main>
      </div>
    </div>
  )
}
