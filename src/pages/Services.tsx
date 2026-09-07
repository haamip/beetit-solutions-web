import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { siteConfig } from '../config/site'
import { useSeo } from '../lib/seo'

const descriptions: Record<string, string> = {
  'Cultural Impact Assessments': 'Independent cultural impact assessment support and reporting for relevant projects and processes.',
  'Employment Advocacy': 'Practical support with employment matters, workplace issues, correspondence and advocacy.',
  'Māori Land Court Support': 'Assistance understanding processes, preparing information and navigating Māori Land Court matters.',
  'Governance and Compliance': 'Support for governance responsibilities, policy, compliance and decision making.',
  'Elderly Care Advocacy': 'Advocacy and support for older people and whānau navigating care, services and important decisions.',
  'Insurance Claims Assistance': 'Help understanding, preparing and progressing insurance claims and related correspondence.',
  'Te Tiriti and Treaty Research and Advisory': 'Research and advisory support relating to Te Tiriti o Waitangi and Treaty matters.',
}

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
          Choose the area that best matches what you need help with. Detailed professional advice is provided after contact and consultation.
        </p>
      </div>

      <div className="container service-list">
        {siteConfig.services.map((service, index) => (
          <article className="service-row" key={service}>
            <span className="service-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{service}</h2>
              <p>{descriptions[service]}</p>
            </div>
            <Link aria-label={`Book a consultation for ${service}`} to="/book">
              <ArrowRight size={22} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
