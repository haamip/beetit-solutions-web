import { bookingServiceNames } from './services'

export const siteConfig = {
  brand: 'Beet It Solutions',
  businessName: 'Donna Pokere Phillips Legal Advocacy & Advisory Services',
  baseUrl: 'https://freedom.kiwi',
  email: 'beetit.solutions@gmail.com',
  phone: '027 602 5011',
  location: 'Tuakau, Waikato and South Auckland',
  bookingLength: '60 minutes',
  bookingHours: 'Monday to Thursday, 10.00am to 4.00pm',
  description:
    'Practical legal advocacy and advisory support for individuals, whānau, organisations and communities across Waikato and South Auckland.',
  services: bookingServiceNames,
} as const
