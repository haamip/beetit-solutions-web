/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { siteConfig } from '../config/site'
import { supabase } from './supabase'

export type SiteSettings = {
  primaryColor: string
  backgroundColor: string
  accentColor: string
  heroImagePath: string | null
  heroImageUrl: string
  heroPosition: string
  heroOverlayStrength: number
  heroEyebrow: string
  heroTitle: string
  heroLead: string
  publicEmail: string
  publicPhone: string
  publicLocation: string
}

export const defaultSiteSettings: SiteSettings = {
  primaryColor: '#434a38',
  backgroundColor: '#f5f1e8',
  accentColor: '#d6b76e',
  heroImagePath: null,
  heroImageUrl: '/donna-hero-mockup4.jpg',
  heroPosition: '72% center',
  heroOverlayStrength: 1,
  heroEyebrow: 'Donna Pokere Phillips',
  heroTitle: 'Clear, practical advocacy and advisory support.',
  heroLead: 'Professional and culturally grounded support for individuals, whānau, organisations and communities.',
  publicEmail: siteConfig.email,
  publicPhone: siteConfig.phone,
  publicLocation: siteConfig.location,
}

const SiteSettingsContext = createContext<SiteSettings>(defaultSiteSettings)

function publicAssetUrl(path: string | null) {
  if (!path || !supabase) return defaultSiteSettings.heroImageUrl
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl || defaultSiteSettings.heroImageUrl
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings)

  const loadSettings = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('site_settings')
      .select('primary_color, background_color, accent_color, hero_image_path, hero_position, hero_overlay_strength, hero_eyebrow, hero_title, hero_lead, public_email, public_phone, public_location')
      .eq('id', 1)
      .maybeSingle()

    if (!data) return
    setSettings({
      primaryColor: data.primary_color || defaultSiteSettings.primaryColor,
      backgroundColor: data.background_color || defaultSiteSettings.backgroundColor,
      accentColor: data.accent_color || defaultSiteSettings.accentColor,
      heroImagePath: data.hero_image_path || null,
      heroImageUrl: publicAssetUrl(data.hero_image_path || null),
      heroPosition: data.hero_position || defaultSiteSettings.heroPosition,
      heroOverlayStrength: Number(data.hero_overlay_strength ?? 1),
      heroEyebrow: data.hero_eyebrow || defaultSiteSettings.heroEyebrow,
      heroTitle: data.hero_title || defaultSiteSettings.heroTitle,
      heroLead: data.hero_lead || defaultSiteSettings.heroLead,
      publicEmail: data.public_email || defaultSiteSettings.publicEmail,
      publicPhone: data.public_phone || defaultSiteSettings.publicPhone,
      publicLocation: data.public_location || defaultSiteSettings.publicLocation,
    })
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadSettings())
    const refresh = () => void loadSettings()
    window.addEventListener('beetit-site-settings-updated', refresh)
    return () => window.removeEventListener('beetit-site-settings-updated', refresh)
  }, [loadSettings])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--olive-dark', settings.primaryColor)
    root.style.setProperty('--cream', settings.backgroundColor)
    root.style.setProperty('--warm', settings.accentColor)
  }, [settings.accentColor, settings.backgroundColor, settings.primaryColor])

  const value = useMemo(() => settings, [settings])
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
