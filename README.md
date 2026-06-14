# 小王 AI 语音生图网站

一个纯语音控制的 AI 生图网站原型：进入页面后自动请求麦克风权限，用户说出唤醒词“小王启动”后，机器人进入工作状态；继续通过语音描述画面，右侧画框会生成图片。

## 演示视频

[观看 Demo 视频](docs/demo.mp4)

## 核心体验

- 可爱机器人首屏待命
- Three.js 星空流逝背景
- Web Speech API 语音识别
- “小王启动”语音唤醒
- 语音对话驱动图片生成
- React + TypeScript + Vite 前端
- NestJS 图片生成 API
- 未配置 OpenAI key 时自动返回本地预览图

## 目录结构

```text
web/          语音生图网站前端
server/       NestJS API 服务
miniprogram/  原微信小程序代码
database/     数据库草稿
docs/         产品与技术文档
```

## 本地运行

安装前端依赖：

```bash
cd web
npm install
```

安装服务端依赖：

```bash
cd server
npm install
```

启动 API：

```bash
cd server
npm run dev
```

启动 Web：

```bash
cd web
npm run dev
```

默认访问地址：

- Web: http://localhost:5173
- API: http://localhost:3000/api

如果本机 `3000` 被占用，可以这样启动 API，并让前端代理到新端口：

```powershell
cd server
$env:PORT="3001"
npm run dev

cd ../web
$env:VITE_API_PROXY_TARGET="http://localhost:3001"
npm run dev
```

## 配置真实生图

不要把真实 API key 提交到仓库。请复制 `server/.env.example` 为 `server/.env`，并填入自己的 key：

```env
OPENAI_API_KEY=你的新key
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_SIZE=1024x1024
```

未配置 `OPENAI_API_KEY` 时，接口会返回本地 SVG 预览图，方便先验证完整语音流程。

## 常用命令

```bash
npm run web:build
npm run api:typecheck
```

服务端单独构建：

```bash
cd server
npm run build
```
