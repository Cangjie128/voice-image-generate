/**
 * 豆包（火山引擎）大模型流式语音识别 —— 后端 WebSocket 代理。
 *
 * 浏览器 <--ws--> 本后端(/api/asr) <--wss--> openspeech.bytedance.com
 *
 * 为什么要后端代理：火山的鉴权密钥（App Key / Access Key）绝不能放进前端，
 * 否则任何人都能从浏览器里抓到并盗用。所以前端只把麦克风 PCM 音频流推给本后端，
 * 由本后端加上鉴权、按火山的二进制协议封包后转发，再把识别结果回传给前端。
 *
 * 协议参考：火山引擎「大模型流式语音识别 API」二进制协议。
 */
import { IncomingMessage } from 'http'
import { Server as HttpServer } from 'http'
import { randomUUID } from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'
import { WebSocket, WebSocketServer, RawData } from 'ws'

const VOLC_ENDPOINT =
  process.env.DOUBAO_ASR_ENDPOINT ||
  'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel'

// ---- 协议常量 ----
const PROTOCOL_VERSION = 0b0001
const HEADER_SIZE = 0b0001 // 以 4 字节为单位 -> 头部 4 字节

const MSG_FULL_CLIENT = 0b0001
const MSG_AUDIO_ONLY = 0b0010
const MSG_FULL_SERVER = 0b1001
const MSG_ERROR = 0b1111

const FLAG_POS_SEQ = 0b0001 // 含正序号
const FLAG_NEG_WITH_SEQ = 0b0011 // 最后一包，含负序号

const SER_NONE = 0b0000
const SER_JSON = 0b0001
const COMP_NONE = 0b0000
const COMP_GZIP = 0b0001

function header(messageType: number, flags: number, serialization: number, compression: number) {
  return Buffer.from([
    (PROTOCOL_VERSION << 4) | HEADER_SIZE,
    (messageType << 4) | flags,
    (serialization << 4) | compression,
    0x00
  ])
}

function int32be(value: number) {
  const b = Buffer.alloc(4)
  b.writeInt32BE(value, 0)
  return b
}

function uint32be(value: number) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(value, 0)
  return b
}

/** 首包：完整客户端请求（JSON 配置，gzip 压缩，序号=1） */
function buildConfigFrame(seq: number) {
  const config = {
    user: { uid: 'waibao-web' },
    audio: { format: 'pcm', rate: 16000, bits: 16, channel: 1, codec: 'raw' },
    request: {
      model_name: 'bigmodel',
      enable_punc: true,
      enable_itn: true,
      show_utterances: true
    }
  }
  const payload = gzipSync(Buffer.from(JSON.stringify(config), 'utf8'))
  return Buffer.concat([
    header(MSG_FULL_CLIENT, FLAG_POS_SEQ, SER_JSON, COMP_GZIP),
    int32be(seq),
    uint32be(payload.length),
    payload
  ])
}

/** 音频包：raw PCM，gzip 压缩。最后一包用负序号。 */
function buildAudioFrame(seq: number, pcm: Buffer, isLast: boolean) {
  const payload = gzipSync(pcm)
  const flags = isLast ? FLAG_NEG_WITH_SEQ : FLAG_POS_SEQ
  const seqValue = isLast ? -seq : seq
  return Buffer.concat([
    header(MSG_AUDIO_ONLY, flags, SER_NONE, COMP_GZIP),
    int32be(seqValue),
    uint32be(payload.length),
    payload
  ])
}

type ParsedServer =
  | { kind: 'result'; json: any }
  | { kind: 'error'; code: number; message: string }
  | { kind: 'unknown' }

function parseServerFrame(buf: Buffer): ParsedServer {
  if (buf.length < 4) return { kind: 'unknown' }
  const headerSize = buf[0] & 0x0f
  const messageType = (buf[1] >> 4) & 0x0f
  const flags = buf[1] & 0x0f
  const compression = buf[2] & 0x0f
  let offset = headerSize * 4

  // 含序号则跳过 4 字节
  if (flags & FLAG_POS_SEQ) offset += 4

  if (messageType === MSG_ERROR) {
    const code = buf.readUInt32BE(offset)
    offset += 4
    const size = buf.readUInt32BE(offset)
    offset += 4
    let msgBuf = buf.subarray(offset, offset + size)
    if (compression === COMP_GZIP) {
      try {
        msgBuf = gunzipSync(msgBuf)
      } catch {
        /* ignore */
      }
    }
    return { kind: 'error', code, message: msgBuf.toString('utf8') }
  }

  if (messageType === MSG_FULL_SERVER) {
    const size = buf.readUInt32BE(offset)
    offset += 4
    let payload = buf.subarray(offset, offset + size)
    if (compression === COMP_GZIP) {
      try {
        payload = gunzipSync(payload)
      } catch {
        return { kind: 'unknown' }
      }
    }
    try {
      return { kind: 'result', json: JSON.parse(payload.toString('utf8')) }
    } catch {
      return { kind: 'unknown' }
    }
  }

  return { kind: 'unknown' }
}

