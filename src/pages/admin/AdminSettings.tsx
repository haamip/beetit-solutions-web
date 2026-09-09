import { ImagePlus, Mail, Palette, RefreshCcw, Save, Settings, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { siteConfig } from '../../config/site'
import { defaultSiteSettings } from '../../lib/siteSettings'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string | null
}

type SiteDraft = {
  primaryColor: string
  backgroundColor: string
  accentColor: string
  heroImagePath: string | null
  heroPosition: string
  heroOverlayStrength: number
  heroEyebrow: string
  heroTitle: string
  heroLead: string
  publicEmail: string
  publicPhone: string
  publicLocation: string
}

const defaultDraft: SiteDraft = {
  primaryColor: defaultSiteSettings.primaryColor,
  backgroundColor: defaultSiteSettings.backgroundColor,
  accentColor: defaultSiteSettings.accentColor,
  heroImagePath: null,
  heroPosition: defaultSiteSettings.heroPosition,
  heroOverlayStrength: defaultSiteSettings.heroOverlayStrength,
  heroEyebrow: defaultSiteSettings.heroEyebrow,
  heroTitle: defaultSiteSettings.heroTitle,
  heroLead: defaultSiteSettings.heroLead,
  publicEmail: defaultSiteSettings.publicEmail,
  publicPhone: defaultSiteSettings.publicPhone,
  publicLocation: defaultSiteSettings.publicLocation,
}

