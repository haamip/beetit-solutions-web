import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { serviceDetails } from '../config/services'
import { useSeo } from '../lib/seo'

export function Services() {
  useSeo({
    title: 'Services',
    description: 'Explore legal advocacy and advisory services from Donna Pokere Phillips, including employment, Māori Land Court, governance, cultural impact assessments and Te Tiriti research.',
    path: '/services',
  })

  return (
    <section className="page-section">
      <div className="container narrow-heading">
        <p className="eyebrow">Services</p>
        <h1>Practical support, explained clearly.</h1>
        <p>
          Choose the area that best matches what you need help with. Each page explains the type of support available and what to expect next.
        </p>
      </div>

      <div className="container service-list">
        {serviceDetails.map((service, index) => (
          <article className="service-row" key={service.slug}>
            <span className="service-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{service.name}</h2>
              <p>{service.summary}</p>
            </div>
            <Link aria-label={`Read about ${service.name}`} to={`/services/${service.slug}`}>
              <ArrowRight size={22} />
            </Link>
          </article>
        ))}
      </div>

      <div className="container service-not-sure">
        <div>
          <p className="eyebrow">Not sure where it fits?</p>
          <h2>Start with a conversation.</h2>
          <p>If your matter does not fit neatly into one of these areas, choose “Other / Not sure” when booking and briefly explain what you need help with.</p>
        </div>
        <Link className="button secondary" to="/book?service=Other%20%2F%20Not%20sure">Book a consultation <ArrowRight size={17} /></Link>
      </div>
    </section>
  )
}
