import { CalendarClock, CalendarDays, Check, Clock3, LoaderCircle, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNzDateTime, formatNzTime, getAvailableSlots, nzDateString } from '../../lib/beetitApi'
import type { AvailableSlot } from '../../lib/beetitApi'
import { createClientIssue, findMatchingClients, formatIssueNumber, getOpenIssueForService } from '../../lib/clientIssues'
import { supabase } from '../../lib/supabase'

type BookingStatus = 'pending' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed'

type Booking = {
  id: string
  client_id: string | null
  issue_id: string | null
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

type ManageBookingResponse = {
  booking?: Partial<Booking> & { id: string }
  emailSent?: boolean
  error?: string
}

const filters: Array<{ value: 'active' | BookingStatus | 'all'; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

export function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<'active' | BookingStatus | 'all'>('active')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [reschedulingId, setReschedulingId] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([])
  const [rescheduleStartAt, setRescheduleStartAt] = useState('')
  const [loadingReschedule, setLoadingReschedule] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBookings = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('bookings')
      .select('id, client_id, issue_id, full_name, email, phone, service, consultation_type, start_at, end_at, important_date, message, status, created_at')
      .order('start_at', { ascending: true })

    if (queryError) setError('Bookings could not be loaded.')
    else setBookings((data ?? []) as Booking[])
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadBookings())
  }, [loadBookings])

  const visibleBookings = useMemo(() => {
    if (filter === 'all') return bookings
    if (filter === 'active') return bookings.filter((booking) => ['pending', 'confirmed', 'rescheduled'].includes(booking.status))
    return bookings.filter((booking) => booking.status === filter)
  }, [bookings, filter])

  async function getInvokeErrorMessage(error: unknown, fallback: string) {
    const typed = error as { message?: string; context?: Response }
    let message = typed.message || fallback
    if (typed.context) {
      try {
        const detail = await typed.context.clone().json() as { error?: string }
        if (detail.error) message = detail.error
      } catch {
        // Keep the fallback.
      }
    }
    return message
  }

  async function manageBooking(booking: Booking, action: 'confirm' | 'cancel' | 'complete' | 'reschedule', startAt?: string) {
    if (!supabase) return false
    if (action === 'cancel' && !window.confirm(`Cancel ${booking.full_name}'s booking? The client will be emailed automatically.`)) return false

    setWorkingId(booking.id)
    setError('')
    setNotice('')

    const { data, error: invokeError } = await supabase.functions.invoke<ManageBookingResponse>('manage-booking', {
      body: { bookingId: booking.id, action, startAt },
    })

    if (invokeError || data?.error || !data?.booking) {
      setError(data?.error || await getInvokeErrorMessage(invokeError, 'That booking could not be updated.'))
      setWorkingId('')
      return false
    }

    setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, ...data.booking } as Booking : item))
    const label = action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : action === 'complete' ? 'completed' : 'rescheduled'
    const emailNote = action === 'complete' ? '' : data.emailSent ? ' The client was emailed.' : ' The booking changed, but the client email could not be confirmed.'
    setNotice(`Booking ${label}.${emailNote}`)
    setWorkingId('')
    return true
  }

  async function loadRescheduleSlots(date: string) {
    setRescheduleDate(date)
    setRescheduleStartAt('')
    setRescheduleSlots([])
    if (!date) return
    setLoadingReschedule(true)
    setError('')
    try {
      setRescheduleSlots(await getAvailableSlots(date))
    } catch {
      setError('Available reschedule times could not be loaded.')
    } finally {
      setLoadingReschedule(false)
    }
  }

  async function beginReschedule(booking: Booking) {
    const initialDate = nzDateString(new Date(booking.start_at))
    setReschedulingId(booking.id)
    await loadRescheduleSlots(initialDate < nzDateString() ? nzDateString() : initialDate)
  }

  async function submitReschedule(booking: Booking) {
    if (!rescheduleStartAt) {
      setError('Choose a new available time first.')
      return
    }
    const changed = await manageBooking(booking, 'reschedule', rescheduleStartAt)
    if (changed) {
      setReschedulingId('')
      setRescheduleDate('')
      setRescheduleSlots([])
      setRescheduleStartAt('')
    }
  }

  async function convertToClient(booking: Booking) {
    if (!supabase || booking.client_id) return
    setWorkingId(booking.id)
    setError('')
    setNotice('')

    try {
      const matches = await findMatchingClients(booking.email, booking.phone)
      if (matches.length > 1) {
        setError('More than one existing client matches this booking. Open Clients and check the person before linking this booking.')
        setWorkingId('')
        return
      }

      let clientId = matches[0]?.id
      const existingName = matches[0]?.full_name
      let issueId: string | null = null
      let matterLabel = ''

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

        const issue = await createClientIssue({
          clientId,
          serviceType: booking.service,
          title: booking.service,
          summary: booking.message || 'Created from an online booking.',
        })
        issueId = issue.id
        matterLabel = formatIssueNumber(issue.issue_number)
      } else {
        const openIssue = await getOpenIssueForService(clientId, booking.service)
        if (openIssue) {
          const useExisting = window.confirm(
            `${existingName} already has open matter ${formatIssueNumber(openIssue.issue_number)} for ${booking.service}.\n\nOK = link this booking to that matter.\nCancel = create a new matter for the same client.`,
          )
          if (useExisting) {
            issueId = openIssue.id
            matterLabel = formatIssueNumber(openIssue.issue_number)
          } else {
            const issue = await createClientIssue({
              clientId,
              serviceType: booking.service,
              title: booking.service,
              summary: booking.message || 'New matter created from an online booking.',
            })
            issueId = issue.id
            matterLabel = formatIssueNumber(issue.issue_number)
          }
        } else {
          const issue = await createClientIssue({
            clientId,
            serviceType: booking.service,
            title: booking.service,
            summary: booking.message || 'New matter created from an online booking.',
          })
          issueId = issue.id
          matterLabel = formatIssueNumber(issue.issue_number)
        }
      }

      const { error: linkError } = await supabase
        .from('bookings')
        .update({ client_id: clientId, issue_id: issueId })
        .eq('id', booking.id)
      if (linkError) throw linkError

      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, client_id: clientId ?? null, issue_id: issueId } : item))
      setNotice(matches.length
        ? `Booking linked to ${existingName} and ${matterLabel}. No duplicate client was created.`
        : `Client created and booking filed under ${matterLabel}.`)
    } catch {
      setError('The booking could not be linked to a client matter.')
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
          <p>Review requests, confirm appointments, reschedule when needed and file new work under the correct client matter.</p>
        </div>
        <button className="button secondary" type="button" onClick={loadBookings}>Refresh</button>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="admin-filter-row" role="group" aria-label="Booking filters">
        {filters.map((item) => (
          <button key={item.value} className={filter === item.value ? 'filter-button active' : 'filter-button'} type="button" onClick={() => setFilter(item.value)}>
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

                {booking.message && <div className="booking-message"><span>Client message</span><p>{booking.message}</p></div>}

                {reschedulingId === booking.id && (
                  <div className="reschedule-panel">
                    <div className="reschedule-heading">
                      <div><span>Reschedule appointment</span><strong>Choose a new available date and time</strong></div>
                      <button type="button" className="text-button" onClick={() => setReschedulingId('')}>Close</button>
                    </div>
                    <label>
                      New date
                      <input type="date" min={nzDateString()} value={rescheduleDate} onChange={(event) => void loadRescheduleSlots(event.target.value)} />
                    </label>
                    {loadingReschedule ? (
                      <div className="slot-loading"><LoaderCircle className="spin" size={17} /> Checking availability…</div>
                    ) : rescheduleDate && rescheduleSlots.length ? (
                      <div className="slot-grid admin-slot-grid">
                        {rescheduleSlots.map((slot) => (
                          <button key={slot.start_at} type="button" className={rescheduleStartAt === slot.start_at ? 'slot-button selected' : 'slot-button'} onClick={() => setRescheduleStartAt(slot.start_at)}>
                            <span>{formatNzTime(slot.start_at)}</span><small>Free</small>
                          </button>
                        ))}
                      </div>
                    ) : rescheduleDate ? <p className="slot-help">No online booking times are available on this date.</p> : null}
                    <div className="admin-form-actions">
                      <button className="button secondary" type="button" onClick={() => setReschedulingId('')}>Cancel</button>
                      <button className="button primary" type="button" disabled={!rescheduleStartAt || workingId === booking.id} onClick={() => void submitReschedule(booking)}>
                        {workingId === booking.id ? 'Saving…' : 'Save new time and email client'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-booking-actions">
                {booking.client_id ? (
                  <Link className="action-button" to={`/admin/clients/${booking.client_id}`}>View client matter</Link>
                ) : (
                  <button className="action-button" type="button" disabled={workingId === booking.id} onClick={() => void convertToClient(booking)}>
                    <UserPlus size={17} /> Link client and matter
                  </button>
                )}
                {booking.status === 'pending' && (
                  <button className="action-button confirm" type="button" disabled={workingId === booking.id} onClick={() => void manageBooking(booking, 'confirm')}>
                    <Check size={17} /> Confirm
                  </button>
                )}
                {['pending', 'confirmed', 'rescheduled'].includes(booking.status) && (
                  <button className="action-button" type="button" disabled={workingId === booking.id} onClick={() => void beginReschedule(booking)}>
                    <CalendarClock size={17} /> Reschedule
                  </button>
                )}
                {['pending', 'confirmed', 'rescheduled'].includes(booking.status) && (
                  <button className="action-button complete" type="button" disabled={workingId === booking.id} onClick={() => void manageBooking(booking, 'complete')}>
                    <Check size={17} /> Complete
                  </button>
                )}
                {['pending', 'confirmed', 'rescheduled'].includes(booking.status) && (
                  <button className="action-button cancel" type="button" disabled={workingId === booking.id} onClick={() => void manageBooking(booking, 'cancel')}>
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
