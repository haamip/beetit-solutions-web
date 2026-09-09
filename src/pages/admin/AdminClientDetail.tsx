import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  FolderKanban,
  LoaderCircle,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { siteConfig } from '../../config/site'
import { formatNzDateTime } from '../../lib/beetitApi'
import { createClientIssue, formatIssueNumber } from '../../lib/clientIssues'
import type { ClientIssue } from '../../lib/clientIssues'
import { supabase } from '../../lib/supabase'
import '../../identity.css'

type Client = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  service_type: string | null
  important_date: string | null
  date_of_birth: string | null
  dob_confirmed_at: string | null
  dob_confirmed_by: string | null
  status: string
  created_at: string
}

type ClientNote = {
  id: string
  issue_id: string | null
  note: string
  created_at: string
}

type ClientDocument = {
  id: string
  issue_id: string | null
  storage_path: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  document_type: 'general' | 'identity'
  document_category: string
  created_at: string
}

type ClientBooking = {
  id: string
  issue_id: string | null
  service: string
  consultation_type: string
  start_at: string
  status: string
}

type IdEmailResponse = {
  sent?: boolean
  reason?: 'email_not_configured' | 'email_failed'
  uploadUrl?: string
  email?: string
  expiresAt?: string
  error?: string
}

const documentCategories = [
  ['general', 'General'],
  ['correspondence', 'Correspondence'],
  ['court_tribunal', 'Court / Tribunal'],
  ['evidence', 'Evidence'],
  ['client_supplied', 'Client supplied'],
  ['agreement_contract', 'Agreement / Contract'],
  ['research', 'Research'],
  ['other', 'Other'],
] as const

function categoryLabel(value: string) {
  return documentCategories.find(([key]) => key === value)?.[1] ?? value.replaceAll('_', ' ')
}

