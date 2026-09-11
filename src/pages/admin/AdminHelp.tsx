import { BookOpenCheck, CircleHelp, Search, Send, TicketCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { formatNzDateTime } from '../../lib/beetitApi'
import { supabase } from '../../lib/supabase'

type SupportRequest = {
  id: string
  ticket_number: number
  category: string
  priority: string
  subject: string
  message: string
  status: string
  created_at: string
}

const helpArticles = [
  {
    title: 'Create a client without making duplicates',
    keywords: 'client duplicate email phone existing person new matter',
    body: 'Use New client. Beet It checks the email and phone first. If the person already exists, choose Add new matter to this client instead of creating them again.',
  },
  {
    title: 'Create and manage a client matter',
    keywords: 'matter issue MAT number workflow status open closed hold',
    body: 'Open the client and use New matter. Every matter receives a MAT number. Use the matter filters to view only the notes, documents and bookings linked to that issue.',
  },
  {
    title: 'Edit a client record',
    keywords: 'edit client name email phone service date details',
    body: 'Open the client record and choose Edit client. Update the details that have changed and save. Editing the client does not remove their existing MAT files, notes, documents or booking history.',
  },
  {
    title: 'Delete a client safely',
    keywords: 'delete client permanent files identity documents remove',
    body: 'Use Delete client only when the entire client record genuinely needs to be permanently removed. Beet It requires the client name, the word DELETE and a final confirmation. Client files in secure storage are removed as part of the deletion. This cannot be undone.',
  },
  {
    title: 'File a private note under the right matter',
    keywords: 'notes private issue matter file internal',
    body: 'Open the client, select the matter you are working on, then add the note. The File note under selector decides which MAT file the note belongs to.',
  },
  {
    title: 'Upload and categorise a document',
    keywords: 'document upload court evidence correspondence research category file matter',
    body: 'In the client Documents section choose the MAT matter, choose the document category, then upload the file. The document list shows both the matter number and document category.',
  },
  {
    title: 'Request and verify client ID',
    keywords: 'identity id dob date birth upload verification secure link',
    body: 'Use Email ID upload link on the client record. The one-use link expires after seven days. Once the ID arrives, check it and confirm the DOB. Identity documents stay client-level rather than inside a work matter.',
  },
  {
    title: 'Convert a booking into client work',
    keywords: 'booking client existing matter conversion duplicate',
    body: 'Use Link client and matter on the booking. The system checks for an existing person. If they already have an open matter for the same workflow you can reuse it or create a new MAT file.',
  },
  {
    title: 'Understand live booking availability',
    keywords: 'booking availability free limited full closed retry calendar slots',
    body: 'Free means several times are available, Limited means only a few remain, Full means the live system returned no available times, and Closed means online booking is not offered that day. Retry means the availability check could not be completed, so select the day again to recheck rather than assuming it is full.',
  },
  {
    title: 'Convert an enquiry into client work',
    keywords: 'enquiry workflow client matter convert',
    body: 'Choose the likely workflow on the enquiry, then Link client and matter. Existing client details are checked before anything new is created.',
  },
  {
    title: 'Reschedule a booking',
    keywords: 'calendar reschedule appointment email availability',
    body: 'Open Bookings, choose Reschedule, then select a new live available date and time. Saving the new time also sends the updated appointment details to the client.',
  },
  {
    title: 'Change the website look',
    keywords: 'settings colours hero image website design theme size fade focus height',
    body: 'Open Settings to change approved brand colours, public contact details and the homepage hero. Uploaded hero photos are automatically cropped and blended. Use Photo focus, Photo size, Hero height and Fade strength to tune the image without editing it externally.',
  },
  {
    title: 'Ask HAKT for support',
    keywords: 'help support ticket urgent priority hakt problem issue',
    body: 'Open Help and create a support request. Include what you were doing, what you expected and what happened instead. Use Urgent only when the issue is stopping normal use. The ticket number lets the request be tracked through to resolution.',
  },
]

function ticketLabel(number: number) {
  return `SUP-${String(number).padStart(6, '0')}`
}

export function AdminHelp() {
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState<SupportRequest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadTickets = useCallback(async () => {
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('support_requests')
      .select('id, ticket_number, category, priority, subject, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(12)
    if (queryError) setError('Support requests could not be loaded.')
    else setTickets((data ?? []) as SupportRequest[])
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadTickets())
  }, [loadTickets])

  const visibleArticles = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return helpArticles
    return helpArticles.filter((article) => `${article.title} ${article.keywords} ${article.body}`.toLowerCase().includes(term))
  }, [search])

  async function submitSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = event.currentTarget
    const data = new FormData(form)

    setSubmitting(true)
    setError('')
    setNotice('')

    const { data: sessionData } = await supabase.auth.getSession()
    const { data: created, error: insertError } = await supabase
      .from('support_requests')
      .insert({
        category: String(data.get('category') ?? 'general'),
        priority: String(data.get('priority') ?? 'normal'),
        subject: String(data.get('subject') ?? '').trim(),
        message: String(data.get('message') ?? '').trim(),
        created_by: sessionData.session?.user.id ?? null,
      })
      .select('ticket_number')
      .single()

    if (insertError || !created) {
      setError('The support request could not be created.')
    } else {
      form.reset()
      setNotice(`${ticketLabel(created.ticket_number)} created for HAKT support.`)
      await loadTickets()
    }
    setSubmitting(false)
  }

  async function updateTicketStatus(ticket: SupportRequest, status: string) {
    if (!supabase) return
    const { error: updateError } = await supabase.from('support_requests').update({ status }).eq('id', ticket.id)
    if (updateError) setError('The support request status could not be changed.')
    else {
      setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, status } : item))
      setNotice(`${ticketLabel(ticket.ticket_number)} updated.`)
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Help centre</p>
          <h1>Help</h1>
          <p>Quick guidance for everyday Beet It workflows, plus a support request queue for anything that needs HAKT.</p>
        </div>
        <CircleHelp size={25} />
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="help-grid">
        <section className="dashboard-panel help-articles-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">How to</p>
              <h2>Beet It guides</h2>
            </div>
            <BookOpenCheck size={21} />
          </div>

          <div className="admin-search-bar help-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search help e.g. document, booking, ID" />
          </div>

          <div className="help-article-list">
            {visibleArticles.map((article) => (
              <details key={article.title}>
                <summary>{article.title}</summary>
                <p>{article.body}</p>
              </details>
            ))}
            {!visibleArticles.length && <p>No help article matches that search.</p>}
          </div>
        </section>

        <section className="dashboard-panel support-request-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">HAKT support</p>
              <h2>Need help?</h2>
            </div>
            <Send size={20} />
          </div>
          <p>Raise a support request with enough detail to pick it up quickly. Urgent is for something stopping normal use.</p>

          <form className="support-request-form" onSubmit={submitSupport}>
            <div className="field-grid two-column">
              <label>
                Category
                <select name="category" defaultValue="general">
                  <option value="general">General</option>
                  <option value="booking">Bookings</option>
                  <option value="client">Clients / matters</option>
                  <option value="documents">Documents</option>
                  <option value="identity">ID verification</option>
                  <option value="website">Website</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Priority
                <select name="priority" defaultValue="normal">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
            </div>
            <label>
              Subject
              <input name="subject" required placeholder="Short description of the problem" />
            </label>
            <label>
              What happened?
              <textarea name="message" rows={5} required placeholder="What were you doing, what did you expect, and what happened instead?" />
            </label>
            <button className="button primary" type="submit" disabled={submitting}>{submitting ? 'Creating request…' : 'Create support request'}</button>
          </form>
        </section>
      </div>

      <section className="dashboard-panel support-ticket-list-panel">
        <div className="dashboard-panel-heading">
          <div>
            <p className="eyebrow">Support history</p>
            <h2>Recent requests</h2>
          </div>
          <TicketCheck size={21} />
        </div>

        <div className="support-ticket-list">
          {tickets.length ? tickets.map((ticket) => (
            <article key={ticket.id}>
              <div>
                <strong>{ticketLabel(ticket.ticket_number)} · {ticket.subject}</strong>
                <span>{ticket.category.replace('_', ' ')} · {ticket.priority} priority · {formatNzDateTime(ticket.created_at)}</span>
                <p>{ticket.message}</p>
              </div>
              <select value={ticket.status} onChange={(event) => void updateTicketStatus(ticket, event.target.value)}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </article>
          )) : <p>No support requests have been raised yet.</p>}
        </div>
      </section>
    </>
  )
}