export function AdminSettings() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [site, setSite] = useState<SiteDraft>(defaultDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
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

      const [profileResult, settingsResult] = await Promise.all([
        supabase.from('admin_users').select('id, email, full_name').eq('id', userId).maybeSingle(),
        supabase
          .from('site_settings')
          .select('primary_color, background_color, accent_color, hero_image_path, hero_position, hero_overlay_strength, hero_eyebrow, hero_title, hero_lead, public_email, public_phone, public_location')
          .eq('id', 1)
          .maybeSingle(),
      ])

      if (profileResult.error || !profileResult.data) setError('Account settings could not be loaded.')
      else setProfile(profileResult.data as Profile)

      if (settingsResult.data) {
        const data = settingsResult.data
        setSite({
          primaryColor: data.primary_color || defaultDraft.primaryColor,
          backgroundColor: data.background_color || defaultDraft.backgroundColor,
          accentColor: data.accent_color || defaultDraft.accentColor,
          heroImagePath: data.hero_image_path || null,
          heroPosition: data.hero_position || defaultDraft.heroPosition,
          heroOverlayStrength: Number(data.hero_overlay_strength ?? 1),
          heroEyebrow: data.hero_eyebrow || defaultDraft.heroEyebrow,
          heroTitle: data.hero_title || defaultDraft.heroTitle,
          heroLead: data.hero_lead || defaultDraft.heroLead,
          publicEmail: data.public_email || defaultDraft.publicEmail,
          publicPhone: data.public_phone || defaultDraft.publicPhone,
          publicLocation: data.public_location || defaultDraft.publicLocation,
        })
      }
      setLoading(false)
    })
  }, [])

  const heroPreviewUrl = useMemo(() => {
    if (!site.heroImagePath || !supabase) return '/donna-hero-mockup4.jpg'
    return supabase.storage.from('site-assets').getPublicUrl(site.heroImagePath).data.publicUrl
  }, [site.heroImagePath])

  function broadcastSettingsUpdate() {
    window.dispatchEvent(new Event('beetit-site-settings-updated'))
  }

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

  async function saveWebsiteSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    const data = new FormData(event.currentTarget)
    const next: SiteDraft = {
      ...site,
      primaryColor: String(data.get('primaryColor') ?? site.primaryColor),
      backgroundColor: String(data.get('backgroundColor') ?? site.backgroundColor),
      accentColor: String(data.get('accentColor') ?? site.accentColor),
      heroPosition: String(data.get('heroPosition') ?? site.heroPosition),
      heroOverlayStrength: Number(data.get('heroOverlayStrength') ?? site.heroOverlayStrength),
      heroEyebrow: String(data.get('heroEyebrow') ?? '').trim(),
      heroTitle: String(data.get('heroTitle') ?? '').trim(),
      heroLead: String(data.get('heroLead') ?? '').trim(),
      publicEmail: String(data.get('publicEmail') ?? '').trim(),
      publicPhone: String(data.get('publicPhone') ?? '').trim(),
      publicLocation: String(data.get('publicLocation') ?? '').trim(),
    }

    setSaving(true)
    setError('')
    setNotice('')
    const { error: updateError } = await supabase
      .from('site_settings')
      .update({
        primary_color: next.primaryColor,
        background_color: next.backgroundColor,
        accent_color: next.accentColor,
        hero_position: next.heroPosition,
        hero_overlay_strength: next.heroOverlayStrength,
        hero_eyebrow: next.heroEyebrow,
        hero_title: next.heroTitle,
        hero_lead: next.heroLead,
        public_email: next.publicEmail,
        public_phone: next.publicPhone,
        public_location: next.publicLocation,
        updated_by: profile.id,
      })
      .eq('id', 1)

    if (updateError) setError('The website settings could not be saved.')
    else {
      setSite(next)
      document.documentElement.style.setProperty('--olive-dark', next.primaryColor)
      document.documentElement.style.setProperty('--cream', next.backgroundColor)
      document.documentElement.style.setProperty('--warm', next.accentColor)
      broadcastSettingsUpdate()
      setNotice('Website settings saved and published.')
    }
    setSaving(false)
  }

  async function uploadHero(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    const form = event.currentTarget
    const input = form.elements.namedItem('heroImage') as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Use a JPG, PNG, WEBP or AVIF hero photo.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Keep the hero image under 10 MB.')
      return
    }

    setUploadingHero(true)
    setError('')
    setNotice('')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `hero/${crypto.randomUUID()}-${safeName}`
    const previousPath = site.heroImagePath

    const { error: uploadError } = await supabase.storage.from('site-assets').upload(path, file, {
      upsert: false,
      contentType: file.type,
    })

    if (uploadError) {
      setError('The hero image could not be uploaded.')
      setUploadingHero(false)
      return
    }

    const { error: updateError } = await supabase
      .from('site_settings')
      .update({ hero_image_path: path, updated_by: profile.id })
      .eq('id', 1)

    if (updateError) {
      await supabase.storage.from('site-assets').remove([path])
      setError('The hero image uploaded but could not be published.')
    } else {
      if (previousPath) await supabase.storage.from('site-assets').remove([previousPath])
      setSite((current) => ({ ...current, heroImagePath: path }))
      form.reset()
      broadcastSettingsUpdate()
      setNotice('New hero photo published. The site automatically applies the crop and gradient blend.')
    }
    setUploadingHero(false)
  }

  async function resetWebsiteStyle() {
    if (!supabase || !profile) return
    if (!window.confirm('Reset colours and hero wording to the Beet It design defaults? The current uploaded photo will stay in place.')) return

    setSaving(true)
    const next = { ...defaultDraft, heroImagePath: site.heroImagePath }
    const { error: updateError } = await supabase
      .from('site_settings')
      .update({
        primary_color: next.primaryColor,
        background_color: next.backgroundColor,
        accent_color: next.accentColor,
        hero_position: next.heroPosition,
        hero_overlay_strength: next.heroOverlayStrength,
        hero_eyebrow: next.heroEyebrow,
        hero_title: next.heroTitle,
        hero_lead: next.heroLead,
        public_email: next.publicEmail,
        public_phone: next.publicPhone,
        public_location: next.publicLocation,
        updated_by: profile.id,
      })
      .eq('id', 1)
    if (updateError) setError('The website defaults could not be restored.')
    else {
      setSite(next)
      broadcastSettingsUpdate()
      setNotice('Beet It website defaults restored.')
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
          <p>Safe controls for the admin account and public website. The design system keeps the layout, contrast and hero blend consistent.</p>
        </div>
        <Settings size={24} />
      </div>

      {error && <div className="form-status error">{error}</div>}
      {notice && <div className="form-status success">{notice}</div>}

      <div className="settings-grid settings-grid-top">
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
                <span className="field-help">Admin email changes stay protected so access cannot be changed accidentally.</span>
              </label>
              <button className="button primary" type="submit" disabled={saving}><Save size={17} /> {saving ? 'Saving…' : 'Save profile'}</button>
            </form>
          ) : <p>Admin profile unavailable.</p>}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Infrastructure</p>
              <h2>Platform details</h2>
            </div>
            <Mail size={21} />
          </div>
          <div className="settings-summary-list">
            <div><span>Booking hours</span><strong>{siteConfig.bookingHours}</strong></div>
            <div><span>Booking length</span><strong>{siteConfig.bookingLength}</strong></div>
            <div><span>Transactional sender</span><strong>Beet It Solutions via haktindustries.co.nz</strong></div>
            <div><span>Email delivery</span><strong>Resend connected</strong></div>
            <div><span>Client documents</span><strong>Private Supabase storage</strong></div>
            <div><span>Website images</span><strong>Managed site assets</strong></div>
          </div>
        </section>
      </div>

      <form className="dashboard-panel website-editor" onSubmit={saveWebsiteSettings}>
        <div className="dashboard-panel-heading">
          <div>
            <p className="eyebrow">Website editor</p>
            <h2>Brand, hero and public details</h2>
            <p>These are the controls Donna can safely change without touching code.</p>
          </div>
          <Palette size={22} />
        </div>

        <div className="website-editor-grid">
          <section className="website-editor-section">
            <h3>Brand colours</h3>
            <p>Only the core palette changes. Buttons, headings and backgrounds update automatically.</p>
            <div className="colour-control-grid">
              <label>
                Primary
                <span className="colour-input-row"><input name="primaryColor" type="color" value={site.primaryColor} onChange={(event) => setSite((current) => ({ ...current, primaryColor: event.target.value }))} /><code>{site.primaryColor}</code></span>
              </label>
              <label>
                Page background
                <span className="colour-input-row"><input name="backgroundColor" type="color" value={site.backgroundColor} onChange={(event) => setSite((current) => ({ ...current, backgroundColor: event.target.value }))} /><code>{site.backgroundColor}</code></span>
              </label>
              <label>
                Accent
                <span className="colour-input-row"><input name="accentColor" type="color" value={site.accentColor} onChange={(event) => setSite((current) => ({ ...current, accentColor: event.target.value }))} /><code>{site.accentColor}</code></span>
              </label>
            </div>
          </section>

          <section className="website-editor-section">
            <h3>Hero wording</h3>
            <div className="settings-form">
              <label>Small heading<input name="heroEyebrow" value={site.heroEyebrow} onChange={(event) => setSite((current) => ({ ...current, heroEyebrow: event.target.value }))} required /></label>
              <label>Main heading<textarea name="heroTitle" rows={2} value={site.heroTitle} onChange={(event) => setSite((current) => ({ ...current, heroTitle: event.target.value }))} required /></label>
              <label>Intro text<textarea name="heroLead" rows={3} value={site.heroLead} onChange={(event) => setSite((current) => ({ ...current, heroLead: event.target.value }))} required /></label>
            </div>
          </section>

          <section className="website-editor-section">
            <h3>Hero photo treatment</h3>
            <p>The photo is always cropped to fill the hero and automatically fades into the selected page background.</p>
            <div className="settings-form">
              <label>
                Photo focus
                <select name="heroPosition" value={site.heroPosition} onChange={(event) => setSite((current) => ({ ...current, heroPosition: event.target.value }))}>
                  <option value="center center">Centre</option>
                  <option value="60% center">Slightly right</option>
                  <option value="72% center">Right</option>
                  <option value="82% center">Far right</option>
                  <option value="40% center">Slightly left</option>
                </select>
              </label>
              <label>
                Fade strength <strong>{site.heroOverlayStrength.toFixed(2)}</strong>
                <input name="heroOverlayStrength" type="range" min="0.5" max="1.3" step="0.05" value={site.heroOverlayStrength} onChange={(event) => setSite((current) => ({ ...current, heroOverlayStrength: Number(event.target.value) }))} />
              </label>
            </div>
          </section>

          <section className="website-editor-section">
            <h3>Public contact details</h3>
            <div className="settings-form">
              <label>Email<input name="publicEmail" type="email" value={site.publicEmail} onChange={(event) => setSite((current) => ({ ...current, publicEmail: event.target.value }))} required /></label>
              <label>Phone<input name="publicPhone" value={site.publicPhone} onChange={(event) => setSite((current) => ({ ...current, publicPhone: event.target.value }))} required /></label>
              <label>Location<input name="publicLocation" value={site.publicLocation} onChange={(event) => setSite((current) => ({ ...current, publicLocation: event.target.value }))} required /></label>
            </div>
          </section>
        </div>

        <div className="settings-hero-preview" style={{ backgroundColor: site.backgroundColor }}>
          <div className="settings-hero-preview-image" style={{ backgroundImage: `url(${heroPreviewUrl})`, backgroundPosition: site.heroPosition }} />
          <div className="settings-hero-preview-overlay" style={{ opacity: site.heroOverlayStrength }} />
          <div className="settings-hero-preview-copy">
            <span>{site.heroEyebrow}</span>
            <strong>{site.heroTitle}</strong>
            <p>{site.heroLead}</p>
          </div>
        </div>

        <div className="website-editor-actions">
          <button className="button secondary" type="button" onClick={() => void resetWebsiteStyle()} disabled={saving}><RefreshCcw size={16} /> Restore Beet It defaults</button>
          <button className="button primary" type="submit" disabled={saving}><Save size={17} /> {saving ? 'Publishing…' : 'Save and publish website settings'}</button>
        </div>
      </form>

      <section className="dashboard-panel hero-upload-panel">
        <div className="dashboard-panel-heading">
          <div>
            <p className="eyebrow">Hero image</p>
            <h2>Replace homepage photo</h2>
            <p>Upload the normal photo. Beet It handles the crop, positioning and gradient automatically.</p>
          </div>
          <ImagePlus size={22} />
        </div>
        <form className="hero-upload-form" onSubmit={uploadHero}>
          <input name="heroImage" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
          <button className="button primary" type="submit" disabled={uploadingHero}>{uploadingHero ? 'Uploading…' : 'Upload and publish hero photo'}</button>
        </form>
      </section>
    </>
  )
}
