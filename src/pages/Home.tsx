import {
  ArrowRight,
  BriefcaseBusiness,
  FileCheck2,
  HeartHandshake,
  Scale,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { siteConfig } from '../config/site'
import { serviceDetails } from '../config/services'
import { useSeo } from '../lib/seo'
import '../hero.css'

const homeServices = [
  {
    name: 'Cultural Impact Assessments',
    category: 'People & Community',
    Icon: UsersRound,
    variant: 'cultural',
  },
  {
    name: 'Employment Advocacy',
    category: 'Work & Opportunity',
    Icon: BriefcaseBusiness,
    variant: 'employment',
  },
  {
    name: 'Māori Land Court Support',
    category: 'Te Tiriti & Land',
    Icon: Scale,
    variant: 'land',
  },
  {
    name: 'Governance and Compliance',
    category: 'Risk & Accountability',
    Icon: FileCheck2,
    variant: 'governance',
  },
  {
    name: 'Elderly Care Advocacy',
    category: 'People at Every Stage',
    Icon: HeartHandshake,
    variant: 'care',
  },
  {
    name: 'Insurance Claims Assistance',
    category: 'Access & Entitlements',
    Icon: ShieldCheck,
    variant: 'insurance',
  },
] as const

export function Home() {
  useSeo({
    title: 'Legal Advocacy & Advisory',
    description: siteConfig.description,
    path: '/',
  })

  return (
    <>
      <section className="hero-section hero-photo-section">
        <div className="container hero-wide">
          <div className="hero-copy">
            <p className="eyebrow">Donna Pokere Phillips</p>
            <h1>Clear, practical advocacy and advisory support.</h1>
            <p className="hero-lead">
              Professional and culturally grounded support for individuals, whānau, organisations and communities.
            </p>
            <div className="button-row">
              <Link className="button primary" to="/book">
                Book a consultation <ArrowRight size={18} />
              </Link>
              <Link className="button secondary" to="/services">
                View services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-section">
          <div>
            <p className="eyebrow">About Donna</p>
            <h2>Experience, clarity and a practical way forward.</h2>
          </div>
          <div className="body-copy">
            <p>
              Donna holds an LLB, LLM (Hons) and BA, with more than 20 years of experience across governance, policy, advocacy and advisory work.
            </p>
            <p>
              Her approach is practical, respectful and culturally grounded, with a focus on helping people understand their options and move forward with confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-soft services-showcase">
        <div className="container">
          <div className="section-heading services-showcase-heading">
            <div>
              <p className="eyebrow">Services</p>
              <h2>Support across a range of matters.</h2>
            </div>
            <Link className="text-link" to="/services">
              View all services <ArrowRight size={17} />
            </Link>
          </div>

          <div className="service-grid service-grid-premium">
            {homeServices.map(({ name, category, Icon, variant }) => {
              const detail = serviceDetails.find((service) => service.name === name)
              return (
                <Link
                  className={`service-card-link service-card-${variant}`}
                  key={name}
                  to={detail ? `/services/${detail.slug}` : '/services'}
                  aria-label={`Learn more about ${name}`}
                >
                  <article className="service-card service-card-premium">
                    <div className="service-card-topline">
                      <span className="service-icon-badge"><Icon size={20} strokeWidth={1.8} /></span>
                      <span className="service-category">{category}</span>
                    </div>
                    <div className="service-card-content">
                      <h3>{name}</h3>
                      <span className="service-accent-line" aria-hidden="true" />
                    </div>
                    <div className="service-card-action">
                      <span>Learn more</span>
                      <span className="service-card-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container cta-card">
          <div>
            <p className="eyebrow">Ready to talk?</p>
            <h2>Start with a consultation.</h2>
            <p>Tell Donna what you need help with and choose a suitable consultation time.</p>
          </div>
          <Link className="button primary" to="/book">
            Book now <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  )
}
