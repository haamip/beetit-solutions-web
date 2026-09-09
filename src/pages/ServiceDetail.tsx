import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  HeartHandshake,
  Scale,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getServiceBySlug } from '../config/services'
import { useSeo } from '../lib/seo'

const serviceIcons: Record<string, LucideIcon> = {
  'cultural-impact-assessments': UsersRound,
  'employment-advocacy': BriefcaseBusiness,
  'maori-land-court-support': Scale,
  'governance-and-compliance': FileCheck2,
  'elderly-care-advocacy': HeartHandshake,
  'insurance-claims-assistance': ShieldCheck,
  'te-tiriti-treaty-research-advisory': ScrollText,
}

export function ServiceDetail() {
  const { slug = '' } = useParams()
  const service = getServiceBySlug(slug)

  useSeo({
    title: service?.name ?? 'Service',
    description: service?.summary ?? 'Beet It Solutions advocacy and advisory services.',
    path: `/services/${slug}`,
    noIndex: !service,
  })

  if (!service) {
    return (
      <section className="page-section">
        <div className="container narrow-heading">
          <p className="eyebrow">Services</p>
          <h1>Service not found</h1>
          <p>The service you were looking for is not available at this address.</p>
          <Link className="button secondary" to="/services"><ArrowLeft size={17} /> Back to services</Link>
        </div>
      </section>
    )
  }

  const ServiceIcon = serviceIcons[service.slug] ?? ShieldCheck

  return (
    <section className={`page-section service-detail-page service-detail-${service.slug}`}>
      <div className="container service-detail-shell">
        <Link className="text-link service-back-link" to="/services"><ArrowLeft size={16} /> All services</Link>

        <div className="service-detail-heading">
          <p className="eyebrow">Service</p>
          <h1>{service.name}</h1>
          <p className="page-lead">{service.intro}</p>
        </div>

        <div className="service-detail-grid">
          <article className="service-detail-card">
            <div className="service-detail-card-watermark" aria-hidden="true">
              <ServiceIcon />
            </div>
            <div className="service-detail-card-content">
              <p className="service-card-kicker">Support</p>
              <h2>What Donna can help with</h2>
              <ul className="service-check-list">
                {service.helpWith.map((item) => <li key={item}><CheckCircle2 size={18} /> <span>{item}</span></li>)}
              </ul>
            </div>
          </article>

          <article className="service-detail-card">
            <div className="service-detail-card-watermark" aria-hidden="true">
              <ServiceIcon />
            </div>
            <div className="service-detail-card-content">
              <p className="service-card-kicker">Process</p>
              <h2>What to expect</h2>
              <ol className="service-steps">
                {service.approach.map((item, index) => (
                  <li key={item}><span>{index + 1}</span><p>{item}</p></li>
                ))}
              </ol>
            </div>
          </article>
        </div>

        <div className="service-detail-note">
          <p>This page provides general service information. The exact scope of any work is discussed and agreed after Donna understands your circumstances.</p>
        </div>

        <div className="service-detail-cta">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Talk through what you need.</h2>
          </div>
          <Link className="button primary" to={`/book?service=${encodeURIComponent(service.name)}`}>
            Book a consultation <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}
