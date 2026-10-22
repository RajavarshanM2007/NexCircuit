import { Controller, Get, Query } from '@nestjs/common'
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('q') q?: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10
    const results = await this.searchService.search(q ?? '', parsedLimit)
    return { results, total: results.length }
  }
}
