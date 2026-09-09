import { Bell, CalendarDays, Inbox, LoaderCircle, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { formatNzDateTime, nzDateString } from '../../lib/beetitApi'
import { supabase } from '../../lib/supabase'

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

export function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [clearingNotifications, setClearingNotifications] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError('')

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
      setError('The dashboard could not be loaded. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboard()
    })
  }, [loadDashboard])

  async function clearNotifications() {
    if (!supabase || !dashboard?.notifications.length || clearingNotifications) return
    if (!window.confirm('Clear all admin notifications? This removes them from the activity list.')) return

    setClearingNotifications(true)
    setError('')
    setNotice('')

    const { error: deleteError } = await supabase
      .from('admin_notifications')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00.000Z')

    if (deleteError) {
      setError('Notifications could not be cleared.')
    } else {
      setDashboard((current) => current ? { ...current, notifications: [] } : current)
      setNotice('Notifications cleared.')
    }

    setClearingNotifications(false)
  }

  const today = nzDateString()
  const todayBookings = dashboard?.bookings.filter((booking) => nzDateString(new Date(booking.start_at)) === today) ?? []

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p>Bookings, enquiries and client activity from the live Beet It database.</p>
        </div>
        <button className="button secondary" type="button" onClick={loadDashboard}>Refresh</button>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

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

      {loading ? (
        <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Loading dashboard…</div>
      ) : (
        <div className="dashboard-grid">
          <section className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="eyebrow">Calendar</p>
                <h2>Upcoming bookings</h2>
              </div>
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
              {dashboard?.notifications.length ? (
                <button className="text-button" type="button" onClick={() => void clearNotifications()} disabled={clearingNotifications}>
                  {clearingNotifications ? 'Clearing…' : 'Clear all'}
                </button>
              ) : (
                <Bell size={21} />
              )}
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
    </>
  )
}
