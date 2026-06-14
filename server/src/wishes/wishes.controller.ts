import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('wishes')
export class WishesController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get()
  list() {
    return this.store.getWishes()
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.store.addWish(body)
  }

  @Post(':id/claim')
  claim(@Param('id') id: string) {
    return this.store.claimWish(Number(id))
  }

  @Patch(':id/progress')
  progress(@Param('id') id: string, @Body() body: { progress?: number }) {
    return this.store.updateWishProgress(Number(id), Number(body.progress || 0))
  }
}
