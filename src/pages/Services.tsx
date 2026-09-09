import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  FileCheck2,
  HeartHandshake,
  Scale,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { serviceDetails } from '../config/services'
import { useSeo } from '../lib/seo'

const serviceMeta = {
  'cultural-impact-assessments': { label: 'People & Community', Icon: UsersRound },
  'employment-advocacy': { label: 'Work & Opportunity', Icon: BriefcaseBusiness },
  'maori-land-court-support': { label: 'Te Tiriti & Land', Icon: Scale },
  'governance-and-compliance': { label: 'Risk & Accountability', Icon: FileCheck2 },
  'elderly-care-advocacy': { label: 'People at Every Stage', Icon: HeartHandshake },
  'insurance-claims-assistance': { label: 'Access & Entitlements', Icon: ShieldCheck },
  'te-tiriti-treaty-research-advisory': { label: 'Research & Advisory', Icon: BookOpenCheck },
} as const

export function Services() {
  useSeo({
    title: 'Services',
    description: 'Explore legal advocacy and advisory services from Donna Pokere Phillips, including employment, Māori Land Court, governance, cultural impact assessments and Te Tiriti research.',
    path: '/services',
  })

  return (
    <section className="page-section services-index-page">
      <div className="container services-index-shell">
        <header className="services-index-heading">
          <p className="eyebrow">Services</p>
          <h1>Practical support for the matters that matter.</h1>
          <p>Choose the area that best fits what you need. Each service page gives you the essentials without the legal jargon.</p>
        </header>

        <div className="services-index-grid">
          {serviceDetails.map((service, index) => {
            const meta = serviceMeta[service.slug as keyof typeof serviceMeta]
            const Icon = meta?.Icon ?? Scale
            return (
              <Link className="services-index-card" key={service.slug} to={`/services/${service.slug}`}>
                <div className="services-index-card-top">
                  <span className="services-index-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="services-index-icon"><Icon size={19} strokeWidth={1.8} /></span>
                </div>
                <div className="services-index-card-copy">
                  <span className="services-index-label">{meta?.label ?? 'Advisory support'}</span>
                  <h2>{service.name}</h2>
                  <p>{service.summary}</p>
                </div>
                <div className="services-index-card-action">
                  <span>View service</span>
                  <span className="services-index-arrow"><ArrowRight size={17} /></span>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="services-index-not-sure">
          <div>
            <p className="eyebrow">Not sure where it fits?</p>
            <h2>Start with a conversation.</h2>
            <p>If your matter does not fit neatly into one area, choose “Other / Not sure” when booking and briefly explain what you need help with.</p>
          </div>
          <Link className="button primary" to="/book?service=Other%20%2F%20Not%20sure">Book a consultation <ArrowRight size={17} /></Link>
        </div>
      </div>
    </section>
  )
}
