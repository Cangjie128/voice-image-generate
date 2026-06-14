import { Body, Controller, Post, Inject } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('auth')
export class AuthController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Post('wechat-login')
  login(@Body() body: Record<string, unknown>) {
    return this.store.mockLogin(body)
  }
}
