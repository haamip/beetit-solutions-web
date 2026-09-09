import { readFile } from 'node:fs/promises'

const requiredFiles = {
  index: 'index.html',
  robots: 'api/robots.js',
  sitemap: 'api/sitemap.js',
  app: 'src/App.tsx',
  seo: 'src/lib/seo.ts',
}

const files = Object.fromEntries(
  await Promise.all(
    Object.entries(requiredFiles).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
  ),
)

const checks = [
  ['HTML language is NZ English', files.index.includes('lang="en-NZ"')],
  ['Meta description exists', files.index.includes('name="description"')],
  ['Canonical URL uses deployed origin', files.seo.includes('window.location.origin') && files.seo.includes('link[rel="canonical"]')],
  ['Open Graph metadata exists', files.index.includes('property="og:title"')],
  ['Twitter metadata exists', files.index.includes('name="twitter:card"')],
  ['Structured data exists', files.index.includes('application/ld+json')],
  ['robots.txt is generated from deployed host', files.robots.includes('Sitemap: ${origin}/sitemap.xml')],
  ['Admin is blocked in robots.txt', files.robots.includes('Disallow: /admin')],
  ['Secure upload pages are blocked in robots.txt', files.robots.includes('Disallow: /client-id/')],
  ['Home is in sitemap', files.sitemap.includes("'/'")],
  ['Services is in sitemap', files.sitemap.includes("'/services'")],
  ['Book is in sitemap', files.sitemap.includes("'/book'")],
  ['Contact is in sitemap', files.sitemap.includes("'/contact'")],
  ['Dedicated service pages are in sitemap', files.sitemap.includes("'/services/employment-advocacy'") && files.sitemap.includes("'/services/maori-land-court-support'")],
  ['Admin is excluded from sitemap', !files.sitemap.includes("'/admin")],
  ['Unrelated freedom.kiwi domain is removed', !Object.values(files).some((content) => content.includes('freedom.kiwi'))],
  ['Vite starter copy is removed', !files.app.includes('Get started') && !files.app.includes('Count is')],
]

const failures = checks.filter(([, passed]) => !passed)

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`)
}

if (failures.length) {
  console.error(`\nSEO audit failed with ${failures.length} issue(s).`)
  process.exit(1)
}

console.log('\nSEO audit passed.')
