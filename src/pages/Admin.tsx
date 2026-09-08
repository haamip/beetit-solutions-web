import {
  Bell,
  CalendarDays,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Users,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { siteConfig } from '../config/site'
import { formatNzDateTime, nzDateString } from '../lib/beetitApi'
import { useSeo } from '../lib/seo'
import { supabase } from '../lib/supabase'

type AdminProfile = {
  id: string
  email: string
  full_name: string | null
}

type Booking = {
  id: string
  full_name: string
  service: string
  start_at: string
  status: string
  consultation_type: string
}

type Notification = {
  id: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

type DashboardData = {
  bookings: Booking[]
  clientCount: number
  unreadInquiryCount: number
  upcomingCount: number
  notifications: Notification[]
}

export function Admin() {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loginSent, setLoginSent] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashboardError, setDashboardError] = useState('')
  const [loadingDashboard, setLoadingDashboard] = useState(false)

  useSeo({
    title: 'Admin',
    description: 'Secure Beet It Solutions administration area.',
    path: '/admin',
    noIndex: true,
  })

  const loadDashboard = useCallback(async () => {
    if (!supabase) return

    setLoadingDashboard(true)
    setDashboardError('')

    try {
      const now = new Date().toISOString()
      const [bookingsResult, clientsResult, inquiriesResult, upcomingResult, notificationsResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, full_name, service, start_at, status, consultation_type')
          .gte('start_at', now)
          .in('status', ['pending', 'confirmed', 'rescheduled'])
          .order('start_at', { ascending: true })
          .limit(12),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('contact_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'unread'),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .gte('start_at', now)
          .in('status', ['pending', 'confirmed', 'rescheduled']),
        supabase
          .from('admin_notifications')
          .select('id, title, body, read_at, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      const firstError = [
        bookingsResult.error,
        clientsResult.error,
        inquiriesResult.error,
        upcomingResult.error,
        notificationsResult.error,
      ].find(Boolean)

      if (firstError) throw firstError

      setDashboard({
        bookings: (bookingsResult.data ?? []) as Booking[],
        clientCount: clientsResult.count ?? 0,
        unreadInquiryCount: inquiriesResult.count ?? 0,
        upcomingCount: upcomingResult.count ?? 0,
        notifications: (notificationsResult.data ?? []) as Notification[],
      })
    } catch {
      setDashboardError('The dashboard could not be loaded. Please refresh and try again.')
    } finally {
      setLoadingDashboard(false)
    }
  }, [])

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
      setDashboard(null)
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

    setProfile(adminProfile as AdminProfile)
    setCheckingAuth(false)
  }, [])

  useEffect(() => {
    checkAdmin()

    if (!supabase) return
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAdmin()
    })

    return () => listener.subscription.unsubscribe()
  }, [checkAdmin])

  useEffect(() => {
    if (profile) loadDashboard()
  }, [profile, loadDashboard])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    setLoginSent(false)

    if (!supabase) {
      setLoginError('Supabase is not configured.')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: siteConfig.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/admin`,
        data: { full_name: 'Donna Pokere Phillips' },
      },
    })

    if (error) {
      setLoginError(error.message)
      return
    }

    setLoginSent(true)
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
    setDashboard(null)
  }

  if (checkingAuth) {
    return (
      <section className="page-section admin-page">
        <div className="admin-card admin-loading">
          <LoaderCircle className="spin" size={30} />
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
          <h1>Donna's dashboard</h1>
          <p>Admin access is restricted to Donna's approved Beet It Solutions email address.</p>

          <label className="admin-email-label">
            Admin email
            <input type="email" value={siteConfig.email} readOnly aria-readonly="true" />
          </label>

          {loginSent && (
            <div className="form-status success" role="status">
              Check {siteConfig.email} for the secure sign in link.
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

  const today = nzDateString()
  const todayBookings = dashboard?.bookings.filter((booking) => nzDateString(new Date(booking.start_at)) === today) ?? []

  return (
    <section className="admin-dashboard-section">
      <div className="container admin-dashboard">
        <div className="admin-dashboard-header">
          <div>
            <p className="eyebrow">Beet It Solutions</p>
            <h1>Kia ora, {profile.full_name?.split(' ')[0] ?? 'Donna'}.</h1>
            <p>Bookings, enquiries and client activity are now connected to the live Supabase database.</p>
          </div>
          <button className="button secondary" type="button" onClick={handleSignOut}>
            <LogOut size={17} /> Sign out
          </button>
        </div>

        {dashboardError && <div className="form-status error">{dashboardError}</div>}

        <div className="dashboard-stat-grid">
          <article className="dashboard-stat">
            <CalendarDays size={22} />
            <span>Today's bookings</span>
            <strong>{todayBookings.length}</strong>
          </article>
          <article className="dashboard-stat">
            <CalendarDays size={22} />
            <span>Upcoming bookings</span>
            <strong>{dashboard?.upcomingCount ?? 0}</strong>
          </article>
          <article className="dashboard-stat">
            <Inbox size={22} />
            <span>New enquiries</span>
            <strong>{dashboard?.unreadInquiryCount ?? 0}</strong>
          </article>
          <article className="dashboard-stat">
            <Users size={22} />
            <span>Total clients</span>
            <strong>{dashboard?.clientCount ?? 0}</strong>
          </article>
        </div>

        {loadingDashboard ? (
          <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Loading dashboard…</div>
        ) : (
          <div className="dashboard-grid">
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="eyebrow">Calendar</p>
                  <h2>Upcoming bookings</h2>
                </div>
                <button className="text-button" type="button" onClick={loadDashboard}>Refresh</button>
              </div>

              {dashboard?.bookings.length ? (
                <div className="booking-list">
                  {dashboard.bookings.map((booking) => (
                    <article className="booking-list-item" key={booking.id}>
                      <div>
                        <strong>{booking.full_name}</strong>
                        <span>{booking.service}</span>
                      </div>
                      <div className="booking-list-meta">
                        <strong>{formatNzDateTime(booking.start_at)}</strong>
                        <span>{booking.consultation_type} · {booking.status}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No upcoming bookings yet.</p>
              )}
            </section>

            <aside className="dashboard-panel notifications-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="eyebrow">Activity</p>
                  <h2>Notifications</h2>
                </div>
                <Bell size={21} />
              </div>

              {dashboard?.notifications.length ? (
                <div className="notification-list">
                  {dashboard.notifications.map((notification) => (
                    <article className={notification.read_at ? 'notification-item' : 'notification-item unread'} key={notification.id}>
                      <strong>{notification.title}</strong>
                      {notification.body && <p>{notification.body}</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <p>No notifications yet.</p>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}
