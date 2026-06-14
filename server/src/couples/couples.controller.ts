import { Controller, Get, Inject, Post } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('couples')
export class CouplesController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get('current')
  current() {
    return this.store.getCouple()
  }

  @Post('bind-code')
  bindCode() {
    return this.store.generateBindCode()
  }
}
