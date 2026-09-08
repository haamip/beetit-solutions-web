import { ArrowLeft, Download, FileText, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatNzDateTime } from '../../lib/beetitApi'
import { supabase } from '../../lib/supabase'

type Client = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  service_type: string | null
  important_date: string | null
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
  created_at: string
}

type ClientBooking = {
  id: string
  service: string
  consultation_type: string
  start_at: string
  status: string
}

export function AdminClientDetail() {
  const { clientId } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [bookings, setBookings] = useState<ClientBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadClient = useCallback(async () => {
    if (!supabase || !clientId) return

    setLoading(true)
    setError('')

    const [clientResult, notesResult, documentsResult, bookingsResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, email, phone, service_type, important_date, status, created_at')
        .eq('id', clientId)
        .maybeSingle(),
      supabase
        .from('client_notes')
        .select('id, note, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_documents')
        .select('id, storage_path, original_name, mime_type, size_bytes, created_at')
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

    setDocuments((current) => current.filter((item) => item.id !== document.id))
    setNotice('Document removed.')
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
              </article>
            )) : <p>No private notes yet.</p>}
          </div>
        </section>
      </div>

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
