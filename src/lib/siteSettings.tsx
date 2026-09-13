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
  heroImageScale: number
  heroHeight: number
  heroEyebrow: string
  heroTitle: string
  heroLead: string
  publicEmail: string
  publicPhone: string
  publicLocation: string
  heroPrimaryButton: string
  heroSecondaryButton: string
  aboutEyebrow: string
  aboutTitle: string
  aboutBodyOne: string
  aboutBodyTwo: string
  servicesEyebrow: string
  servicesTitle: string
  servicesLink: string
  ctaEyebrow: string
  ctaTitle: string
  ctaBody: string
  ctaButton: string
}

export const defaultSiteSettings: SiteSettings = {
  primaryColor: '#434a38',
  backgroundColor: '#f5f1e8',
  accentColor: '#d6b76e',
  heroImagePath: null,
  heroImageUrl: '/donna-hero-mockup4.jpg',
  heroPosition: '72% center',
  heroOverlayStrength: 1,
  heroImageScale: 1,
  heroHeight: 410,
  heroEyebrow: 'Donna Pokere Phillips',
  heroTitle: 'Clear, practical advocacy and advisory support.',
  heroLead: 'Professional and culturally grounded support for individuals, whānau, organisations and communities.',
  publicEmail: siteConfig.email,
  publicPhone: siteConfig.phone,
  publicLocation: siteConfig.location,
  heroPrimaryButton: 'Book a consultation',
  heroSecondaryButton: 'View services',
  aboutEyebrow: 'About Donna',
  aboutTitle: 'Experience, clarity and a practical way forward.',
  aboutBodyOne: 'Donna holds an LLB, LLM (Hons) and BA, with more than 20 years of experience across governance, policy, advocacy and advisory work.',
  aboutBodyTwo: 'Her approach is practical, respectful and culturally grounded, with a focus on helping people understand their options and move forward with confidence.',
  servicesEyebrow: 'Services',
  servicesTitle: 'Support across a range of matters.',
  servicesLink: 'View all services',
  ctaEyebrow: 'Ready to talk?',
  ctaTitle: 'Start with a consultation.',
  ctaBody: 'Tell Donna what you need help with and choose a suitable consultation time.',
  ctaButton: 'Book now',
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
      .select('primary_color, background_color, accent_color, hero_image_path, hero_position, hero_overlay_strength, hero_image_scale, hero_height, hero_eyebrow, hero_title, hero_lead, public_email, public_phone, public_location, hero_primary_button, hero_secondary_button, about_eyebrow, about_title, about_body_one, about_body_two, services_eyebrow, services_title, services_link, cta_eyebrow, cta_title, cta_body, cta_button')
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
      heroOverlayStrength: Number(data.hero_overlay_strength ?? defaultSiteSettings.heroOverlayStrength),
      heroImageScale: Number(data.hero_image_scale ?? defaultSiteSettings.heroImageScale),
      heroHeight: Number(data.hero_height ?? defaultSiteSettings.heroHeight),
      heroEyebrow: data.hero_eyebrow || defaultSiteSettings.heroEyebrow,
      heroTitle: data.hero_title || defaultSiteSettings.heroTitle,
      heroLead: data.hero_lead || defaultSiteSettings.heroLead,
      publicEmail: data.public_email || defaultSiteSettings.publicEmail,
      publicPhone: data.public_phone || defaultSiteSettings.publicPhone,
      publicLocation: data.public_location || defaultSiteSettings.publicLocation,
      heroPrimaryButton: data.hero_primary_button || defaultSiteSettings.heroPrimaryButton,
      heroSecondaryButton: data.hero_secondary_button || defaultSiteSettings.heroSecondaryButton,
      aboutEyebrow: data.about_eyebrow || defaultSiteSettings.aboutEyebrow,
      aboutTitle: data.about_title || defaultSiteSettings.aboutTitle,
      aboutBodyOne: data.about_body_one || defaultSiteSettings.aboutBodyOne,
      aboutBodyTwo: data.about_body_two || defaultSiteSettings.aboutBodyTwo,
      servicesEyebrow: data.services_eyebrow || defaultSiteSettings.servicesEyebrow,
      servicesTitle: data.services_title || defaultSiteSettings.servicesTitle,
      servicesLink: data.services_link || defaultSiteSettings.servicesLink,
      ctaEyebrow: data.cta_eyebrow || defaultSiteSettings.ctaEyebrow,
      ctaTitle: data.cta_title || defaultSiteSettings.ctaTitle,
      ctaBody: data.cta_body || defaultSiteSettings.ctaBody,
      ctaButton: data.cta_button || defaultSiteSettings.ctaButton,
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
