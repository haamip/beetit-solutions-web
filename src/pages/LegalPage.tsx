import { useSeo } from '../lib/seo'

type LegalPageProps = {
  type: 'privacy' | 'terms'
}

export function LegalPage({ type }: LegalPageProps) {
  const isPrivacy = type === 'privacy'
  const title = isPrivacy ? 'Privacy Policy' : 'Website Terms'

  useSeo({
    title,
    description: `${title} for Beet It Solutions.`,
    path: isPrivacy ? '/privacy' : '/terms',
  })

  return (
    <section className="page-section">
      <div className="container legal-copy">
        <p className="eyebrow">Beet It Solutions</p>
        <h1>{title}</h1>
        <p>
          Final wording will be inserted before launch. This page is included now so the navigation, SEO structure and launch checklist are ready from the start.
        </p>
      </div>
    </section>
  )
}
