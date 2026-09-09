export default function handler(request, response) {
  const forwardedHost = request.headers['x-forwarded-host']
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || request.headers.host
  const forwardedProto = request.headers['x-forwarded-proto']
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https'
  const origin = `${protocol}://${host}`

  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600')
  response.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /client-id/\n\nSitemap: ${origin}/sitemap.xml\n`)
}
