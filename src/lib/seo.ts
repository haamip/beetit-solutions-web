import { useEffect } from 'react'
import { siteConfig } from '../config/site'

type SeoOptions = {
  title: string
  description: string
  path?: string
  noIndex?: boolean
}

const upsertMeta = (selector: string, attribute: string, value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    const match = selector.match(/meta\[(name|property)="([^"]+)"\]/)
    if (match) element.setAttribute(match[1], match[2])
    document.head.appendChild(element)
  }

  element.setAttribute(attribute, value)
}

export function useSeo({ title, description, path = '/', noIndex = false }: SeoOptions) {
  useEffect(() => {
    const fullTitle = `${title} | ${siteConfig.brand}`
    const canonicalUrl = new URL(path, window.location.origin).toString()

    document.title = fullTitle
    upsertMeta('meta[name="description"]', 'content', description)
    upsertMeta('meta[property="og:title"]', 'content', fullTitle)
    upsertMeta('meta[property="og:description"]', 'content', description)
    upsertMeta('meta[property="og:url"]', 'content', canonicalUrl)
    upsertMeta('meta[name="twitter:title"]', 'content', fullTitle)
    upsertMeta('meta[name="twitter:description"]', 'content', description)
    upsertMeta('meta[name="robots"]', 'content', noIndex ? 'noindex, nofollow' : 'index, follow')

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [title, description, path, noIndex])
}
