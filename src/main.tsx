import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './booking-admin.css'
import './booking-calendar.css'
import './admin.css'
import './completion.css'
import './service-detail-polish.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
