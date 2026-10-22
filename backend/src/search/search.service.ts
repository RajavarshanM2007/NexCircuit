import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Client } from '@opensearch-project/opensearch'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class SearchService implements OnModuleInit {
  private client?: Client
  private readonly INDEX = 'products'
  private readonly logger = new Logger(SearchService.name)
  private isConnected = false

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const endpoint =
      process.env.AWS_OPENSEARCH_ENDPOINT ||
      process.env.ELASTICSEARCH_ENDPOINT ||
      process.env.AWS_ELASTICSEARCH_URL

    if (!endpoint) {
      this.logger.log('AWS OpenSearch / Elasticsearch endpoint not configured. Search fallback to PostgreSQL enabled.')
      return
    }

    try {
      const clientConfig: any = {
        node: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
        requestTimeout: 10000,
      }

      if (process.env.AWS_OPENSEARCH_USERNAME && process.env.AWS_OPENSEARCH_PASSWORD) {
        clientConfig.auth = {
          username: process.env.AWS_OPENSEARCH_USERNAME,
          password: process.env.AWS_OPENSEARCH_PASSWORD,
        }
      }

      this.client = new Client(clientConfig)

      // Test connection
      await this.client.ping()
      this.isConnected = true
      this.logger.log(`Connected to AWS OpenSearch/Elasticsearch at: ${endpoint}`)

      // Ensure index exists
      const exists = await this.client.indices.exists({ index: this.INDEX })
      if (!exists.body) {
        await this.client.indices.create({
          index: this.INDEX,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                slug: { type: 'keyword' },
                sku: { type: 'keyword' },
                price: { type: 'double' },
                categoryId: { type: 'keyword' },
                image: { type: 'keyword' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'date' },
              },
            },
          },
        })
        this.logger.log(`Created OpenSearch index: ${this.INDEX}`)
      }

      const products = await this.prisma.product.findMany({
        where: { isActive: true },
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      })
      if (products.length > 0) {
        await this.reindexAll(products)
      }
    } catch (err: any) {
      this.isConnected = false
      this.logger.warn(`AWS OpenSearch connection deferred (${err.message}). Using database search fallback.`)
    }
  }

  async syncProduct(product: any) {
    if (!this.isConnected || !this.client) return
    try {
      await this.client.index({
        index: this.INDEX,
        id: product.id,
        body: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku ?? '',
          price: Number(product.price),
          categoryId: product.categoryId,
          image: product.images?.[0]?.url ?? null,
          isActive: product.isActive ?? true,
          createdAt: product.createdAt ?? new Date().toISOString(),
        },
        refresh: true,
      })
    } catch (err: any) {
      this.logger.warn(`Failed to sync product to OpenSearch: ${err.message}`)
    }
  }

  async deleteProduct(id: string) {
    if (!this.isConnected || !this.client) return
    try {
      await this.client.delete({
        index: this.INDEX,
        id,
      })
    } catch (err: any) {
      this.logger.warn(`Failed to delete product from OpenSearch: ${err.message}`)
    }
  }

  async reindexAll(products: any[]) {
    if (!this.isConnected || !this.client) return
    try {
      const body = products.flatMap((p) => [
        { index: { _index: this.INDEX, _id: p.id } },
        {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku ?? '',
          price: Number(p.price),
          categoryId: p.categoryId,
          image: p.images?.[0]?.url ?? null,
          isActive: p.isActive ?? true,
          createdAt: p.createdAt ?? new Date().toISOString(),
        },
      ])
      if (body.length > 0) {
        await this.client.bulk({ refresh: true, body })
        this.logger.log(`Indexed ${products.length} products in OpenSearch`)
      }
    } catch (err: any) {
      this.logger.warn(`Failed to reindex products in OpenSearch: ${err.message}`)
    }
  }

  async search(query: string, limit = 10): Promise<any[]> {
    const trimmed = query.trim()
    if (!trimmed) return []

    // 1. Try AWS OpenSearch if connected
    if (this.isConnected && this.client) {
      try {
        const res = await this.client.search({
          index: this.INDEX,
          body: {
            size: limit,
            query: {
              bool: {
                must: [
                  {
                    multi_match: {
                      query: trimmed,
                      fields: ['name^3', 'slug^2', 'sku'],
                      fuzziness: 'AUTO',
                    },
                  },
                ],
                filter: [{ term: { isActive: true } }],
              },
            },
          },
        })

        const hits = res.body?.hits?.hits ?? []
        return hits.map((h: any) => ({
          id: h._id,
          ...h._source,
        }))
      } catch (err: any) {
        this.logger.warn(`OpenSearch search query failed: ${err.message}. Falling back to PostgreSQL.`)
      }
    }

    // 2. High-performance PostgreSQL fallback (always works reliably)
    const dbResults = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { slug: { contains: trimmed, mode: 'insensitive' } },
          { sku: { contains: trimmed, mode: 'insensitive' } },
          { description: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    })

    return dbResults.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: Number(p.price),
      categoryId: p.categoryId,
      image: p.images?.[0]?.url ?? null,
    }))
  }
}