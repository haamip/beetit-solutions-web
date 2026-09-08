import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
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

function App() {
  return (
    <BrowserRouter>
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
