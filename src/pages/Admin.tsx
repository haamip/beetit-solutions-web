import { LockKeyhole } from 'lucide-react'
import { useSeo } from '../lib/seo'

export function Admin() {
  useSeo({
    title: 'Admin',
    description: 'Secure Beet It Solutions administration area.',
    path: '/admin',
    noIndex: true,
  })

  return (
    <section className="page-section admin-page">
      <div className="admin-card">
        <LockKeyhole size={30} />
        <p className="eyebrow">Secure admin</p>
        <h1>Donna's dashboard</h1>
        <p>
          Authentication, bookings, calendar, clients, private notes and admin document storage will be connected through Supabase.
        </p>
        <button className="button primary full-width" type="button" disabled>
          Admin connection coming next
        </button>
      </div>
    </section>
  )
}
