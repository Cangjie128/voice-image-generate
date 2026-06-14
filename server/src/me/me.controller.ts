import { Body, Controller, Get, Inject, Patch } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('me')
export class MeController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get()
  me() {
    return this.store.getMe()
  }

  @Patch('profile')
  updateProfile(@Body() body: Record<string, unknown>) {
    return this.store.updateProfile(body)
  }
}
