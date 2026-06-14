import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller()
export class OotdController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get('wardrobe-items')
  listWardrobe() {
    return this.store.getWardrobeItems()
  }

  @Post('wardrobe-items')
  createWardrobeItem(@Body() body: Record<string, unknown>) {
    return this.store.addWardrobeItem(body)
  }

  @Delete('wardrobe-items/:id')
  deleteWardrobeItem(@Param('id') id: string) {
    return this.store.deleteWardrobeItem(Number(id))
  }

  @Get('ootd/recommendation')
  recommendation() {
    return this.store.getOotdRecommendation()
  }
}
