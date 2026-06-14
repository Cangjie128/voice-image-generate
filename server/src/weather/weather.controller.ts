import { Controller, Get, Inject } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('weather')
export class WeatherController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get('today')
  today() {
    return this.store.getWeather()
  }

  @Get('forecast')
  forecast() {
    return this.store.getWeather().forecast
  }
}
