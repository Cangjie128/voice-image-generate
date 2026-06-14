import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { attachAsrProxy } from './asr/asr-proxy'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const port = Number(process.env.PORT || 3000)

  app.enableCors()
  app.setGlobalPrefix('api')

  // 豆包流式语音识别 WS 代理（挂在同一个 HTTP server 上，路径 /api/asr）
  attachAsrProxy(app.getHttpServer())

  await app.listen(port)
  console.log(`Waibao API is running on http://localhost:${port}/api`)
}

bootstrap()
