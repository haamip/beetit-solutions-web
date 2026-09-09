import { Mail, Save, Settings, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { siteConfig } from '../../config/site'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string | null
}

export function AdminSettings() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    queueMicrotask(async () => {
      if (!supabase) return
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) {
        setLoading(false)
        return
      }
      const { data, error: queryError } = await supabase
        .from('admin_users')
        .select('id, email, full_name')
        .eq('id', userId)
        .maybeSingle()
      if (queryError || !data) setError('Account settings could not be loaded.')
      else setProfile(data as Profile)
      setLoading(false)
    })
  }, [])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    const data = new FormData(event.currentTarget)
    const fullName = String(data.get('fullName') ?? '').trim()
    if (!fullName) return

    setSaving(true)
    setError('')
    setNotice('')
    const { data: updated, error: updateError } = await supabase
      .from('admin_users')
      .update({ full_name: fullName })
      .eq('id', profile.id)
      .select('id, email, full_name')
      .single()
    if (updateError || !updated) setError('Your admin name could not be saved.')
    else {
      setProfile(updated as Profile)
      setNotice('Admin profile updated.')
    }
    setSaving(false)
  }

  if (loading) return <div className="dashboard-loading">Loading settings…</div>

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Settings</h1>
          <p>Account details and the live platform configuration used by Beet It Solutions.</p>
        </div>
        <Settings size={24} />
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="settings-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Your account</p>
              <h2>Admin profile</h2>
            </div>
            <ShieldCheck size={21} />
          </div>

          {profile ? (
            <form className="settings-form" onSubmit={saveProfile}>
              <label>
                Display name
                <input name="fullName" defaultValue={profile.full_name ?? ''} required />
              </label>
              <label>
                Sign in email
                <input value={profile.email} readOnly />
                <span className="field-help">Admin email changes are handled separately so access cannot be changed accidentally.</span>
              </label>
              <button className="button primary" type="submit" disabled={saving}><Save size={17} /> {saving ? 'Saving…' : 'Save profile'}</button>
            </form>
          ) : <p>Admin profile unavailable.</p>}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Live configuration</p>
              <h2>Platform details</h2>
            </div>
            <Mail size={21} />
          </div>
          <div className="settings-summary-list">
            <div><span>Public contact email</span><strong>{siteConfig.email}</strong></div>
            <div><span>Booking hours</span><strong>{siteConfig.bookingHours}</strong></div>
            <div><span>Booking length</span><strong>{siteConfig.bookingLength}</strong></div>
            <div><span>Transactional sender</span><strong>Beet It Solutions via haktindustries.co.nz</strong></div>
            <div><span>Email delivery</span><strong>Resend connected</strong></div>
            <div><span>Client documents</span><strong>Private Supabase storage</strong></div>
          </div>
        </section>
      </div>
    </>
  )
}
