import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { MockStoreService } from './common/mock-store.service'
import { HomeController } from './home/home.controller'
import { DiariesController } from './diaries/diaries.controller'
import { WishesController } from './wishes/wishes.controller'
import { TodosController } from './todos/todos.controller'
import { CouplesController } from './couples/couples.controller'
import { WeatherController } from './weather/weather.controller'
import { AuthController } from './auth/auth.controller'
import { MeController } from './me/me.controller'
import { PrivacyController } from './privacy/privacy.controller'
import { ImportantDatesController } from './important-dates/important-dates.controller'
import { PeriodRecordsController } from './period-records/period-records.controller'
import { OotdController } from './ootd/ootd.controller'
import { ImagesController } from './images/images.controller'

@Module({
  controllers: [
    HealthController,
    HomeController,
    DiariesController,
    WishesController,
    TodosController,
    CouplesController,
    WeatherController,
    AuthController,
    MeController,
    PrivacyController,
    ImportantDatesController,
    PeriodRecordsController,
    OotdController,
    ImagesController
  ],
  providers: [MockStoreService]
})
export class AppModule {}
