import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { MockStoreService } from '../common/mock-store.service'

@Controller('todos')
export class TodosController {
  constructor(@Inject(MockStoreService) private readonly store: MockStoreService) {}

  @Get()
  list() {
    return this.store.getTodos()
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.store.addTodo(body)
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.store.completeTodo(Number(id))
  }
}
