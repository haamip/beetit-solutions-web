import { CalendarDays, Check, Clock3, LoaderCircle, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNzDateTime } from '../../lib/beetitApi'
import { supabase } from '../../lib/supabase'

type BookingStatus = 'pending' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed'

type Booking = {
  id: string
  client_id: string | null
  full_name: string
  email: string
  phone: string
  service: string
  consultation_type: string
  start_at: string
  end_at: string
  important_date: string | null
  message: string | null
  status: BookingStatus
  created_at: string
}

const filters: Array<{ value: 'active' | BookingStatus | 'all'; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

export function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<'active' | BookingStatus | 'all'>('active')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBookings = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('bookings')
      .select('id, client_id, full_name, email, phone, service, consultation_type, start_at, end_at, important_date, message, status, created_at')
      .order('start_at', { ascending: true })

    if (queryError) {
      setError('Bookings could not be loaded.')
    } else {
      setBookings((data ?? []) as Booking[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadBookings()
    })
  }, [loadBookings])

  const visibleBookings = useMemo(() => {
    if (filter === 'all') return bookings
    if (filter === 'active') {
      return bookings.filter((booking) => ['pending', 'confirmed', 'rescheduled'].includes(booking.status))
    }
    return bookings.filter((booking) => booking.status === filter)
  }, [bookings, filter])

  async function updateStatus(id: string, status: BookingStatus) {
    if (!supabase) return

    setWorkingId(id)
    setError('')
    setNotice('')

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)

    if (updateError) {
      setError('That booking could not be updated.')
    } else {
      setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status } : booking))
      setNotice(`Booking marked ${status}.`)
    }

    setWorkingId('')
  }

  async function convertToClient(booking: Booking) {
    if (!supabase || booking.client_id) return

    setWorkingId(booking.id)
    setError('')
    setNotice('')

    try {
      const { data: existingClient, error: existingError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', booking.email.toLowerCase())
        .limit(1)
        .maybeSingle()

      if (existingError) throw existingError

      let clientId = existingClient?.id as string | undefined

      if (!clientId) {
        const { data: createdClient, error: createError } = await supabase
          .from('clients')
          .insert({
            full_name: booking.full_name,
            email: booking.email.toLowerCase(),
            phone: booking.phone,
            service_type: booking.service,
            important_date: booking.important_date,
            status: 'active',
          })
          .select('id')
          .single()

        if (createError) throw createError
        clientId = createdClient.id as string
      }

      const { error: linkError } = await supabase
        .from('bookings')
        .update({ client_id: clientId })
        .eq('id', booking.id)

      if (linkError) throw linkError

      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, client_id: clientId ?? null } : item))
      setNotice(existingClient ? 'Booking linked to the existing client record.' : 'Client created and booking linked.')
    } catch {
      setError('The booking could not be converted to a client record.')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Booking management</p>
          <h1>Bookings</h1>
          <p>Review requests, confirm appointments and turn a booking into a client record when needed.</p>
        </div>
        <button className="button secondary" type="button" onClick={loadBookings}>Refresh</button>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="admin-filter-row" role="group" aria-label="Booking filters">
        {filters.map((item) => (
          <button
            key={item.value}
            className={filter === item.value ? 'filter-button active' : 'filter-button'}
            type="button"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Loading bookings…</div>
      ) : visibleBookings.length ? (
        <div className="admin-booking-cards">
          {visibleBookings.map((booking) => (
            <article className="admin-booking-card" key={booking.id}>
              <div className="admin-booking-main">
                <div className="admin-booking-title-row">
                  <div>
                    <span className={`status-pill ${booking.status}`}>{booking.status}</span>
                    <h2>{booking.full_name}</h2>
                    <p>{booking.service}</p>
                  </div>
                  <div className="admin-booking-time">
                    <CalendarDays size={18} />
                    <strong>{formatNzDateTime(booking.start_at)}</strong>
                    <span><Clock3 size={15} /> {booking.consultation_type}</span>
                  </div>
                </div>

                <div className="admin-booking-details">
                  <div><span>Email</span><a href={`mailto:${booking.email}`}>{booking.email}</a></div>
                  <div><span>Phone</span><a href={`tel:${booking.phone.replace(/\s/g, '')}`}>{booking.phone}</a></div>
                  {booking.important_date && <div><span>Important date</span><strong>{booking.important_date}</strong></div>}
                </div>

                {booking.message && (
                  <div className="booking-message">
                    <span>Client message</span>
                    <p>{booking.message}</p>
                  </div>
                )}
              </div>

              <div className="admin-booking-actions">
                {booking.client_id ? (
                  <Link className="action-button" to={`/admin/clients/${booking.client_id}`}>View client</Link>
                ) : (
                  <button
                    className="action-button"
                    type="button"
                    disabled={workingId === booking.id}
                    onClick={() => void convertToClient(booking)}
                  >
                    <UserPlus size={17} /> Create client
                  </button>
                )}
                {booking.status === 'pending' && (
                  <button
                    className="action-button confirm"
                    type="button"
                    disabled={workingId === booking.id}
                    onClick={() => void updateStatus(booking.id, 'confirmed')}
                  >
                    <Check size={17} /> Confirm
                  </button>
                )}
                {['pending', 'confirmed', 'rescheduled'].includes(booking.status) && (
                  <button
                    className="action-button complete"
                    type="button"
                    disabled={workingId === booking.id}
                    onClick={() => void updateStatus(booking.id, 'completed')}
                  >
                    <Check size={17} /> Complete
                  </button>
                )}
                {['pending', 'confirmed', 'rescheduled'].includes(booking.status) && (
                  <button
                    className="action-button cancel"
                    type="button"
                    disabled={workingId === booking.id}
                    onClick={() => void updateStatus(booking.id, 'cancelled')}
                  >
                    <X size={17} /> Cancel
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dashboard-panel empty-state">
          <CalendarDays size={28} />
          <h2>No bookings here</h2>
          <p>There are no bookings matching this filter.</p>
        </div>
      )}
    </>
  )
}
