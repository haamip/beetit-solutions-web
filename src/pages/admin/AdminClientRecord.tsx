import { AlertTriangle, Pencil, Save, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { siteConfig } from '../../config/site'
import { supabase } from '../../lib/supabase'
import { AdminClientDetail } from './AdminClientDetail'

type ClientSummary = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  service_type: string | null
  important_date: string | null
}

type DeleteResponse = {
  deleted?: boolean
  filesDeleted?: number
  error?: string
}

export function AdminClientRecord() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientSummary | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [nameConfirmation, setNameConfirmation] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    queueMicrotask(async () => {
      if (!supabase || !clientId) return
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, email, phone, service_type, important_date')
        .eq('id', clientId)
        .maybeSingle()
      if (data) setClient(data as ClientSummary)
    })
  }, [clientId])

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !clientId || !client) return
    const data = new FormData(event.currentTarget)
    const fullName = String(data.get('fullName') ?? '').trim()
    if (!fullName) return

    setSaving(true)
    setError('')
    setNotice('')
    const { data: updated, error: updateError } = await supabase
      .from('clients')
      .update({
        full_name: fullName,
        email: String(data.get('email') ?? '').trim().toLowerCase() || null,
        phone: String(data.get('phone') ?? '').trim() || null,
        service_type: String(data.get('serviceType') ?? '').trim() || null,
        important_date: String(data.get('importantDate') ?? '') || null,
      })
      .eq('id', clientId)
      .select('id, full_name, email, phone, service_type, important_date')
      .single()

    if (updateError || !updated) {
      setError('The client details could not be updated.')
    } else {
      setClient(updated as ClientSummary)
      setShowEdit(false)
      setNotice('Client details updated. Refreshing the record…')
      window.setTimeout(() => window.location.reload(), 350)
    }
    setSaving(false)
  }

  async function deleteClient() {
    if (!supabase || !clientId || !client || deleting) return
    if (nameConfirmation.trim() !== client.full_name || deleteConfirmation.trim() !== 'DELETE') return
    if (!window.confirm(`Final warning: permanently delete ${client.full_name}, all matters, notes and stored client files? This cannot be undone.`)) return

    setDeleting(true)
    setError('')
    setNotice('')
    const { data, error: invokeError } = await supabase.functions.invoke<DeleteResponse>('delete-client-record', {
      body: {
        clientId,
        clientName: nameConfirmation.trim(),
        confirmation: deleteConfirmation.trim(),
      },
    })

    if (invokeError || data?.error || !data?.deleted) {
      setError(data?.error || 'The client record could not be permanently deleted.')
      setDeleting(false)
      return
    }

    navigate('/admin/clients', {
      replace: true,
      state: { deletedClient: client.full_name, filesDeleted: data.filesDeleted ?? 0 },
    })
  }

  const deletionReady = Boolean(client) && nameConfirmation.trim() === client?.full_name && deleteConfirmation.trim() === 'DELETE'

  return (
    <div className="client-record-wrapper">
      {client && (
        <section className="client-record-control-bar" aria-label="Client record controls">
          <div>
            <span>Record controls</span>
            <strong>{client.full_name}</strong>
          </div>
          <div className="client-record-control-actions">
            <button className="button secondary" type="button" onClick={() => { setShowEdit((open) => !open); setShowDelete(false); setError(''); setNotice('') }}>
              <Pencil size={16} /> Edit client
            </button>
            <button className="button danger-outline" type="button" onClick={() => { setShowDelete((open) => !open); setShowEdit(false); setError(''); setNotice('') }}>
              <Trash2 size={16} /> Delete client
            </button>
          </div>
        </section>
      )}

      {error && <div className="form-status error client-record-control-message">{error}</div>}
      {notice && <div className="form-status success client-record-control-message">{notice}</div>}

      {showEdit && client && (
        <form className="dashboard-panel client-edit-panel" onSubmit={saveClient}>
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Edit client</p>
              <h2>Client details</h2>
            </div>
            <button className="icon-close-button" type="button" aria-label="Close edit client" onClick={() => setShowEdit(false)}><X size={18} /></button>
          </div>
          <div className="field-grid two-column">
            <label>Full name<input name="fullName" defaultValue={client.full_name} required /></label>
            <label>Email<input name="email" type="email" defaultValue={client.email ?? ''} /></label>
            <label>Phone<input name="phone" type="tel" defaultValue={client.phone ?? ''} /></label>
            <label>
              Original service
              <select name="serviceType" defaultValue={client.service_type ?? ''}>
                <option value="">Not set</option>
                {siteConfig.services.map((service) => <option key={service}>{service}</option>)}
              </select>
            </label>
            <label>Important date<input name="importantDate" type="date" defaultValue={client.important_date ?? ''} /></label>
          </div>
          <div className="admin-form-actions">
            <button className="button secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save client'}</button>
          </div>
        </form>
      )}

      {showDelete && client && (
        <section className="dashboard-panel client-delete-panel">
          <div className="client-delete-warning">
            <AlertTriangle size={24} />
            <div>
              <p className="eyebrow">Permanent deletion</p>
              <h2>Delete this client and their files</h2>
              <p>This removes the client profile, matters, private notes, stored work documents, identity files and secure upload links. Existing bookings and enquiries are detached from the client record rather than deleted.</p>
            </div>
          </div>
          <div className="client-delete-confirm-grid">
            <label>
              1. Type the client name exactly
              <input value={nameConfirmation} onChange={(event) => setNameConfirmation(event.target.value)} placeholder={client.full_name} autoComplete="off" />
            </label>
            <label>
              2. Type DELETE
              <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="DELETE" autoComplete="off" />
            </label>
          </div>
          <div className="client-delete-footer">
            <p>Deletion is irreversible. Only use it when the record is permitted to be permanently removed.</p>
            <div className="admin-form-actions">
              <button className="button secondary" type="button" onClick={() => { setShowDelete(false); setNameConfirmation(''); setDeleteConfirmation('') }}>Cancel</button>
              <button className="button danger" type="button" disabled={!deletionReady || deleting} onClick={() => void deleteClient()}>
                <Trash2 size={16} /> {deleting ? 'Deleting client and files…' : 'Permanently delete client'}
              </button>
            </div>
          </div>
        </section>
      )}

      <AdminClientDetail />
    </div>
  )
}
