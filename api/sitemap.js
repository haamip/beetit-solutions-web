const paths = [
  '/',
  '/services',
  '/services/cultural-impact-assessments',
  '/services/employment-advocacy',
  '/services/maori-land-court-support',
  '/services/governance-and-compliance',
  '/services/elderly-care-advocacy',
  '/services/insurance-claims-assistance',
  '/services/te-tiriti-treaty-research-advisory',
  '/book',
  '/contact',
  '/privacy',
  '/terms',
]

export default function handler(request, response) {
  const forwardedHost = request.headers['x-forwarded-host']
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || request.headers.host
  const forwardedProto = request.headers['x-forwarded-proto']
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https'
  const origin = `${protocol}://${host}`

  const urls = paths
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join('\n')

  response.setHeader('Content-Type', 'application/xml; charset=utf-8')
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600')
  response.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
}