function handleClient(browser: WebSocket) {
  const appKey = process.env.DOUBAO_ASR_APP_ID
  const accessKey = process.env.DOUBAO_ASR_ACCESS_TOKEN
  const resourceId = process.env.DOUBAO_ASR_RESOURCE_ID || 'volc.bigasr.sauc.duration'

  const sendJson = (obj: unknown) => {
    if (browser.readyState === WebSocket.OPEN) browser.send(JSON.stringify(obj))
  }

  if (!appKey || !accessKey) {
    sendJson({ type: 'error', message: '后端缺少豆包鉴权配置（DOUBAO_ASR_APP_ID / ACCESS_TOKEN）' })
    browser.close()
    return
  }

  const connectId = randomUUID()
  const upstream = new WebSocket(VOLC_ENDPOINT, {
    headers: {
      'X-Api-App-Key': appKey,
      'X-Api-Access-Key': accessKey,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Connect-Id': connectId
    }
  })

  let seq = 1
  let upstreamReady = false
  const pcmQueue: Buffer[] = []
  let ended = false
  const emittedFinals = new Set<string>()
  let lastInterim = ''

  const flushQueue = () => {
    while (pcmQueue.length && upstream.readyState === WebSocket.OPEN) {
      const chunk = pcmQueue.shift() as Buffer
      seq += 1
      upstream.send(buildAudioFrame(seq, chunk, false))
    }
  }

  upstream.on('open', () => {
    upstream.send(buildConfigFrame(seq)) // seq = 1
    upstreamReady = true
    flushQueue()
  })

  upstream.on('message', (data: RawData) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
    const parsed = parseServerFrame(buf)
    if (parsed.kind === 'error') {
      sendJson({ type: 'error', message: parsed.message, code: parsed.code })
      return
    }
    if (parsed.kind !== 'result') return

    const result = parsed.json?.result ?? {}
    const utterances: any[] = Array.isArray(result.utterances) ? result.utterances : []
    const fullText: string =
      typeof result.text === 'string'
        ? result.text
        : utterances.map((u) => u?.text ?? '').join('')

    // 已「确定」的分句 -> 触发 final（去重）
    for (const u of utterances) {
      if (u?.definite && typeof u.text === 'string' && u.text.trim()) {
        const sigKey = `${u.start_time ?? ''}-${u.end_time ?? ''}-${u.text}`
        if (!emittedFinals.has(sigKey)) {
          emittedFinals.add(sigKey)
          sendJson({ type: 'final', text: u.text.trim() })
        }
      }
    }

    // 进行中的文本 -> interim
    const interim = utterances.length
      ? utterances.filter((u) => !u?.definite).map((u) => u?.text ?? '').join('')
      : fullText
    if (interim && interim !== lastInterim) {
      lastInterim = interim
      sendJson({ type: 'interim', text: interim.trim() })
    }
  })

  upstream.on('close', () => {
    // 若整段结束都没出现 definite 分句，则把累计文本作为最终结果兜底
    if (lastInterim && emittedFinals.size === 0) {
      sendJson({ type: 'final', text: lastInterim.trim() })
    }
    sendJson({ type: 'closed' })
    if (browser.readyState === WebSocket.OPEN) browser.close()
  })

  upstream.on('error', (err) => {
    sendJson({ type: 'error', message: `上游连接错误：${err.message}` })
    if (browser.readyState === WebSocket.OPEN) browser.close()
  })

  browser.on('message', (data: RawData, isBinary: boolean) => {
    if (isBinary) {
      const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
      pcmQueue.push(chunk)
      if (upstreamReady) flushQueue()
      return
    }
    // 文本控制消息
    try {
      const msg = JSON.parse(data.toString())
      if (msg?.type === 'end' && !ended) {
        ended = true
        const finalChunk = pcmQueue.length ? Buffer.concat(pcmQueue.splice(0)) : Buffer.alloc(0)
        seq += 1
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(buildAudioFrame(seq, finalChunk, true))
        }
      }
    } catch {
      /* ignore */
    }
  })

  browser.on('close', () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close()
    }
  })
}

/** 挂载到 Nest 的底层 HTTP server，处理 /api/asr 的 WS 升级。 */
export function attachAsrProxy(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (socket) => handleClient(socket))

  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    let pathname = ''
    try {
      pathname = new URL(req.url || '', 'http://localhost').pathname
    } catch {
      pathname = req.url || ''
    }
    if (pathname === '/api/asr') {
      wss.handleUpgrade(req, socket as any, head, (ws) => wss.emit('connection', ws, req))
    }
    // 其它 upgrade 路径不处理（交给可能的其他处理器）
  })

  console.log('豆包 ASR 代理已挂载: ws /api/asr')
}
