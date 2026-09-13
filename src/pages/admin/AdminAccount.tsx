import { Save, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string | null
}

export function AdminAccount() {
  const { profile: initialProfile } = useOutletContext<{ profile: Profile }>()
  const [profile, setProfile] = useState(initialProfile)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

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

    if (updateError || !updated) {
      setError('Your account details could not be saved.')
    } else {
      setProfile(updated as Profile)
      setNotice('Account details saved.')
    }
    setSaving(false)
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Account</h1>
          <p>Update the name shown inside the administration area.</p>
        </div>
        <UserRound size={24} />
      </div>

      {error && <div className="form-status error" role="alert">{error}</div>}
      {notice && <div className="form-status success" role="status">{notice}</div>}

      <section className="dashboard-panel account-panel">
        <form className="settings-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input name="fullName" defaultValue={profile.full_name ?? ''} required />
          </label>
          <label>
            Sign in email
            <input value={profile.email} readOnly />
            <span className="field-help">This email is protected so admin access cannot be changed accidentally.</span>
          </label>
          <button className="button primary" type="submit" disabled={saving}>
            <Save size={17} /> {saving ? 'Saving…' : 'Save account'}
          </button>
        </form>
      </section>
    </>
  )
}
