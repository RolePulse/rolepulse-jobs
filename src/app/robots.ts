import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/employers/new', '/employers/post'],
    },
    sitemap: 'https://rolepulse.com/sitemap.xml',
  }
}
