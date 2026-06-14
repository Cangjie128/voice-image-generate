import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BrowserSpeechRecognition,
  SpeechRecognitionEventLike
} from './speech-types'

/**
 * 混合语音识别：
 *  - 未唤醒（awake=false）：用浏览器 Web Speech API 监听唤醒词「小王启动」（稳、免费、低延迟）。
 *  - 已唤醒（awake=true）：切换到豆包大模型流式识别（经后端 /api/asr 代理）做正式识别。
 *  - 若浏览器不支持 Web Speech API，则唤醒阶段自动回退用豆包。
 *
 * 对外 Hook 接口保持不变，只新增可选的 awake 入参。
 */
export type MicStatus =
  | 'checking'
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error'

type UseVoiceControlOptions = {
  onFinalTranscript: (text: string) => void
  awake?: boolean
}

type ServerMessage =
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string; code?: number }
  | { type: 'closed' }

const TARGET_SAMPLE_RATE = 16000

export function normalizeSpeech(text: string) {
  return text
    .replace(/[\s,，.。!！?？:：;；"'“”‘’、]/g, '')
    .toLowerCase()
}

function browserRecognitionAvailable() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

function getUserMediaAvailable() {
  const AC = window.AudioContext || (window as any).webkitAudioContext
  return Boolean(navigator.mediaDevices?.getUserMedia && AC)
}

function asrSocketUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/api/asr`
}

function floatTo16BitPCM(input: Float32Array) {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function downsampleTo16k(input: Float32Array, inputRate: number) {
  if (inputRate === TARGET_SAMPLE_RATE) return input
  const ratio = inputRate / TARGET_SAMPLE_RATE
  const outLength = Math.floor(input.length / ratio)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    const a = input[idx] ?? 0
    const b = input[idx + 1] ?? a
    out[i] = a + (b - a) * frac
  }
  return out
}

export function useVoiceControl({ onFinalTranscript, awake = false }: UseVoiceControlOptions) {
  const [micStatus, setMicStatus] = useState<MicStatus>('checking')
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [lastHeard, setLastHeard] = useState('')

  const finalTranscriptRef = useRef(onFinalTranscript)
  const shouldListenRef = useRef(false)
  const awakeRef = useRef(awake)

  // 浏览器引擎
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const browserTimerRef = useRef<number | null>(null)

  // 豆包引擎
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const wsCloseTimerRef = useRef<number | null>(null)
  const doubaoConnectTimerRef = useRef<number | null>(null)
  const doubaoGotResultRef = useRef(false)
  // 当前实际生效的引擎：'browser' | 'doubao'
  const activeEngineRef = useRef<'browser' | 'doubao'>('browser')

  useEffect(() => {
    finalTranscriptRef.current = onFinalTranscript
  }, [onFinalTranscript])

  const emitInterim = useCallback((t: string) => {
    if (t) setInterimTranscript(t)
  }, [])

  const emitFinal = useCallback((t: string) => {
    const clean = t.trim()
    if (!clean) return
    setLastHeard(clean)
    setInterimTranscript('')
    finalTranscriptRef.current(clean)
  }, [])

  // ---------- 浏览器引擎（唤醒阶段）----------
  const startBrowser = useCallback(() => {
    if (!browserRecognitionAvailable()) return false
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) return false

    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalText = ''
      let interimText = ''
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) finalText += transcript
        else interimText += transcript
      }
      if (interimText.trim()) emitInterim(interimText.trim())
      if (finalText.trim()) emitFinal(finalText.trim())
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListenRef.current = false
        setMicStatus('denied')
      }
    }
    recognition.onend = () => {
      setIsListening(false)
      // 只要浏览器引擎仍是当前生效引擎且仍想监听，就自动重启
      if (shouldListenRef.current && activeEngineRef.current === 'browser') {
        if (browserTimerRef.current) window.clearTimeout(browserTimerRef.current)
        browserTimerRef.current = window.setTimeout(() => {
          try {
            recognition.start()
          } catch {
            /* noop */
          }
        }, 280)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      /* 已在运行 */
    }
    return true
  }, [emitInterim, emitFinal])

  const stopBrowser = useCallback(() => {
    if (browserTimerRef.current) {
      window.clearTimeout(browserTimerRef.current)
      browserTimerRef.current = null
    }
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.onend = null
      try {
        recognition.stop()
      } catch {
        /* noop */
      }
      try {
        recognition.abort?.()
      } catch {
        /* noop */
      }
    }
  }, [])

  // ---------- 豆包引擎（唤醒后）----------
  const teardownDoubaoAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null
      try {
        processorRef.current.disconnect()
      } catch {
        /* noop */
      }
      processorRef.current = null
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect()
      } catch {
        /* noop */
      }
      sourceRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined)
      audioCtxRef.current = null
    }
  }, [])

  const stopDoubao = useCallback(() => {
    if (doubaoConnectTimerRef.current) {
      window.clearTimeout(doubaoConnectTimerRef.current)
      doubaoConnectTimerRef.current = null
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end' }))
      } catch {
        /* noop */
      }
    }
    teardownDoubaoAudio()
    if (wsRef.current) {
      const ws = wsRef.current
      wsRef.current = null
      // 解除回调，避免主动停止时触发误回退
      ws.onclose = null
      ws.onerror = null
      ws.onmessage = null
      if (wsCloseTimerRef.current) window.clearTimeout(wsCloseTimerRef.current)
      wsCloseTimerRef.current = window.setTimeout(() => {
        try {
          ws.close()
        } catch {
          /* noop */
        }
      }, 600)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [teardownDoubaoAudio])

  // 唤醒阶段豆包不可用时，回退到浏览器引擎，保证仍能识别+生图
  const fallbackToBrowser = useCallback(
    (reason: string) => {
      if (activeEngineRef.current !== 'doubao') return
      console.warn(`[ASR] 豆包不可用(${reason})，回退到浏览器识别`)
      activeEngineRef.current = 'browser'
      stopDoubao()
      const ok = startBrowser()
      if (!ok) console.error('[ASR] 浏览器识别也不可用')
    },
    [startBrowser, stopDoubao]
  )

  const startDoubao = useCallback(async () => {
    if (!getUserMediaAvailable()) return false
    doubaoGotResultRef.current = false
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
        })
      }

      const ws = new WebSocket(asrSocketUrl())
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      // 连接 2.5s 内没建立 -> 回退
      if (doubaoConnectTimerRef.current) window.clearTimeout(doubaoConnectTimerRef.current)
      doubaoConnectTimerRef.current = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) fallbackToBrowser('连接超时')
      }, 2500)

      ws.onopen = () => {
        console.info('[ASR] 豆包代理已连接')
        setIsListening(true)
        startAudioPipe()
        // 连上但 8s 内完全没有任何识别结果 -> 判定协议异常，回退浏览器
        if (doubaoConnectTimerRef.current) window.clearTimeout(doubaoConnectTimerRef.current)
        doubaoConnectTimerRef.current = window.setTimeout(() => {
          if (!doubaoGotResultRef.current) fallbackToBrowser('连接后长时间无结果')
        }, 8000)
      }
      ws.onmessage = (event) => {
        let msg: ServerMessage
        try {
          msg = JSON.parse(event.data as string)
        } catch {
          return
        }
        if (msg.type === 'interim') {
          doubaoGotResultRef.current = true
          emitInterim(msg.text)
        } else if (msg.type === 'final') {
          doubaoGotResultRef.current = true
          emitFinal(msg.text)
        } else if (msg.type === 'error') {
          console.warn('[ASR] 豆包上游错误:', msg.message)
          fallbackToBrowser('上游错误')
        }
      }
      ws.onclose = () => {
        setIsListening(false)
        if (doubaoConnectTimerRef.current) {
          window.clearTimeout(doubaoConnectTimerRef.current)
          doubaoConnectTimerRef.current = null
        }
        // 唤醒中、还想监听、且这次豆包没出过任何结果 -> 回退浏览器
        if (shouldListenRef.current && awakeRef.current && !doubaoGotResultRef.current) {
          fallbackToBrowser('连接关闭且无结果')
        }
      }
      ws.onerror = () => {
        fallbackToBrowser('连接错误')
      }

      function startAudioPipe() {
        const stream = streamRef.current
        if (!stream) return
        const AC = window.AudioContext || (window as any).webkitAudioContext
        let ctx: AudioContext
        try {
          ctx = new AC({ sampleRate: TARGET_SAMPLE_RATE })
        } catch {
          ctx = new AC()
        }
        audioCtxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        sourceRef.current = source
        const processor = ctx.createScriptProcessor(2048, 1, 1)
        processorRef.current = processor
        processor.onaudioprocess = (e) => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) return
          const input = e.inputBuffer.getChannelData(0)
          const resampled = downsampleTo16k(input, ctx.sampleRate)
          const pcm = floatTo16BitPCM(resampled)
          wsRef.current.send(pcm.buffer)
        }
        const mute = ctx.createGain()
        mute.gain.value = 0
        source.connect(processor)
        processor.connect(mute)
        mute.connect(ctx.destination)
      }

      return true
    } catch {
      setMicStatus('denied')
      fallbackToBrowser('麦克风/音频初始化失败')
      return false
    }
  }, [emitInterim, emitFinal, fallbackToBrowser])

  // ---------- 引擎切换 ----------
  const applyEngine = useCallback(async () => {
    if (!shouldListenRef.current) {
      stopBrowser()
      stopDoubao()
      setIsListening(false)
      setInterimTranscript('')
      return
    }
    // 切换前先停掉两个引擎，避免重复实例
    stopBrowser()
    stopDoubao()
    if (awakeRef.current) {
      // 唤醒：用豆包（豆包不通会自动回退浏览器）
      activeEngineRef.current = 'doubao'
      await startDoubao()
    } else {
      // 待命：用浏览器（不支持则回退豆包）
      activeEngineRef.current = 'browser'
      const ok = startBrowser()
      if (!ok) {
        activeEngineRef.current = 'doubao'
        await startDoubao()
      }
    }
  }, [startBrowser, stopBrowser, startDoubao, stopDoubao])

  const applyEngineRef = useRef(applyEngine)
  useEffect(() => {
    applyEngineRef.current = applyEngine
  }, [applyEngine])

  // awake 变化时切换引擎
  useEffect(() => {
    awakeRef.current = awake
    if (shouldListenRef.current) void applyEngineRef.current()
  }, [awake])

  const startListening = useCallback(async () => {
    shouldListenRef.current = true
    await applyEngine()
    return true
  }, [applyEngine])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    void applyEngine()
  }, [applyEngine])

  const requestMicrophone = useCallback(async () => {
    if (!window.isSecureContext) {
      setMicStatus('error')
      return false
    }
    if (!getUserMediaAvailable() && !browserRecognitionAvailable()) {
      setMicStatus('unsupported')
      return false
    }
    setMicStatus('requesting')
    try {
      // 主动获取一次权限（也让浏览器引擎后续可直接启动）
      if (navigator.mediaDevices?.getUserMedia) {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
        probe.getTracks().forEach((t) => t.stop())
      }
      setMicStatus('granted')
      shouldListenRef.current = true
      await applyEngine()
      return true
    } catch {
      setMicStatus('denied')
      return false
    }
  }, [applyEngine])

  // 初始化：探测支持与权限
  useEffect(() => {
    if (!getUserMediaAvailable() && !browserRecognitionAvailable()) {
      setMicStatus('unsupported')
      return
    }
    if (!navigator.permissions?.query) {
      setMicStatus('idle')
      return
    }
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((permission) => {
        if (permission.state === 'granted') {
          setMicStatus('granted')
          shouldListenRef.current = true
          void applyEngineRef.current()
        } else {
          setMicStatus(permission.state === 'denied' ? 'denied' : 'idle')
        }
        permission.onchange = () => {
          if (permission.state === 'granted') {
            setMicStatus('granted')
            shouldListenRef.current = true
            void applyEngineRef.current()
          } else if (permission.state === 'denied') {
            setMicStatus('denied')
          }
        }
      })
      .catch(() => setMicStatus('idle'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 卸载清理
  useEffect(() => {
    return () => {
      shouldListenRef.current = false
      if (browserTimerRef.current) window.clearTimeout(browserTimerRef.current)
      if (wsCloseTimerRef.current) window.clearTimeout(wsCloseTimerRef.current)
      stopBrowser()
      stopDoubao()
    }
  }, [stopBrowser, stopDoubao])

  return {
    interimTranscript,
    isListening,
    lastHeard,
    micStatus,
    requestMicrophone,
    startListening,
    stopListening
  }
}
