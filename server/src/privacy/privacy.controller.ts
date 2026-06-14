import { Body, Controller, Get, Inject, Patch } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('privacy-settings')
export class PrivacyController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get()
  get() {
    return this.store.getPrivacy()
  }

  @Patch()
  update(@Body() body: Record<string, unknown>) {
    return this.store.updatePrivacy(body)
  }
}
