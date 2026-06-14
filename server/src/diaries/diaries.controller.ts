import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('diaries')
export class DiariesController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get()
  list() {
    return this.store.getDiaries()
  }

  @Post()
  async create(@Body() body: { content?: string; moodScore?: number }) {
    return this.store.addDiary({
      content: String(body.content || ''),
      moodScore: Number(body.moodScore ?? 3)
    })
  }
}