export function AdminClientDetail() {
  const { clientId } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [issues, setIssues] = useState<ClientIssue[]>([])
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [bookings, setBookings] = useState<ClientBooking[]>([])
  const [selectedIssueId, setSelectedIssueId] = useState('all')
  const [showNewIssue, setShowNewIssue] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [linkWorking, setLinkWorking] = useState(false)
  const [uploadLink, setUploadLink] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadClient = useCallback(async () => {
    if (!supabase || !clientId) return

    setLoading(true)
    setError('')

    const [clientResult, issuesResult, notesResult, documentsResult, bookingsResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, dob_confirmed_by, status, created_at')
        .eq('id', clientId)
        .maybeSingle(),
      supabase
        .from('client_issues')
        .select('id, issue_number, client_id, title, service_type, status, summary, opened_at, closed_at, created_at')
        .eq('client_id', clientId)
        .order('opened_at', { ascending: false }),
      supabase
        .from('client_notes')
        .select('id, issue_id, note, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_documents')
        .select('id, issue_id, storage_path, original_name, mime_type, size_bytes, document_type, document_category, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('id, issue_id, service, consultation_type, start_at, status')
        .eq('client_id', clientId)
        .order('start_at', { ascending: false }),
    ])

    if (
      clientResult.error ||
      issuesResult.error ||
      notesResult.error ||
      documentsResult.error ||
      bookingsResult.error ||
      !clientResult.data
    ) {
      setError('This client record could not be loaded.')
    } else {
      setClient(clientResult.data as Client)
      setIssues((issuesResult.data ?? []) as ClientIssue[])
      setNotes((notesResult.data ?? []) as ClientNote[])
      setDocuments((documentsResult.data ?? []) as ClientDocument[])
      setBookings((bookingsResult.data ?? []) as ClientBooking[])
    }

    setLoading(false)
  }, [clientId])

  useEffect(() => {
    queueMicrotask(() => void loadClient())
  }, [loadClient])

  const issueLookup = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues])
  const selectedIssue = selectedIssueId === 'all' ? null : issueLookup.get(selectedIssueId) ?? null
  const visibleNotes = selectedIssueId === 'all' ? notes : notes.filter((note) => note.issue_id === selectedIssueId)
  const visibleDocuments = documents.filter((document) =>
    document.document_type !== 'identity' && (selectedIssueId === 'all' || document.issue_id === selectedIssueId),
  )
  const visibleBookings = selectedIssueId === 'all' ? bookings : bookings.filter((booking) => booking.issue_id === selectedIssueId)

  async function addIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientId) return
    const form = event.currentTarget
    const data = new FormData(form)

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const issue = await createClientIssue({
        clientId,
        serviceType: String(data.get('serviceType') ?? '') || null,
        title: String(data.get('title') ?? '') || null,
        summary: String(data.get('summary') ?? '') || null,
      })
      setIssues((current) => [issue, ...current])
      setSelectedIssueId(issue.id)
      setShowNewIssue(false)
      form.reset()
      setNotice(`${formatIssueNumber(issue.issue_number)} created.`)
    } catch {
      setError('The new matter could not be created.')
    }
    setSaving(false)
  }

  async function updateIssueStatus(issue: ClientIssue, status: ClientIssue['status']) {
    if (!supabase || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    const closedAt = status === 'closed' || status === 'archived' ? new Date().toISOString() : null
    const { data, error: updateError } = await supabase
      .from('client_issues')
      .update({ status, closed_at: closedAt })
      .eq('id', issue.id)
      .select('id, issue_number, client_id, title, service_type, status, summary, opened_at, closed_at, created_at')
      .single()
    if (updateError || !data) setError('The matter status could not be updated.')
    else {
      setIssues((current) => current.map((item) => item.id === issue.id ? data as ClientIssue : item))
      setNotice(`${formatIssueNumber(issue.issue_number)} marked ${status.replace('_', ' ')}.`)
    }
    setSaving(false)
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !clientId) return

    const form = event.currentTarget
    const data = new FormData(form)
    const note = String(data.get('note') ?? '').trim()
    const issueId = String(data.get('issueId') ?? '') || null
    if (!note) return

    setSaving(true)
    setError('')
    setNotice('')

    const { data: sessionData } = await supabase.auth.getSession()
    const { error: insertError } = await supabase.from('client_notes').insert({
      client_id: clientId,
      issue_id: issueId,
      note,
      created_by: sessionData.session?.user.id ?? null,
    })

    if (insertError) {
      setError('The private note could not be saved.')
    } else {
      setNotice('Private note saved to the selected matter.')
      form.reset()
      await loadClient()
    }

    setSaving(false)
  }

  async function deleteNote(note: ClientNote) {
    if (!supabase || !clientId || saving) return
    if (!window.confirm('Delete this private note?')) return
    if (!window.confirm('Final warning: this permanently deletes the note and cannot be undone. Continue?')) return

    setSaving(true)
    setError('')
    setNotice('')
    const { error: deleteError } = await supabase
      .from('client_notes')
      .delete()
      .eq('id', note.id)
      .eq('client_id', clientId)

    if (deleteError) setError('The private note could not be deleted.')
    else {
      setNotes((current) => current.filter((item) => item.id !== note.id))
      setNotice('Private note deleted.')
    }
    setSaving(false)
  }

  async function saveDateOfBirth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !clientId || !client) return

    const form = event.currentTarget
    const data = new FormData(form)
    const dateOfBirth = String(data.get('dateOfBirth') ?? '') || null
    const changed = dateOfBirth !== client.date_of_birth

    setSaving(true)
    setError('')
    setNotice('')
    const update = changed
      ? { date_of_birth: dateOfBirth, dob_confirmed_at: null, dob_confirmed_by: null }
      : { date_of_birth: dateOfBirth }

    const { data: updated, error: updateError } = await supabase
      .from('clients')
      .update(update)
      .eq('id', clientId)
      .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, dob_confirmed_by, status, created_at')
      .single()

    if (updateError || !updated) setError('The date of birth could not be saved.')
    else {
      setClient(updated as Client)
      setNotice(changed ? 'Date of birth saved. Confirm it after checking the uploaded ID.' : 'Date of birth saved.')
    }
    setSaving(false)
  }

  async function confirmDateOfBirth() {
    if (!supabase || !clientId || !client?.date_of_birth) return
    const identityDocuments = documents.filter((document) => document.document_type === 'identity')
    if (!identityDocuments.length) {
      setError('An ID document must be uploaded before the date of birth can be confirmed.')
      return
    }
    if (!window.confirm(`Confirm ${client.date_of_birth} as ${client.full_name}'s date of birth after checking the uploaded ID?`)) return

    setSaving(true)
    setError('')
    setNotice('')
    const { data: sessionData } = await supabase.auth.getSession()
    const { data: updated, error: updateError } = await supabase
      .from('clients')
      .update({ dob_confirmed_at: new Date().toISOString(), dob_confirmed_by: sessionData.session?.user.id ?? null })
      .eq('id', clientId)
      .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, dob_confirmed_by, status, created_at')
      .single()

    if (updateError || !updated) setError('The date of birth could not be confirmed.')
    else {
      setClient(updated as Client)
      setNotice('Date of birth confirmed from the uploaded ID.')
    }
    setSaving(false)
  }

  async function removeDobConfirmation() {
    if (!supabase || !clientId || !client?.dob_confirmed_at) return
    if (!window.confirm('Remove the confirmed status from this date of birth? The DOB itself will remain on the client record.')) return

    const { data: updated, error: updateError } = await supabase
      .from('clients')
      .update({ dob_confirmed_at: null, dob_confirmed_by: null })
      .eq('id', clientId)
      .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, dob_confirmed_by, status, created_at')
      .single()

    if (updateError || !updated) setError('The DOB confirmation could not be removed.')
    else {
      setClient(updated as Client)
      setNotice('DOB confirmation removed.')
    }
  }

  async function emailIdUploadLink() {
    if (!supabase || !clientId || !client || linkWorking) return
    if (!client.email) {
      setError('Add an email address to this client before sending an ID upload link.')
      return
    }

    setLinkWorking(true)
    setError('')
    setNotice('')
    setUploadLink('')

    const { data, error: invokeError } = await supabase.functions.invoke<IdEmailResponse>('send-client-id-link', {
      body: { clientId, origin: window.location.origin },
    })

    if (invokeError || data?.error) setError(data?.error || 'The secure ID upload email could not be sent.')
    else if (data?.sent) setNotice(`Secure ID upload link emailed to ${data.email || client.email}.`)
    else if (data?.uploadUrl) {
      setUploadLink(data.uploadUrl)
      setError(data.reason === 'email_not_configured'
        ? 'Automatic email is not connected yet. A secure fallback link has been created below.'
        : 'The email could not be delivered. Use the secure fallback link below.')
    } else setError('The secure ID upload email could not be sent.')

    setLinkWorking(false)
  }

  async function copyIdUploadLink() {
    if (!uploadLink) return
    try {
      await navigator.clipboard.writeText(uploadLink)
      setNotice('ID upload link copied.')
    } catch {
      setError('The link could not be copied automatically. Select and copy it manually.')
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !clientId) return

    const form = event.currentTarget
    const data = new FormData(form)
    const input = form.elements.namedItem('document') as HTMLInputElement | null
    const file = input?.files?.[0]
    const issueId = String(data.get('issueId') ?? '')
    const category = String(data.get('category') ?? 'general')

    if (!issueId) {
      setError('Choose the client matter this document belongs to.')
      return
    }
    if (!file) {
      setError('Choose a document to upload.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Please keep each document under 20 MB.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const storagePath = `${clientId}/${issueId}/${crypto.randomUUID()}-${safeName}`
    const { data: sessionData } = await supabase.auth.getSession()

    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(storagePath, file, { upsert: false, contentType: file.type || undefined })

    if (uploadError) {
      setError('The document could not be uploaded.')
      setSaving(false)
      return
    }

    const { error: recordError } = await supabase.from('client_documents').insert({
      client_id: clientId,
      issue_id: issueId,
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: sessionData.session?.user.id ?? null,
      document_type: 'general',
      document_category: category,
    })

    if (recordError) {
      await supabase.storage.from('client-documents').remove([storagePath])
      setError('The document record could not be saved.')
    } else {
      setNotice('Private document uploaded and filed against the selected matter.')
      form.reset()
      await loadClient()
    }
    setSaving(false)
  }

  async function downloadDocument(document: ClientDocument) {
    if (!supabase) return
    setError('')
    const { data, error: signedUrlError } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(document.storage_path, 60)
    if (signedUrlError || !data?.signedUrl) {
      setError('A secure download link could not be created.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteDocument(document: ClientDocument) {
    if (!supabase) return
    if (document.document_type === 'identity') {
      if (!window.confirm('Delete this identity document? If it is the last ID on the client record, any DOB confirmation will also be removed.')) return
    }

    setError('')
    setNotice('')
    const { error: storageError } = await supabase.storage.from('client-documents').remove([document.storage_path])
    if (storageError) {
      setError('The document could not be removed from secure storage.')
      return
    }
    const { error: recordError } = await supabase.from('client_documents').delete().eq('id', document.id)
    if (recordError) {
      setError('The document file was removed but its record needs cleanup.')
      return
    }
    setNotice('Document removed.')
    await loadClient()
  }

  async function updateStatus(status: string) {
    if (!supabase || !clientId) return
    const { error: updateError } = await supabase.from('clients').update({ status }).eq('id', clientId)
    if (updateError) {
      setError('Client status could not be updated.')
      return
    }
    setClient((current) => current ? { ...current, status } : current)
    setNotice('Client status updated.')
  }

  if (loading) return <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Loading client…</div>

  if (!client) {
    return (
      <div className="dashboard-panel empty-state">
        <h2>Client not found</h2>
        <p>{error || 'This client record is unavailable.'}</p>
        <Link className="button secondary" to="/admin/clients">Back to clients</Link>
      </div>
    )
  }

  const identityDocuments = documents.filter((document) => document.document_type === 'identity')
  const identityReceived = identityDocuments.length > 0
  const defaultIssueId = selectedIssueId !== 'all' ? selectedIssueId : issues.find((issue) => issue.status === 'open')?.id ?? issues[0]?.id ?? ''

  return (
    <>
      <Link className="admin-back-link" to="/admin/clients"><ArrowLeft size={17} /> Back to clients</Link>

      <div className="admin-page-heading client-detail-heading">
        <div>
          <p className="eyebrow">Client record</p>
          <h1>{client.full_name}</h1>
          <p>{issues.length} {issues.length === 1 ? 'matter' : 'matters'} on file</p>
        </div>
        <select className="client-status-select" value={client.status} onChange={(event) => void updateStatus(event.target.value)}>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <section className="dashboard-panel matter-panel">
        <div className="dashboard-panel-heading matter-heading">
          <div>
            <p className="eyebrow">Client matters</p>
            <h2>Issues and case files</h2>
            <p>Each matter has its own number. Notes, documents and bookings can be filed against the correct issue.</p>
          </div>
          <button className="button primary" type="button" onClick={() => setShowNewIssue((open) => !open)}>
            <Plus size={17} /> New matter
          </button>
        </div>

        {showNewIssue && (
          <form className="matter-create-form" onSubmit={addIssue}>
            <div className="field-grid two-column">
              <label>
                Service / workflow
                <select name="serviceType" defaultValue="">
                  <option value="">General matter</option>
                  {siteConfig.services.filter((service) => service !== 'Other / Not sure').map((service) => <option key={service}>{service}</option>)}
                </select>
              </label>
              <label>
                Matter title
                <input name="title" placeholder="e.g. Succession application" />
              </label>
            </div>
            <label>
              Short summary <span className="optional">Optional</span>
              <textarea name="summary" rows={3} placeholder="What is this matter about?" />
            </label>
            <div className="admin-form-actions">
              <button className="button secondary" type="button" onClick={() => setShowNewIssue(false)}>Cancel</button>
              <button className="button primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create matter'}</button>
            </div>
          </form>
        )}

        <div className="matter-filter-row">
          <button className={selectedIssueId === 'all' ? 'matter-filter active' : 'matter-filter'} type="button" onClick={() => setSelectedIssueId('all')}>
            All matters
          </button>
          {issues.map((issue) => (
            <button key={issue.id} className={selectedIssueId === issue.id ? 'matter-filter active' : 'matter-filter'} type="button" onClick={() => setSelectedIssueId(issue.id)}>
              {formatIssueNumber(issue.issue_number)}
            </button>
          ))}
        </div>

        <div className="matter-card-grid">
          {issues.length ? issues.map((issue) => (
            <article className={selectedIssueId === issue.id ? 'matter-card selected' : 'matter-card'} key={issue.id}>
              <button className="matter-card-open" type="button" onClick={() => setSelectedIssueId(issue.id)}>
                <div className="matter-card-number"><FolderKanban size={17} /> {formatIssueNumber(issue.issue_number)}</div>
                <h3>{issue.title}</h3>
                <p>{issue.service_type || 'General matter'}</p>
                {issue.summary && <span>{issue.summary}</span>}
              </button>
              <div className="matter-card-footer">
                <span className={`matter-status ${issue.status}`}>{issue.status.replace('_', ' ')}</span>
                <select value={issue.status} onChange={(event) => void updateIssueStatus(issue, event.target.value as ClientIssue['status'])} disabled={saving} aria-label={`Status for ${formatIssueNumber(issue.issue_number)}`}>
                  <option value="open">Open</option>
                  <option value="on_hold">On hold</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </article>
          )) : (
            <div className="matter-empty">
              <FolderKanban size={24} />
              <p>No matters yet. Create the first matter before filing notes or documents.</p>
            </div>
          )}
        </div>

        {selectedIssue && (
          <div className="matter-current-strip">
            <strong>Viewing {formatIssueNumber(selectedIssue.issue_number)}</strong>
            <span>{selectedIssue.title}</span>
            <button className="text-button" type="button" onClick={() => setSelectedIssueId('all')}>Show everything</button>
          </div>
        )}
      </section>

      <div className="client-detail-grid">
        <section className="dashboard-panel client-summary-panel">
          <p className="eyebrow">Client details</p>
          <div className="client-summary-list">
            <div><span>Email</span><strong>{client.email || 'Not supplied'}</strong></div>
            <div><span>Phone</span><strong>{client.phone || 'Not supplied'}</strong></div>
            <div><span>Original service</span><strong>{client.service_type || 'Not set'}</strong></div>
            <div><span>Important date</span><strong>{client.important_date || 'None'}</strong></div>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Internal only</p>
              <h2>Private notes</h2>
            </div>
          </div>

          <form className="client-note-form matter-linked-form" onSubmit={addNote} key={`note-${defaultIssueId}`}>
            <label>
              File note under
              <select name="issueId" defaultValue={defaultIssueId}>
                <option value="">Client level / no specific matter</option>
                {issues.map((issue) => <option key={issue.id} value={issue.id}>{formatIssueNumber(issue.issue_number)} · {issue.title}</option>)}
              </select>
            </label>
            <textarea name="note" rows={4} placeholder="Add a private note…" required />
            <button className="button primary" type="submit" disabled={saving}><Plus size={17} /> Add note</button>
          </form>

          <div className="client-note-list">
            {visibleNotes.length ? visibleNotes.map((note) => {
              const issue = note.issue_id ? issueLookup.get(note.issue_id) : null
              return (
                <article key={note.id}>
                  <div className="file-meta-row">
                    <span>{issue ? `${formatIssueNumber(issue.issue_number)} · ${issue.title}` : 'Client level'}</span>
                  </div>
                  <p>{note.note}</p>
                  <span>{formatNzDateTime(note.created_at)}</span>
                  <button className="text-button" type="button" onClick={() => void deleteNote(note)} disabled={saving}>Delete note</button>
                </article>
              )
            }) : <p>No private notes for this view yet.</p>}
          </div>
        </section>
      </div>

      <section className="dashboard-panel identity-verification-panel">
        <div className="dashboard-panel-heading">
          <div>
            <p className="eyebrow">Identity check</p>
            <h2>ID and date of birth</h2>
          </div>
          <ShieldCheck size={22} />
        </div>

        <div className="identity-verification-grid">
          <div className="identity-status-card">
            <div className="identity-status-row">
              <span className="identity-status-label"><ShieldCheck size={18} /> Verification status</span>
              {client.dob_confirmed_at ? (
                <span className="identity-status-pill verified"><CheckCircle2 size={14} /> DOB confirmed</span>
              ) : identityReceived ? (
                <span className="identity-status-pill received">ID received</span>
              ) : (
                <span className="identity-status-pill">ID required</span>
              )}
            </div>

            <form className="identity-dob-form" onSubmit={saveDateOfBirth}>
              <label>
                Date of birth
                <input name="dateOfBirth" type="date" defaultValue={client.date_of_birth ?? ''} />
              </label>
              <div className="identity-actions">
                <button className="button secondary" type="submit" disabled={saving}>Save DOB</button>
                {!client.dob_confirmed_at && client.date_of_birth && identityReceived && (
                  <button className="button primary" type="button" onClick={() => void confirmDateOfBirth()} disabled={saving}>Confirm DOB from ID</button>
                )}
                {client.dob_confirmed_at && (
                  <button className="text-button" type="button" onClick={() => void removeDobConfirmation()} disabled={saving}>Remove confirmation</button>
                )}
              </div>
            </form>

            {client.dob_confirmed_at ? (
              <p className="identity-helper">Confirmed from an uploaded ID on {formatNzDateTime(client.dob_confirmed_at)}.</p>
            ) : (
              <p className="identity-helper">The DOB stays unconfirmed until an ID has been uploaded and an authorised admin checks it.</p>
            )}

            {identityReceived && (
              <div className="identity-actions">
                <button className="text-button" type="button" onClick={() => void downloadDocument(identityDocuments[0])}>View latest ID</button>
              </div>
            )}
          </div>

          <div className="identity-link-card">
            <strong>Client ID upload</strong>
            <p className="identity-helper">
              {client.email
                ? `Email a private one-use upload link directly to ${client.email}. The link expires after 7 days.`
                : 'Add an email address to this client before sending an ID upload link.'}
            </p>
            <div className="identity-actions">
              <button className="button primary" type="button" onClick={() => void emailIdUploadLink()} disabled={linkWorking || !client.email}>
                <Mail size={17} /> {linkWorking ? 'Sending…' : identityReceived ? 'Email replacement ID link' : 'Email ID upload link'}
              </button>
            </div>
            {uploadLink && (
              <div className="identity-upload-link">
                <code>{uploadLink}</code>
                <button className="button secondary" type="button" onClick={() => void copyIdUploadLink()}><Copy size={16} /> Copy fallback link</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="client-detail-grid client-detail-grid-lower">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Secure storage</p>
              <h2>Documents</h2>
              <p>Every work document is filed against a matter and a document category.</p>
            </div>
          </div>

          <form className="document-upload-form matter-document-form" onSubmit={uploadDocument} key={`doc-${defaultIssueId}`}>
            <label>
              Client matter
              <select name="issueId" defaultValue={defaultIssueId} required>
                <option value="" disabled>Select a matter</option>
                {issues.map((issue) => <option key={issue.id} value={issue.id}>{formatIssueNumber(issue.issue_number)} · {issue.title}</option>)}
              </select>
            </label>
            <label>
              Document category
              <select name="category" defaultValue="general">
                {documentCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="document-file-field">
              File
              <input name="document" type="file" required />
            </label>
            <button className="button primary" type="submit" disabled={saving || !issues.length}>Upload and file document</button>
          </form>

          <div className="document-list">
            {visibleDocuments.length ? visibleDocuments.map((document) => {
              const issue = document.issue_id ? issueLookup.get(document.issue_id) : null
              return (
                <article className="document-item matter-document-item" key={document.id}>
                  <FileText size={20} />
                  <div>
                    <strong>{document.original_name}</strong>
                    <span>{issue ? `${formatIssueNumber(issue.issue_number)} · ${issue.title}` : 'Unfiled matter'}</span>
                    <span>{categoryLabel(document.document_category)} · {formatNzDateTime(document.created_at)}</span>
                  </div>
                  <button type="button" aria-label={`Download ${document.original_name}`} onClick={() => void downloadDocument(document)}><Download size={17} /></button>
                  <button type="button" aria-label={`Delete ${document.original_name}`} onClick={() => void deleteDocument(document)}><Trash2 size={17} /></button>
                </article>
              )
            }) : <p>No work documents for this view yet.</p>}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">History</p>
              <h2>Bookings</h2>
            </div>
          </div>

          <div className="booking-list">
            {visibleBookings.length ? visibleBookings.map((booking) => {
              const issue = booking.issue_id ? issueLookup.get(booking.issue_id) : null
              return (
                <article className="booking-list-item" key={booking.id}>
                  <div>
                    <strong>{booking.service}</strong>
                    <span>{issue ? `${formatIssueNumber(issue.issue_number)} · ${issue.title}` : 'No matter assigned'}</span>
                    <span>{booking.consultation_type}</span>
                  </div>
                  <div className="booking-list-meta">
                    <strong>{formatNzDateTime(booking.start_at)}</strong>
                    <span>{booking.status}</span>
                  </div>
                </article>
              )
            }) : <p>No bookings for this view yet.</p>}
          </div>
        </section>
      </div>
    </>
  )
}
