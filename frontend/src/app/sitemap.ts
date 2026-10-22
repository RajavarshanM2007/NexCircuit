import type { MetadataRoute } from 'next'
import { api } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vit.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                                    lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/about`,                         lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/shipping`,                      lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/returns`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/collections/smart-devices`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/collections/computing`,         lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/collections/wearables`,         lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/collections/gaming-gear`,       lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/collections/drones-cameras`,    lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
  ]

  // Dynamic category pages
  let categoryPages: MetadataRoute.Sitemap = []
  try {
    const res = await api.get('/products/categories')
    const categories: any[] = res.data ?? []
    const allCats = categories.flatMap((c: any) => [c, ...(c.children ?? [])])
    categoryPages = allCats.map((cat: any) => ({
      url:             `${SITE_URL}/collections/${cat.slug}`,
      lastModified:    now,
      changeFrequency: 'daily' as const,
      priority:        0.8,
    }))
  } catch {}

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = []
  try {
    const res = await api.get('/products', { params: { limit: 1000 } })
    const products: any[] = res.data?.products ?? []
    productPages = products.map((p: any) => ({
      url:             `${SITE_URL}/products/${p.slug}`,
      lastModified:    p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))
  } catch {}

  return [...staticPages, ...categoryPages, ...productPages]
}
