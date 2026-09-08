import { ChevronLeft, ChevronRight, Clock3, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { formatNzTime, nzDateString, nzLocalToIso } from '../../lib/beetitApi'
import { supabase } from '../../lib/supabase'

type CalendarBooking = {
  id: string
  full_name: string
  service: string
  start_at: string
  end_at: string
  status: string
}

type BlockedTime = {
  id: string
  start_at: string
  end_at: string
  reason: string | null
}

export function AdminCalendar() {
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => nzDateString())
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const range = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return { start, end, days: eachDayOfInterval({ start, end }) }
  }, [month])

  const loadCalendar = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError('')

    const startIso = range.start.toISOString()
    const endIso = new Date(range.end.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const [bookingsResult, blocksResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, full_name, service, start_at, end_at, status')
        .gte('start_at', startIso)
        .lt('start_at', endIso)
        .in('status', ['pending', 'confirmed', 'rescheduled'])
        .order('start_at', { ascending: true }),
      supabase
        .from('blocked_times')
        .select('id, start_at, end_at, reason')
        .lt('start_at', endIso)
        .gt('end_at', startIso)
        .order('start_at', { ascending: true }),
    ])

    if (bookingsResult.error || blocksResult.error) {
      setError('Calendar information could not be loaded.')
    } else {
      setBookings((bookingsResult.data ?? []) as CalendarBooking[])
      setBlockedTimes((blocksResult.data ?? []) as BlockedTime[])
    }

    setLoading(false)
  }, [range.end, range.start])

  useEffect(() => {
    queueMicrotask(() => {
      void loadCalendar()
    })
  }, [loadCalendar])

  const selectedBookings = bookings.filter((booking) => nzDateString(new Date(booking.start_at)) === selectedDate)
  const selectedBlocks = blockedTimes.filter((block) => {
    const selected = new Date(`${selectedDate}T12:00:00`)
    const blockStart = new Date(block.start_at)
    const blockEnd = new Date(block.end_at)
    return selected >= new Date(blockStart.toLocaleString('en-US', { timeZone: 'Pacific/Auckland' })) && selected <= new Date(blockEnd.toLocaleString('en-US', { timeZone: 'Pacific/Auckland' }))
  })

  async function handleBlockTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    const form = event.currentTarget
    const data = new FormData(form)
    const startTime = String(data.get('startTime') ?? '')
    const endTime = String(data.get('endTime') ?? '')
    const reason = String(data.get('reason') ?? '')

    if (!startTime || !endTime) {
      setError('Choose a start and end time.')
      return
    }

    const startAt = nzLocalToIso(selectedDate, startTime)
    const endAt = nzLocalToIso(selectedDate, endTime)

    if (new Date(endAt) <= new Date(startAt)) {
      setError('The end time must be after the start time.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    const { data: sessionData } = await supabase.auth.getSession()
    const { error: insertError } = await supabase.from('blocked_times').insert({
      start_at: startAt,
      end_at: endAt,
      reason: reason.trim() || null,
      created_by: sessionData.session?.user.id ?? null,
    })

    if (insertError) {
      setError('That time could not be blocked.')
    } else {
      setNotice('Time blocked from public bookings.')
      form.reset()
      await loadCalendar()
    }

    setSaving(false)
  }

  async function removeBlock(id: string) {
    if (!supabase) return
    setError('')
    setNotice('')

    const { error: deleteError } = await supabase.from('blocked_times').delete().eq('id', id)
    if (deleteError) {
      setError('That blocked time could not be removed.')
      return
    }

    setNotice('Blocked time removed.')
    await loadCalendar()
  }

  function chooseDay(day: Date) {
    setSelectedDate(format(day, 'yyyy-MM-dd'))
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Live availability</p>
          <h1>Calendar</h1>
          <p>See live bookings and block dates or times so they disappear from the public booking page.</p>
        </div>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="calendar-layout">
        <section className="calendar-card">
          <div className="calendar-toolbar">
            <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => subMonths(current, 1))}>
              <ChevronLeft size={20} />
            </button>
            <h2>{format(month, 'MMMM yyyy')}</h2>
            <button type="button" aria-label="Next month" onClick={() => setMonth((current) => addMonths(current, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
          </div>

          {loading ? (
            <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Loading calendar…</div>
          ) : (
            <div className="calendar-month-grid">
              {range.days.map((day) => {
                const dateString = format(day, 'yyyy-MM-dd')
                const dayBookings = bookings.filter((booking) => nzDateString(new Date(booking.start_at)) === dateString)
                const hasBlock = blockedTimes.some((block) => {
                  const blockDate = nzDateString(new Date(block.start_at))
                  return blockDate === dateString
                })
                const selected = selectedDate === dateString

                return (
                  <button
                    key={dateString}
                    className={`calendar-day${isSameMonth(day, month) ? '' : ' outside'}${selected ? ' selected' : ''}${isSameDay(day, new Date()) ? ' today' : ''}`}
                    type="button"
                    onClick={() => chooseDay(day)}
                  >
                    <span className="calendar-day-number">{format(day, 'd')}</span>
                    <span className="calendar-day-events">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <span className="calendar-event" key={booking.id}>{formatNzTime(booking.start_at)} {booking.full_name}</span>
                      ))}
                      {dayBookings.length > 2 && <span className="calendar-more">+{dayBookings.length - 2} more</span>}
                      {hasBlock && <span className="calendar-block-indicator">Blocked time</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <aside className="calendar-side-panel">
          <div className="calendar-selected-heading">
            <p className="eyebrow">Selected day</p>
            <h2>{new Intl.DateTimeFormat('en-NZ', { dateStyle: 'full', timeZone: 'Pacific/Auckland' }).format(new Date(`${selectedDate}T12:00:00+12:00`))}</h2>
          </div>

          <div className="calendar-day-list">
            <h3>Bookings</h3>
            {selectedBookings.length ? selectedBookings.map((booking) => (
              <article className="calendar-detail-item" key={booking.id}>
                <Clock3 size={17} />
                <div>
                  <strong>{formatNzTime(booking.start_at)} · {booking.full_name}</strong>
                  <span>{booking.service}</span>
                </div>
              </article>
            )) : <p>No bookings for this day.</p>}
          </div>

          <div className="calendar-day-list">
            <h3>Blocked times</h3>
            {selectedBlocks.length ? selectedBlocks.map((block) => (
              <article className="calendar-detail-item blocked" key={block.id}>
                <Clock3 size={17} />
                <div>
                  <strong>{formatNzTime(block.start_at)} to {formatNzTime(block.end_at)}</strong>
                  <span>{block.reason || 'Unavailable'}</span>
                </div>
                <button type="button" aria-label="Remove blocked time" onClick={() => void removeBlock(block.id)}>
                  <Trash2 size={17} />
                </button>
              </article>
            )) : <p>No blocked times for this day.</p>}
          </div>

          <form className="calendar-block-form" onSubmit={handleBlockTime}>
            <div className="calendar-block-form-title">
              <Plus size={18} />
              <h3>Block time</h3>
            </div>
            <div className="field-grid two-column">
              <label>
                From
                <input name="startTime" type="time" defaultValue="10:00" required />
              </label>
              <label>
                To
                <input name="endTime" type="time" defaultValue="11:00" required />
              </label>
            </div>
            <label>
              Reason <span className="optional">Optional</span>
              <input name="reason" placeholder="Unavailable" />
            </label>
            <button className="button primary full-width" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Block selected time'}
            </button>
          </form>
        </aside>
      </div>
    </>
  )
}
