import { Archive, Check, Inbox, Mail, Phone, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { siteConfig } from '../../config/site'
import { formatNzDateTime } from '../../lib/beetitApi'
import { createClientIssue, findMatchingClients, formatIssueNumber, getOpenIssueForService } from '../../lib/clientIssues'
import { supabase } from '../../lib/supabase'

type InquiryStatus = 'unread' | 'read' | 'converted' | 'archived'

type Inquiry = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  status: InquiryStatus
  client_id: string | null
  issue_id: string | null
  created_at: string
}

const filters: Array<{ value: 'active' | InquiryStatus | 'all'; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'converted', label: 'Converted' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

export function AdminEnquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [filter, setFilter] = useState<'active' | InquiryStatus | 'all'>('active')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [workflowByInquiry, setWorkflowByInquiry] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadInquiries = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('contact_inquiries')
      .select('id, name, email, phone, message, status, client_id, issue_id, created_at')
      .order('created_at', { ascending: false })
    if (queryError) setError('Enquiries could not be loaded.')
    else setInquiries((data ?? []) as Inquiry[])
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadInquiries())
  }, [loadInquiries])

  const visibleInquiries = useMemo(() => {
    if (filter === 'all') return inquiries
    if (filter === 'active') return inquiries.filter((inquiry) => ['unread', 'read'].includes(inquiry.status))
    return inquiries.filter((inquiry) => inquiry.status === filter)
  }, [filter, inquiries])

  async function setStatus(inquiry: Inquiry, status: InquiryStatus) {
    if (!supabase) return
    setWorkingId(inquiry.id)
    setError('')
    setNotice('')
    const { error: updateError } = await supabase.from('contact_inquiries').update({ status }).eq('id', inquiry.id)
    if (updateError) setError('The enquiry could not be updated.')
    else {
      setInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, status } : item))
      setNotice(`Enquiry marked ${status}.`)
    }
    setWorkingId('')
  }

  async function convertToClient(inquiry: Inquiry) {
    if (!supabase || inquiry.client_id) return
    setWorkingId(inquiry.id)
    setError('')
    setNotice('')

    try {
      const workflow = workflowByInquiry[inquiry.id]?.trim() || null
      const matches = await findMatchingClients(inquiry.email, inquiry.phone)
      if (matches.length > 1) {
        setError('More than one existing client matches this enquiry. Open Clients and check the person before converting it.')
        setWorkingId('')
        return
      }

      let clientId = matches[0]?.id
      const existingName = matches[0]?.full_name
      let issueId: string
      let matterLabel: string

      if (!clientId) {
        const { data: created, error: createError } = await supabase
          .from('clients')
          .insert({
            full_name: inquiry.name,
            email: inquiry.email.toLowerCase(),
            phone: inquiry.phone,
            service_type: workflow,
            status: 'active',
          })
          .select('id')
          .single()
        if (createError) throw createError
        clientId = created.id as string

        const issue = await createClientIssue({
          clientId,
          serviceType: workflow,
          title: workflow || 'General enquiry',
          summary: inquiry.message,
        })
        issueId = issue.id
        matterLabel = formatIssueNumber(issue.issue_number)
      } else {
        const openIssue = workflow ? await getOpenIssueForService(clientId, workflow) : null
        if (openIssue) {
          const useExisting = window.confirm(
            `${existingName} already has open matter ${formatIssueNumber(openIssue.issue_number)} for ${workflow}.\n\nOK = file this enquiry under that matter.\nCancel = create a new matter for the same client.`,
          )
          if (useExisting) {
            issueId = openIssue.id
            matterLabel = formatIssueNumber(openIssue.issue_number)
          } else {
            const issue = await createClientIssue({ clientId, serviceType: workflow, title: workflow, summary: inquiry.message })
            issueId = issue.id
            matterLabel = formatIssueNumber(issue.issue_number)
          }
        } else {
          const issue = await createClientIssue({
            clientId,
            serviceType: workflow,
            title: workflow || 'General enquiry',
            summary: inquiry.message,
          })
          issueId = issue.id
          matterLabel = formatIssueNumber(issue.issue_number)
        }
      }

      const { error: updateError } = await supabase
        .from('contact_inquiries')
        .update({ status: 'converted', client_id: clientId, issue_id: issueId })
        .eq('id', inquiry.id)
      if (updateError) throw updateError

      setInquiries((current) => current.map((item) => item.id === inquiry.id
        ? { ...item, status: 'converted', client_id: clientId ?? null, issue_id: issueId }
        : item))
      setNotice(matches.length
        ? `Enquiry filed under ${existingName} · ${matterLabel}. No duplicate client was created.`
        : `Client created and enquiry filed under ${matterLabel}.`)
    } catch {
      setError('The enquiry could not be converted to a client matter.')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Contact inbox</p>
          <h1>Enquiries</h1>
          <p>Review website messages, choose the likely workflow and file work under the correct existing or new client matter.</p>
        </div>
        <button className="button secondary" type="button" onClick={loadInquiries}>Refresh</button>
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="admin-filter-row" role="group" aria-label="Enquiry filters">
        {filters.map((item) => (
          <button key={item.value} type="button" className={filter === item.value ? 'filter-button active' : 'filter-button'} onClick={() => setFilter(item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading enquiries…</div>
      ) : visibleInquiries.length ? (
        <div className="enquiry-list">
          {visibleInquiries.map((inquiry) => (
            <article className="dashboard-panel enquiry-card" key={inquiry.id}>
              <div className="enquiry-card-heading">
                <div>
                  <span className={`status-pill ${inquiry.status}`}>{inquiry.status}</span>
                  <h2>{inquiry.name}</h2>
                  <span>{formatNzDateTime(inquiry.created_at)}</span>
                </div>
                <div className="enquiry-contact-links">
                  <a href={`mailto:${inquiry.email}`}><Mail size={16} /> {inquiry.email}</a>
                  {inquiry.phone && <a href={`tel:${inquiry.phone.replace(/\s/g, '')}`}><Phone size={16} /> {inquiry.phone}</a>}
                </div>
              </div>

              <div className="enquiry-message"><p>{inquiry.message}</p></div>

              {!inquiry.client_id && (
                <label className="enquiry-workflow-field">
                  File under workflow <span className="optional">Optional</span>
                  <select value={workflowByInquiry[inquiry.id] ?? ''} onChange={(event) => setWorkflowByInquiry((current) => ({ ...current, [inquiry.id]: event.target.value }))}>
                    <option value="">General enquiry</option>
                    {siteConfig.services.filter((service) => service !== 'Other / Not sure').map((service) => <option key={service}>{service}</option>)}
                  </select>
                </label>
              )}

              <div className="admin-form-actions enquiry-actions">
                {inquiry.client_id ? (
                  <Link className="action-button" to={`/admin/clients/${inquiry.client_id}`}>View client matter</Link>
                ) : (
                  <button className="action-button" type="button" disabled={workingId === inquiry.id} onClick={() => void convertToClient(inquiry)}>
                    <UserPlus size={16} /> Link client and matter
                  </button>
                )}
                {inquiry.status === 'unread' && (
                  <button className="action-button confirm" type="button" disabled={workingId === inquiry.id} onClick={() => void setStatus(inquiry, 'read')}>
                    <Check size={16} /> Mark read
                  </button>
                )}
                {inquiry.status !== 'archived' && inquiry.status !== 'converted' && (
                  <button className="action-button cancel" type="button" disabled={workingId === inquiry.id} onClick={() => void setStatus(inquiry, 'archived')}>
                    <Archive size={16} /> Archive
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dashboard-panel empty-state">
          <Inbox size={28} />
          <h2>No enquiries here</h2>
          <p>There are no enquiries matching this filter.</p>
        </div>
      )}
    </>
  )
}
