import { AlertTriangle, FolderPlus, Mail, Phone, Plus, Search, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { siteConfig } from '../../config/site'
import { createClientIssue, findMatchingClients, formatIssueNumber } from '../../lib/clientIssues'
import type { ClientMatch } from '../../lib/clientIssues'
import { supabase } from '../../lib/supabase'

type Client = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  service_type: string | null
  important_date: string | null
  date_of_birth: string | null
  dob_confirmed_at: string | null
  status: string
  created_at: string
  client_issues?: Array<{ id: string; status: string }>
}

type NewClientPayload = {
  fullName: string
  email: string | null
  phone: string | null
  serviceType: string | null
  matterTitle: string | null
  importantDate: string | null
  dateOfBirth: string | null
}

export function AdminClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [duplicateMatches, setDuplicateMatches] = useState<ClientMatch[]>([])
  const [pendingClient, setPendingClient] = useState<NewClientPayload | null>(null)

  const loadClients = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, status, created_at, client_issues(id, status)')
      .order('full_name', { ascending: true })

    if (queryError) setError('Clients could not be loaded.')
    else setClients((data ?? []) as Client[])
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadClients())
  }, [loadClients])

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return clients
    return clients.filter((client) =>
      [client.full_name, client.email, client.phone, client.service_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [clients, search])

  async function createClientRecord(payload: NewClientPayload) {
    if (!supabase) return null
    const { data: created, error: insertError } = await supabase
      .from('clients')
      .insert({
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        service_type: payload.serviceType,
        important_date: payload.importantDate,
        date_of_birth: payload.dateOfBirth,
        status: 'active',
      })
      .select('id')
      .single()

    if (insertError || !created) throw insertError ?? new Error('Client was not created')

    if (payload.serviceType || payload.matterTitle) {
      await createClientIssue({
        clientId: created.id,
        serviceType: payload.serviceType,
        title: payload.matterTitle || payload.serviceType,
        summary: 'Created with the client record.',
      })
    }

    return created.id as string
  }

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = event.currentTarget
    const data = new FormData(form)
    const payload: NewClientPayload = {
      fullName: String(data.get('fullName') ?? '').trim(),
      email: String(data.get('email') ?? '').trim().toLowerCase() || null,
      phone: String(data.get('phone') ?? '').trim() || null,
      serviceType: String(data.get('serviceType') ?? '').trim() || null,
      matterTitle: String(data.get('matterTitle') ?? '').trim() || null,
      importantDate: String(data.get('importantDate') ?? '') || null,
      dateOfBirth: String(data.get('dateOfBirth') ?? '') || null,
    }

    setSaving(true)
    setError('')
    setNotice('')
    setDuplicateMatches([])
    setPendingClient(null)

    try {
      const matches = await findMatchingClients(payload.email, payload.phone)
      if (matches.length) {
        setDuplicateMatches(matches)
        setPendingClient(payload)
        setError('An existing client may match these contact details. Choose the correct option below before creating another person.')
        setSaving(false)
        return
      }

      await createClientRecord(payload)
      setNotice('Client created with their first matter ready for notes and documents.')
      form.reset()
      setShowCreate(false)
      await loadClients()
    } catch {
      setError('The client could not be created.')
    }
    setSaving(false)
  }

  async function addMatterToExisting(match: ClientMatch) {
    if (!pendingClient) return
    setSaving(true)
    setError('')
    try {
      const issue = await createClientIssue({
        clientId: match.id,
        serviceType: pendingClient.serviceType,
        title: pendingClient.matterTitle || pendingClient.serviceType || 'New matter',
        summary: 'Created after the duplicate client check matched an existing client record.',
      })
      setNotice(`${formatIssueNumber(issue.issue_number)} added to ${match.full_name}. No duplicate client was created.`)
      setDuplicateMatches([])
      setPendingClient(null)
      setShowCreate(false)
      await loadClients()
    } catch {
      setError('The new matter could not be added to the existing client.')
    }
    setSaving(false)
  }

  async function createSeparateClientAnyway() {
    if (!pendingClient) return
    if (!window.confirm('Create a separate client record even though the email or phone matches an existing client?')) return
    setSaving(true)
    setError('')
    try {
      await createClientRecord(pendingClient)
      setNotice('Separate client record created as requested.')
      setDuplicateMatches([])
      setPendingClient(null)
      setShowCreate(false)
      await loadClients()
    } catch {
      setError('The separate client record could not be created.')
    }
    setSaving(false)
  }

  function closeCreate() {
    setShowCreate(false)
    setDuplicateMatches([])
    setPendingClient(null)
    setError('')
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Client database</p>
          <h1>Clients</h1>
          <p>One person, one client record. Each new piece of work becomes its own numbered matter underneath that client.</p>
        </div>
        <button className="button primary" type="button" onClick={() => setShowCreate((open) => !open)}>
          <Plus size={18} /> New client
        </button>
      </div>

      {notice && <div className="form-status success">{notice}</div>}
      {error && !duplicateMatches.length && <div className="form-status error">{error}</div>}

      {showCreate && (
        <form className="dashboard-panel admin-create-form" onSubmit={handleCreateClient}>
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Add record</p>
              <h2>New client</h2>
              <p>The system checks email and phone before creating a duplicate.</p>
            </div>
          </div>
          <div className="field-grid two-column">
            <label>
              Full name
              <input name="fullName" required />
            </label>
            <label>
              Service / workflow
              <select name="serviceType" defaultValue="">
                <option value="">Not selected</option>
                {siteConfig.services.map((service) => <option key={service}>{service}</option>)}
              </select>
            </label>
            <label>
              Email
              <input name="email" type="email" />
            </label>
            <label>
              Phone
              <input name="phone" type="tel" />
            </label>
            <label>
              Matter title <span className="optional">Optional</span>
              <input name="matterTitle" placeholder="e.g. Succession application" />
            </label>
            <label>
              Date of birth <span className="optional">Optional until ID check</span>
              <input name="dateOfBirth" type="date" />
            </label>
            <label>
              Important date <span className="optional">Optional</span>
              <input name="importantDate" type="date" />
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="button secondary" type="button" onClick={closeCreate}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving}>{saving ? 'Checking…' : 'Check and create client'}</button>
          </div>
        </form>
      )}

      {duplicateMatches.length > 0 && pendingClient && (
        <section className="dashboard-panel duplicate-client-panel">
          <div className="duplicate-client-heading">
            <AlertTriangle size={22} />
            <div>
              <p className="eyebrow">Possible duplicate</p>
              <h2>Existing client found</h2>
              <p>Do not create the person again if this is the same client. Add the new work as another matter instead.</p>
            </div>
          </div>
          <div className="duplicate-match-list">
            {duplicateMatches.map((match) => (
              <article key={match.id}>
                <div>
                  <strong>{match.full_name}</strong>
                  <span>{match.email || 'No email'} · {match.phone || 'No phone'}</span>
                </div>
                <div className="admin-form-actions">
                  <Link className="button secondary" to={`/admin/clients/${match.id}`}>Open client</Link>
                  <button className="button primary" type="button" disabled={saving} onClick={() => void addMatterToExisting(match)}>
                    <FolderPlus size={17} /> Add new matter to this client
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="duplicate-client-footer">
            <button className="text-button" type="button" disabled={saving} onClick={() => void createSeparateClientAnyway()}>
              This is definitely a different person — create a separate client anyway
            </button>
          </div>
        </section>
      )}

      <div className="admin-search-bar">
        <Search size={19} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search clients by name, email, phone or service"
          aria-label="Search clients"
        />
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading clients…</div>
      ) : visibleClients.length ? (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Matters</th>
                <th>Status</th>
                <th><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((client) => {
                const matterCount = client.client_issues?.length ?? 0
                const openCount = client.client_issues?.filter((issue) => issue.status === 'open').length ?? 0
                return (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.full_name}</strong>
                      {client.important_date && <span>Important date {client.important_date}</span>}
                      {client.date_of_birth && <span>DOB {client.date_of_birth}{client.dob_confirmed_at ? ' · confirmed' : ' · unconfirmed'}</span>}
                    </td>
                    <td>
                      {client.email && <a href={`mailto:${client.email}`}><Mail size={15} /> {client.email}</a>}
                      {client.phone && <a href={`tel:${client.phone.replace(/\s/g, '')}`}><Phone size={15} /> {client.phone}</a>}
                    </td>
                    <td><strong>{matterCount}</strong><span>{openCount} open</span></td>
                    <td>
                      <span className={`status-pill ${client.status}`} style={{ display: 'inline-flex', width: 'fit-content', marginTop: 0 }}>
                        {client.status}
                      </span>
                    </td>
                    <td><Link className="text-link" to={`/admin/clients/${client.id}`}>Open</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-panel empty-state">
          <Users size={28} />
          <h2>No clients found</h2>
          <p>Create the first client record or change the search.</p>
        </div>
      )}
    </>
  )
}
