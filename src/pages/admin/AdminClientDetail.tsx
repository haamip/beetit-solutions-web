import { ArrowLeft, CheckCircle2, Copy, Download, FileText, LoaderCircle, Mail, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatNzDateTime } from '../../lib/beetitApi'
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
  note: string
  created_at: string
}

type ClientDocument = {
  id: string
  storage_path: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  document_type: 'general' | 'identity'
  created_at: string
}

type ClientBooking = {
  id: string
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

export function AdminClientDetail() {
  const { clientId } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [bookings, setBookings] = useState<ClientBooking[]>([])
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

    const [clientResult, notesResult, documentsResult, bookingsResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, dob_confirmed_by, status, created_at')
        .eq('id', clientId)
        .maybeSingle(),
      supabase
        .from('client_notes')
        .select('id, note, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_documents')
        .select('id, storage_path, original_name, mime_type, size_bytes, document_type, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('id, service, consultation_type, start_at, status')
        .eq('client_id', clientId)
        .order('start_at', { ascending: false }),
    ])

    if (clientResult.error || notesResult.error || documentsResult.error || bookingsResult.error || !clientResult.data) {
      setError('This client record could not be loaded.')
    } else {
      setClient(clientResult.data as Client)
      setNotes((notesResult.data ?? []) as ClientNote[])
      setDocuments((documentsResult.data ?? []) as ClientDocument[])
      setBookings((bookingsResult.data ?? []) as ClientBooking[])
    }

    setLoading(false)
  }, [clientId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadClient()
    })
  }, [loadClient])

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !clientId) return

    const form = event.currentTarget
    const data = new FormData(form)
    const note = String(data.get('note') ?? '').trim()
    if (!note) return

    setSaving(true)
    setError('')
    setNotice('')

    const { data: sessionData } = await supabase.auth.getSession()
    const { error: insertError } = await supabase.from('client_notes').insert({
      client_id: clientId,
      note,
      created_by: sessionData.session?.user.id ?? null,
    })

    if (insertError) {
      setError('The private note could not be saved.')
    } else {
      setNotice('Private note saved.')
      form.reset()
      await loadClient()
    }

    setSaving(false)
  }

  async function deleteNote(note: ClientNote) {
    if (!supabase || !clientId || saving) return

    const firstWarning = window.confirm('Delete this private note?')
    if (!firstWarning) return

    const secondWarning = window.confirm('Final warning: this permanently deletes the note and cannot be undone. Continue?')
    if (!secondWarning) return

    setSaving(true)
    setError('')
    setNotice('')

    const { error: deleteError } = await supabase
      .from('client_notes')
      .delete()
      .eq('id', note.id)
      .eq('client_id', clientId)

    if (deleteError) {
      setError('The private note could not be deleted.')
    } else {
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

    if (updateError || !updated) {
      setError('The date of birth could not be saved.')
    } else {
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
      .update({
        dob_confirmed_at: new Date().toISOString(),
        dob_confirmed_by: sessionData.session?.user.id ?? null,
      })
      .eq('id', clientId)
      .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, dob_confirmed_by, status, created_at')
      .single()

    if (updateError || !updated) {
      setError('The date of birth could not be confirmed.')
    } else {
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
      body: {
        clientId,
        origin: window.location.origin,
      },
    })

    if (invokeError || data?.error) {
      setError(data?.error || 'The secure ID upload email could not be sent.')
    } else if (data?.sent) {
      setNotice(`Secure ID upload link emailed to ${data.email || client.email}.`)
    } else if (data?.uploadUrl) {
      setUploadLink(data.uploadUrl)
      setError(data.reason === 'email_not_configured'
        ? 'Automatic email is not connected yet. A secure fallback link has been created below.'
        : 'The email could not be delivered. Use the secure fallback link below.')
    } else {
      setError('The secure ID upload email could not be sent.')
    }

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
    const input = form.elements.namedItem('document') as HTMLInputElement | null
    const file = input?.files?.[0]

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
    const storagePath = `${clientId}/${crypto.randomUUID()}-${safeName}`
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
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: sessionData.session?.user.id ?? null,
      document_type: 'general',
    })

    if (recordError) {
      await supabase.storage.from('client-documents').remove([storagePath])
      setError('The document record could not be saved.')
    } else {
      setNotice('Private document uploaded.')
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
      const warning = window.confirm('Delete this identity document? If it is the last ID on the client record, any DOB confirmation will also be removed.')
      if (!warning) return
    }

    setError('')
    setNotice('')

    const { error: storageError } = await supabase.storage
      .from('client-documents')
      .remove([document.storage_path])

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

  if (loading) {
    return <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Loading client…</div>
  }

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

  return (
    <>
      <Link className="admin-back-link" to="/admin/clients"><ArrowLeft size={17} /> Back to clients</Link>

      <div className="admin-page-heading client-detail-heading">
        <div>
          <p className="eyebrow">Client record</p>
          <h1>{client.full_name}</h1>
          <p>{client.service_type || 'No service selected'}</p>
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

      <div className="client-detail-grid">
        <section className="dashboard-panel client-summary-panel">
          <p className="eyebrow">Details</p>
          <div className="client-summary-list">
            <div><span>Email</span><strong>{client.email || 'Not supplied'}</strong></div>
            <div><span>Phone</span><strong>{client.phone || 'Not supplied'}</strong></div>
            <div><span>Service</span><strong>{client.service_type || 'Not set'}</strong></div>
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

          <form className="client-note-form" onSubmit={addNote}>
            <textarea name="note" rows={4} placeholder="Add a private note about this client…" required />
            <button className="button primary" type="submit" disabled={saving}><Plus size={17} /> Add note</button>
          </form>

          <div className="client-note-list">
            {notes.length ? notes.map((note) => (
              <article key={note.id}>
                <p>{note.note}</p>
                <span>{formatNzDateTime(note.created_at)}</span>
                <button className="text-button" type="button" onClick={() => void deleteNote(note)} disabled={saving}>
                  Delete note
                </button>
              </article>
            )) : <p>No private notes yet.</p>}
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
                  <button className="button primary" type="button" onClick={() => void confirmDateOfBirth()} disabled={saving}>
                    Confirm DOB from ID
                  </button>
                )}
                {client.dob_confirmed_at && (
                  <button className="text-button" type="button" onClick={() => void removeDobConfirmation()} disabled={saving}>
                    Remove confirmation
                  </button>
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
                <button className="text-button" type="button" onClick={() => void downloadDocument(identityDocuments[0])}>
                  View latest ID
                </button>
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
                <button className="button secondary" type="button" onClick={() => void copyIdUploadLink()}>
                  <Copy size={16} /> Copy fallback link
                </button>
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
            </div>
          </div>

          <form className="document-upload-form" onSubmit={uploadDocument}>
            <input name="document" type="file" required />
            <button className="button primary" type="submit" disabled={saving}>Upload document</button>
          </form>

          <div className="document-list">
            {documents.length ? documents.map((document) => (
              <article className="document-item" key={document.id}>
                <FileText size={20} />
                <div>
                  <strong>{document.original_name}</strong>
                  <span>{formatNzDateTime(document.created_at)}</span>
                  {document.document_type === 'identity' && <span className="identity-document-badge">Identity document</span>}
                </div>
                <button type="button" aria-label={`Download ${document.original_name}`} onClick={() => void downloadDocument(document)}>
                  <Download size={17} />
                </button>
                <button type="button" aria-label={`Delete ${document.original_name}`} onClick={() => void deleteDocument(document)}>
                  <Trash2 size={17} />
                </button>
              </article>
            )) : <p>No documents uploaded for this client.</p>}
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
            {bookings.length ? bookings.map((booking) => (
              <article className="booking-list-item" key={booking.id}>
                <div>
                  <strong>{booking.service}</strong>
                  <span>{booking.consultation_type}</span>
                </div>
                <div className="booking-list-meta">
                  <strong>{formatNzDateTime(booking.start_at)}</strong>
                  <span>{booking.status}</span>
                </div>
              </article>
            )) : <p>No bookings linked to this client yet.</p>}
          </div>
        </section>
      </div>
    </>
  )
}
