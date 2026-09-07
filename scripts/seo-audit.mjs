import { readFile } from 'node:fs/promises'

const requiredFiles = {
  index: 'index.html',
  robots: 'public/robots.txt',
  sitemap: 'public/sitemap.xml',
  app: 'src/App.tsx',
}

const files = Object.fromEntries(
  await Promise.all(
    Object.entries(requiredFiles).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
  ),
)

const checks = [
  ['HTML language is NZ English', files.index.includes('lang="en-NZ"')],
  ['Meta description exists', files.index.includes('name="description"')],
  ['Canonical URL exists', files.index.includes('rel="canonical"')],
  ['Open Graph metadata exists', files.index.includes('property="og:title"')],
  ['Twitter metadata exists', files.index.includes('name="twitter:card"')],
  ['Structured data exists', files.index.includes('application/ld+json')],
  ['robots.txt references sitemap', files.robots.includes('Sitemap:')],
  ['Admin is blocked in robots.txt', files.robots.includes('Disallow: /admin')],
  ['Home is in sitemap', files.sitemap.includes('<loc>https://freedom.kiwi/</loc>')],
  ['Services is in sitemap', files.sitemap.includes('<loc>https://freedom.kiwi/services</loc>')],
  ['Book is in sitemap', files.sitemap.includes('<loc>https://freedom.kiwi/book</loc>')],
  ['Contact is in sitemap', files.sitemap.includes('<loc>https://freedom.kiwi/contact</loc>')],
  ['Admin is excluded from sitemap', !files.sitemap.includes('/admin</loc>')],
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
