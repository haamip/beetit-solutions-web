import { Mail, Phone, Plus, Search, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { siteConfig } from '../../config/site'
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
}

export function AdminClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadClients = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone, service_type, important_date, date_of_birth, dob_confirmed_at, status, created_at')
      .order('full_name', { ascending: true })

    if (queryError) setError('Clients could not be loaded.')
    else setClients((data ?? []) as Client[])

    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadClients()
    })
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

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    const form = event.currentTarget
    const data = new FormData(form)

    setSaving(true)
    setError('')
    setNotice('')

    const { error: insertError } = await supabase.from('clients').insert({
      full_name: String(data.get('fullName') ?? '').trim(),
      email: String(data.get('email') ?? '').trim() || null,
      phone: String(data.get('phone') ?? '').trim() || null,
      service_type: String(data.get('serviceType') ?? '').trim() || null,
      important_date: String(data.get('importantDate') ?? '') || null,
      date_of_birth: String(data.get('dateOfBirth') ?? '') || null,
      status: 'active',
    })

    if (insertError) {
      setError('The client could not be created.')
    } else {
      setNotice('Client created. Date of birth remains unconfirmed until an ID document has been received and checked.')
      form.reset()
      setShowCreate(false)
      await loadClients()
    }

    setSaving(false)
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Client database</p>
          <h1>Clients</h1>
          <p>Keep contact information, service details, important dates, identity checks, notes and private documents together.</p>
        </div>
        <button className="button primary" type="button" onClick={() => setShowCreate((open) => !open)}>
          <Plus size={18} /> New client
        </button>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      {showCreate && (
        <form className="dashboard-panel admin-create-form" onSubmit={handleCreateClient}>
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Add record</p>
              <h2>New client</h2>
            </div>
          </div>
          <div className="field-grid two-column">
            <label>
              Full name
              <input name="fullName" required />
            </label>
            <label>
              Service
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
              Date of birth <span className="optional">Optional until ID check</span>
              <input name="dateOfBirth" type="date" />
            </label>
            <label>
              Important date <span className="optional">Optional</span>
              <input name="importantDate" type="date" />
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="button secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create client'}</button>
          </div>
        </form>
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
                <th>Service</th>
                <th>Status</th>
                <th><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((client) => (
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
                  <td>{client.service_type || 'Not set'}</td>
                  <td>
                    <span
                      className={`status-pill ${client.status}`}
                      style={{ display: 'inline-flex', width: 'fit-content', marginTop: 0 }}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td><Link className="text-link" to={`/admin/clients/${client.id}`}>Open</Link></td>
                </tr>
              ))}
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
