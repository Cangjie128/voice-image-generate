import { Controller, Get, Inject } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('home')
export class HomeController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get('today')
  today() {
    return this.store.getTodayHome()
  }

  @Get('boyfriend')
  boyfriend() {
    return this.store.getBoyfriendHome()
  }
}
