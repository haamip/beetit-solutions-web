import { ChevronLeft, ChevronRight, Clock3, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { formatNzTime, nzDateString, nzLocalToIso } from '../../lib/beetitApi'
import { supabase } from '../../lib/supabase'

type CalendarView = 'month' | 'week' | 'day'

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

function blockOverlapsNzDate(block: BlockedTime, dateString: string) {
  const nextDateString = format(addDays(new Date(`${dateString}T12:00:00`), 1), 'yyyy-MM-dd')
  const dayStart = new Date(nzLocalToIso(dateString, '00:00'))
  const dayEnd = new Date(nzLocalToIso(nextDateString, '00:00'))
  const blockStart = new Date(block.start_at)
  const blockEnd = new Date(block.end_at)
  return blockStart < dayEnd && blockEnd > dayStart
}

function calendarDateLabel(dateString: string) {
  return new Intl.DateTimeFormat('en-NZ', { dateStyle: 'full', timeZone: 'UTC' })
    .format(new Date(`${dateString}T12:00:00Z`))
}

export function AdminCalendar() {
  const [view, setView] = useState<CalendarView>('month')
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

  const selectedDateObject = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate])
  const selectedWeekDays = useMemo(() => {
    const start = startOfWeek(selectedDateObject, { weekStartsOn: 1 })
    const end = endOfWeek(selectedDateObject, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [selectedDateObject])

  const loadCalendar = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')

    const startDate = format(range.start, 'yyyy-MM-dd')
    const endDate = format(addDays(range.end, 1), 'yyyy-MM-dd')
    const startIso = nzLocalToIso(startDate, '00:00')
    const endIso = nzLocalToIso(endDate, '00:00')

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

    if (bookingsResult.error || blocksResult.error) setError('Calendar information could not be loaded.')
    else {
      setBookings((bookingsResult.data ?? []) as CalendarBooking[])
      setBlockedTimes((blocksResult.data ?? []) as BlockedTime[])
    }
    setLoading(false)
  }, [range.end, range.start])

  useEffect(() => {
    queueMicrotask(() => void loadCalendar())
  }, [loadCalendar])

  const bookingsForDate = useCallback((dateString: string) =>
    bookings.filter((booking) => nzDateString(new Date(booking.start_at)) === dateString), [bookings])
  const blocksForDate = useCallback((dateString: string) =>
    blockedTimes.filter((block) => blockOverlapsNzDate(block, dateString)), [blockedTimes])

  const selectedBookings = bookingsForDate(selectedDate)
  const selectedBlocks = blocksForDate(selectedDate)

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

    if (insertError) setError('That time could not be blocked.')
    else {
      setNotice('Time blocked from public bookings.')
      form.reset()
      await loadCalendar()
    }
    setSaving(false)
  }

  async function removeBlock(id: string) {
    if (!supabase) return
    if (!window.confirm('Remove this blocked time and make it available for bookings again?')) return
    setError('')
    setNotice('')
    const { error: deleteError } = await supabase.from('blocked_times').delete().eq('id', id)
    if (deleteError) setError('That blocked time could not be removed.')
    else {
      setNotice('Blocked time removed.')
      await loadCalendar()
    }
  }

  function chooseDay(day: Date) {
    setSelectedDate(format(day, 'yyyy-MM-dd'))
    setMonth(startOfMonth(day))
  }

  function shiftSelection(direction: -1 | 1) {
    const next = view === 'day'
      ? (direction < 0 ? subDays(selectedDateObject, 1) : addDays(selectedDateObject, 1))
      : (direction < 0 ? subWeeks(selectedDateObject, 1) : addWeeks(selectedDateObject, 1))
    setSelectedDate(format(next, 'yyyy-MM-dd'))
    setMonth(startOfMonth(next))
  }

  function changeMonth(direction: -1 | 1) {
    const next = direction < 0 ? subMonths(month, 1) : addMonths(month, 1)
    setMonth(next)
    const candidate = startOfMonth(next)
    setSelectedDate(format(candidate, 'yyyy-MM-dd'))
  }

  const toolbarTitle = view === 'month'
    ? format(month, 'MMMM yyyy')
    : view === 'week'
      ? `${format(selectedWeekDays[0], 'd MMM')} to ${format(selectedWeekDays[6], 'd MMM yyyy')}`
      : calendarDateLabel(selectedDate)

  return (
    <>
      <div className="admin-page-heading calendar-page-heading">
        <div>
          <p className="eyebrow">Live availability</p>
          <h1>Calendar</h1>
          <p>See bookings in day, week or month view and block dates or times so they disappear from the public booking page.</p>
        </div>
        <div className="calendar-view-toggle" role="group" aria-label="Calendar view">
          {(['day', 'week', 'month'] as CalendarView[]).map((item) => (
            <button key={item} type="button" className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>
          ))}
        </div>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="calendar-layout">
        <section className="calendar-card">
          <div className="calendar-toolbar">
            <button type="button" aria-label={`Previous ${view}`} onClick={() => view === 'month' ? changeMonth(-1) : shiftSelection(-1)}><ChevronLeft size={20} /></button>
            <h2>{toolbarTitle}</h2>
            <button type="button" aria-label={`Next ${view}`} onClick={() => view === 'month' ? changeMonth(1) : shiftSelection(1)}><ChevronRight size={20} /></button>
          </div>

          {loading ? (
            <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Loading calendar…</div>
          ) : view === 'month' ? (
            <>
              <div className="calendar-weekdays" aria-hidden="true">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-month-grid">
                {range.days.map((day) => {
                  const dateString = format(day, 'yyyy-MM-dd')
                  const dayBookings = bookingsForDate(dateString)
                  const hasBlock = blocksForDate(dateString).length > 0
                  const selected = selectedDate === dateString
                  return (
                    <button key={dateString} className={`calendar-day${isSameMonth(day, month) ? '' : ' outside'}${selected ? ' selected' : ''}${isSameDay(day, new Date()) ? ' today' : ''}`} type="button" onClick={() => chooseDay(day)}>
                      <span className="calendar-day-number">{format(day, 'd')}</span>
                      <span className="calendar-day-events">
                        {dayBookings.slice(0, 2).map((booking) => <span className="calendar-event" key={booking.id}>{formatNzTime(booking.start_at)} {booking.full_name}</span>)}
                        {dayBookings.length > 2 && <span className="calendar-more">+{dayBookings.length - 2} more</span>}
                        {hasBlock && <span className="calendar-block-indicator">Blocked time</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : view === 'week' ? (
            <div className="calendar-week-view">
              {selectedWeekDays.map((day) => {
                const dateString = format(day, 'yyyy-MM-dd')
                const dayBookings = bookingsForDate(dateString)
                const dayBlocks = blocksForDate(dateString)
                return (
                  <button key={dateString} type="button" className={`calendar-week-column${selectedDate === dateString ? ' selected' : ''}`} onClick={() => chooseDay(day)}>
                    <span className="calendar-week-date"><strong>{format(day, 'EEE')}</strong><b>{format(day, 'd')}</b><small>{format(day, 'MMM')}</small></span>
                    <span className="calendar-week-events">
                      {dayBookings.map((booking) => <span className="calendar-week-event" key={booking.id}><strong>{formatNzTime(booking.start_at)}</strong>{booking.full_name}<small>{booking.service}</small></span>)}
                      {dayBlocks.map((block) => <span className="calendar-week-event blocked" key={block.id}><strong>{formatNzTime(block.start_at)} to {formatNzTime(block.end_at)}</strong>{block.reason || 'Unavailable'}</span>)}
                      {!dayBookings.length && !dayBlocks.length && <span className="calendar-week-empty">No events</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="calendar-day-timeline">
              <div className="calendar-day-timeline-heading">
                <p className="eyebrow">Selected day</p>
                <h3>{calendarDateLabel(selectedDate)}</h3>
              </div>
              {[...selectedBookings.map((booking) => ({
                id: `booking-${booking.id}`,
                start: booking.start_at,
                end: booking.end_at,
                title: booking.full_name,
                detail: booking.service,
                blocked: false,
              })), ...selectedBlocks.map((block) => ({
                id: `block-${block.id}`,
                start: block.start_at,
                end: block.end_at,
                title: block.reason || 'Unavailable',
                detail: 'Blocked time',
                blocked: true,
              }))].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map((item) => (
                <article className={`calendar-timeline-item${item.blocked ? ' blocked' : ''}`} key={item.id}>
                  <div className="calendar-timeline-time"><strong>{formatNzTime(item.start)}</strong><span>to {formatNzTime(item.end)}</span></div>
                  <div><strong>{item.title}</strong><span>{item.detail}</span></div>
                </article>
              ))}
              {!selectedBookings.length && !selectedBlocks.length && <p className="calendar-week-empty">Nothing scheduled or blocked on this day.</p>}
            </div>
          )}
        </section>

        <aside className="calendar-side-panel">
          <div className="calendar-selected-heading">
            <p className="eyebrow">Selected day</p>
            <h2>{calendarDateLabel(selectedDate)}</h2>
          </div>

          <div className="calendar-day-list">
            <h3>Bookings</h3>
            {selectedBookings.length ? selectedBookings.map((booking) => (
              <article className="calendar-detail-item" key={booking.id}>
                <Clock3 size={17} />
                <div><strong>{formatNzTime(booking.start_at)} · {booking.full_name}</strong><span>{booking.service}</span></div>
              </article>
            )) : <p>No bookings for this day.</p>}
          </div>

          <div className="calendar-day-list">
            <h3>Blocked times</h3>
            {selectedBlocks.length ? selectedBlocks.map((block) => (
              <article className="calendar-detail-item blocked" key={block.id}>
                <Clock3 size={17} />
                <div><strong>{formatNzTime(block.start_at)} to {formatNzTime(block.end_at)}</strong><span>{block.reason || 'Unavailable'}</span></div>
                <button type="button" aria-label="Remove blocked time" onClick={() => void removeBlock(block.id)}><Trash2 size={17} /></button>
              </article>
            )) : <p>No blocked times for this day.</p>}
          </div>

          <form className="calendar-block-form" onSubmit={handleBlockTime}>
            <div className="calendar-block-form-title"><Plus size={18} /><h3>Block time</h3></div>
            <div className="field-grid two-column">
              <label>From<input name="startTime" type="time" defaultValue="10:00" required /></label>
              <label>To<input name="endTime" type="time" defaultValue="11:00" required /></label>
            </div>
            <label>Reason <span className="optional">Optional</span><input name="reason" placeholder="Unavailable" /></label>
            <button className="button primary full-width" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Block selected time'}</button>
          </form>
        </aside>
      </div>
    </>
  )
}
