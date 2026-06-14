import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('period-records')
export class PeriodRecordsController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get()
  list() {
    return this.store.getPeriodRecords()
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.store.addPeriodRecord(body)
  }
}
