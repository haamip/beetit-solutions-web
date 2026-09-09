import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { supabase } from './lib/supabase'
import { Admin } from './pages/Admin'
import { Book } from './pages/Book'
import { Contact } from './pages/Contact'
import { Home } from './pages/Home'
import { LegalPage } from './pages/LegalPage'
import { Services } from './pages/Services'
import { AdminBookings } from './pages/admin/AdminBookings'
import { AdminCalendar } from './pages/admin/AdminCalendar'
import { AdminClientDetail } from './pages/admin/AdminClientDetail'
import { AdminClients } from './pages/admin/AdminClients'
import { AdminDashboard } from './pages/admin/AdminDashboard'

const approvedAdminEmails = new Set([
  'haami@haktindustries.co.nz',
  'beetit.solutions@gmail.com',
])

function AdminAuthReturn() {
  useEffect(() => {
    const hasAuthPayload =
      window.location.hash.includes('access_token=') ||
      window.location.search.includes('code=') ||
      window.location.search.includes('token_hash=')
    const loginPending = window.localStorage.getItem('beetit_admin_login_pending') === '1'

    if (!hasAuthPayload && !loginPending) return

    let active = true

    const redirectIfAdmin = async () => {
      const { data } = await supabase.auth.getSession()
      const email = data.session?.user?.email?.trim().toLowerCase()

      if (!active || !email || !approvedAdminEmails.has(email)) return

      window.localStorage.removeItem('beetit_admin_login_pending')
      if (window.location.pathname !== '/admin') {
        window.location.replace('/admin')
      }
    }

    void redirectIfAdmin()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const email = session?.user?.email?.trim().toLowerCase()
      if (event !== 'SIGNED_IN' || !email || !approvedAdminEmails.has(email)) return

      window.localStorage.removeItem('beetit_admin_login_pending')
      if (window.location.pathname !== '/admin') {
        window.location.replace('/admin')
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <AdminAuthReturn />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="book" element={<Book />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<LegalPage type="privacy" />} />
          <Route path="terms" element={<LegalPage type="terms" />} />
        </Route>

        <Route path="admin" element={<Admin />}>
          <Route index element={<AdminDashboard />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="clients/:clientId" element={<AdminClientDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
