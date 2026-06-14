import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('important-dates')
export class ImportantDatesController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get()
  list() {
    return this.store.getImportantDates()
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.store.addImportantDate(body)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.store.updateImportantDate(Number(id), body)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.store.deleteImportantDate(Number(id))
  }
}
