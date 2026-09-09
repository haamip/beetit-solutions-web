import { CheckCircle2, LoaderCircle, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../identity.css'

type ValidationResponse = {
  valid?: boolean
  clientName?: string
}

export function ClientIdUpload() {
  const { token = '' } = useParams()
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [clientName, setClientName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const validate = async () => {
      setChecking(true)
      setError('')

      const { data, error: invokeError } = await supabase.functions.invoke<ValidationResponse>('client-id-upload', {
        body: { token },
      })

      if (!active) return

      if (invokeError || !data?.valid) {
        setValid(false)
        setError('This secure upload link is invalid, expired or has already been used. Please contact Beet It Solutions for a new link.')
      } else {
        setValid(true)
        setClientName(data.clientName ?? '')
      }

      setChecking(false)
    }

    void validate()
    return () => { active = false }
  }, [token])

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || uploading) return

    const form = event.currentTarget
    const input = form.elements.namedItem('idDocument') as HTMLInputElement | null
    const file = input?.files?.[0]

    if (!file) {
      setError('Choose a photo or PDF of your ID first.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Please keep the ID document under 10 MB.')
      return
    }

    setUploading(true)
    setError('')

    const body = new FormData()
    body.append('token', token)
    body.append('file', file)

    const { error: uploadError } = await supabase.functions.invoke('client-id-upload', { body })

    if (uploadError) {
      setError('The ID document could not be uploaded. Check the file type and try again, or ask Beet It Solutions for a new link.')
    } else {
      setUploaded(true)
      setValid(false)
      form.reset()
    }

    setUploading(false)
  }

  return (
    <section className="client-id-upload-section">
      <div className="client-id-upload-card">
        {checking ? (
          <div className="dashboard-loading"><LoaderCircle className="spin" size={22} /> Checking secure upload link…</div>
        ) : uploaded ? (
          <div className="client-id-success">
            <CheckCircle2 size={34} />
            <p className="eyebrow">Upload complete</p>
            <h1>Thank you.</h1>
            <p>Your ID document has been securely received by Beet It Solutions for identity verification.</p>
          </div>
        ) : valid ? (
          <>
            <p className="eyebrow">Secure identity check</p>
            <h1>Upload your ID</h1>
            <p>{clientName ? `Kia ora ${clientName}. ` : ''}Please upload a clear photo or PDF of an accepted identity document so Beet It Solutions can verify your details.</p>

            {error && <div className="form-status error">{error}</div>}

            <form className="client-id-upload-form" onSubmit={handleUpload}>
              <label>
                Identity document
                <input
                  name="idDocument"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  required
                />
              </label>
              <button className="button primary" type="submit" disabled={uploading}>
                {uploading ? <><LoaderCircle className="spin" size={18} /> Uploading…</> : <><Upload size={18} /> Upload ID securely</>}
              </button>
            </form>

            <div className="client-id-security-note">
              <ShieldCheck size={20} />
              <span>This link can only be used once. Your ID is stored in private secure storage and is only available to authorised Beet It Solutions administrators.</span>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Secure identity check</p>
            <h1>Upload link unavailable</h1>
            <div className="form-status error">{error}</div>
          </>
        )}
      </div>
    </section>
  )
}
