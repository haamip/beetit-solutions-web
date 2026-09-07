import { ArrowRight, CalendarDays, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { siteConfig } from '../config/site'
import { useSeo } from '../lib/seo'

export function Home() {
  useSeo({
    title: 'Legal Advocacy & Advisory',
    description: siteConfig.description,
    path: '/',
  })

  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
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

          <aside className="hero-panel" aria-label="Consultation details">
            <CalendarDays size={30} />
            <h2>60 minute consultations</h2>
            <p>{siteConfig.bookingHours}</p>
            <p>Friday by arrangement</p>
          </aside>
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

      <section className="section section-soft">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Services</p>
              <h2>Support across a range of matters.</h2>
            </div>
            <Link className="text-link" to="/services">
              View all services <ArrowRight size={17} />
            </Link>
          </div>

          <div className="service-grid">
            {siteConfig.services.slice(0, 6).map((service) => (
              <article className="service-card" key={service}>
                <ShieldCheck size={22} />
                <h3>{service}</h3>
              </article>
            ))}
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
