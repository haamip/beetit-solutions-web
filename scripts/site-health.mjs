const siteUrl = process.env.SITE_URL

if (!siteUrl) {
  console.log('SITE_URL is not set. Production uptime check skipped.')
  process.exit(0)
}

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 15000)

try {
  const response = await fetch(siteUrl, {
    redirect: 'follow',
    signal: controller.signal,
    headers: { 'user-agent': 'HAKT-Production-Agent/1.0' },
  })

  const body = await response.text()

  if (!response.ok) {
    throw new Error(`Site returned HTTP ${response.status}`)
  }

  if (/Get started|Vite \+ React|Count is/i.test(body)) {
    throw new Error('Starter content detected on production site')
  }

  console.log(`Production health check passed: ${response.status} ${response.url}`)
} catch (error) {
  console.error(`Production health check failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
} finally {
  clearTimeout(timeout)
}
