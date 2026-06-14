import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Image as ImageIcon,
  Mic,
  MicOff,
  Radio,
  Sparkles,
  WandSparkles
} from 'lucide-react'
import Starfield from './Starfield'
import RobotHead from './RobotHead'
import { normalizeSpeech, type MicStatus, useVoiceControl } from './voice'

type ChatMessage = {
  id: string
  role: 'robot' | 'user' | 'system'
  text: string
}

type GeneratedImage = {
  id: string
  url: string
  prompt: string
  model?: string
  provider: string
  warning?: string
}

type GenerateImageResponse = {
  imageUrl: string
  prompt: string
  model?: string
  provider: string
  warning?: string
}

const WAKE_KEYWORD = '小王启动'
const SLEEP_KEYWORDS = ['小王休息', '小王暂停', '小王结束', '停止生成']
const REGENERATE_KEYWORDS = ['重新生成', '再来一张', '重画一张', '换一张']

function createId(prefix: string) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) {
    return
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 1
  utterance.pitch = 1.08
  utterance.volume = 0.92
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function cleanPrompt(text: string) {
  const result = text
    .replaceAll('小王', '')
    .replaceAll('启动', '')
    .replace(/帮我|请|可以|能不能|生成|绘制|画一张|画一个|画个|画|做一张|来一张|图片|图像/g, '')
    .replace(/[，。！？,.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return result.length >= 2 ? result : text.trim()
}

function micStatusText(status: MicStatus, isListening: boolean) {
  if (status === 'unsupported') return '当前浏览器不支持语音识别'
  if (status === 'denied') return '麦克风权限未开启'
  if (status === 'requesting') return '正在请求麦克风'
  if (status === 'granted' && isListening) return '正在聆听'
  if (status === 'granted') return '麦克风已就绪'
  if (status === 'error') return '语音服务暂不可用'
  return '等待麦克风授权'
}

function App() {
  const [isAwake, setIsAwake] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'hello',
      role: 'robot',
      text: '我在星空里待命。'
    }
  ])
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastPrompt, setLastPrompt] = useState('')
  const [progress, setProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const finishTimerRef = useRef<number | null>(null)

  const isAwakeRef = useRef(isAwake)
  const lastPromptRef = useRef(lastPrompt)

  useEffect(() => {
    isAwakeRef.current = isAwake
  }, [isAwake])

  useEffect(() => {
    lastPromptRef.current = lastPrompt
  }, [lastPrompt])

  // 生图进度条（模拟进度：OpenAI 一次性返回，无真实百分比）
  useEffect(() => {
    if (isGenerating) {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current)
        finishTimerRef.current = null
      }
      setShowProgress(true)
      setProgress((p) => (p < 8 ? 8 : p))
      const id = window.setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + (p < 55 ? 7 : p < 80 ? 2.5 : 1)))
      }, 320)
      return () => window.clearInterval(id)
    }
    setProgress((p) => (p > 0 ? 100 : 0))
    finishTimerRef.current = window.setTimeout(() => {
      setShowProgress(false)
      setProgress(0)
    }, 650)
    return () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current)
        finishTimerRef.current = null
      }
    }
  }, [isGenerating])

  const pushMessage = useCallback((role: ChatMessage['role'], text: string) => {
    setMessages((current) => [
      ...current.slice(-5),
      { id: createId(role), role, text }
    ])
  }, [])

  const generateImage = useCallback(
    async (prompt: string) => {
      const finalPrompt = cleanPrompt(prompt)
      if (!finalPrompt) {
        return
      }

      setLastPrompt(finalPrompt)
      pushMessage('user', finalPrompt)
      setIsGenerating(true)

      try {
        const response = await fetch('/api/images/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            quality: 'medium',
            size: '1024x1024'
          })
        })

        const data = (await response.json()) as GenerateImageResponse
        if (!response.ok) {
          throw new Error(data.warning || '图片生成失败')
        }

        setGeneratedImage({
          id: createId('image'),
          model: data.model,
          prompt: data.prompt,
          provider: data.provider,
          url: data.imageUrl,
          warning: data.warning
        })

        const reply = data.warning
          ? '我先给你生成了预览图。'
          : '画好了，已经放到右侧画框。'
        pushMessage('robot', reply)
        if (data.warning) {
          pushMessage('system', `生图未走真实模型：${data.warning}`)
          console.warn('[生图] warning:', data.warning)
        }
        speak(reply)
      } catch {
        const reply = '这次生成没有成功，你可以再说一遍画面。'
        pushMessage('system', reply)
        speak(reply)
      } finally {
        setIsGenerating(false)
      }
    },
    [pushMessage]
  )

  const handleFinalTranscript = useCallback(
    (text: string) => {
      const normalized = normalizeSpeech(text)

      if (normalized.includes(WAKE_KEYWORD)) {
        if (!isAwakeRef.current) {
          setIsAwake(true)
          pushMessage('robot', '我醒啦，说出你想生成的画面。')
          speak('我醒啦，说出你想生成的画面。')
        }

        const promptAfterWake = cleanPrompt(
          text.replaceAll('小王启动', '').replaceAll('小王 启动', '')
        )
        if (promptAfterWake && promptAfterWake !== text.trim()) {
          void generateImage(promptAfterWake)
        }
        return
      }

      if (!isAwakeRef.current) {
        return
      }

      if (SLEEP_KEYWORDS.some((keyword) => normalized.includes(normalizeSpeech(keyword)))) {
        setIsAwake(false)
        pushMessage('robot', '我回到待命状态。')
        speak('我回到待命状态。')
        return
      }

      if (REGENERATE_KEYWORDS.some((keyword) => normalized.includes(normalizeSpeech(keyword)))) {
        if (lastPromptRef.current) {
          void generateImage(lastPromptRef.current)
        }
        return
      }

      if (text.trim().length >= 3) {
        void generateImage(text)
      }
    },
    [generateImage, pushMessage]
  )

  const {
    interimTranscript,
    isListening,
    lastHeard,
    micStatus,
    requestMicrophone,
    startListening,
    stopListening
  } = useVoiceControl({ onFinalTranscript: handleFinalTranscript, awake: isAwake })

  useEffect(() => {
    if (micStatus !== 'idle') {
      return
    }

    const timer = window.setTimeout(() => {
      void requestMicrophone()
    }, 650)

    return () => window.clearTimeout(timer)
  }, [micStatus, requestMicrophone])

  const statusLine = useMemo(
    () => micStatusText(micStatus, isListening),
    [isListening, micStatus]
  )

  return (
    <div className="app">
      <Starfield />
      <div className="ambient-scrim" />
      <main className={`app-shell ${isAwake ? 'is-awake' : 'is-asleep'}`}>
        <motion.section
          className="robot-stage"
          layout
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          aria-label="小王机器人"
        >
          <div className="status-pill">
            <Radio size={16} />
            <span>{isAwake ? '小王已启动' : '等待唤醒词'}</span>
          </div>

          <motion.div
            className="robot-orbit"
            animate={{
              y: isAwake ? [0, -8, 0] : [0, -14, 0],
              rotate: isAwake ? [0, 1.5, 0, -1.5, 0] : [0, 0.8, 0]
            }}
            transition={{
              duration: isAwake ? 4 : 5.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <RobotHead
              className="robot-image"
              alt="会跟随鼠标转头的小王机器人"
            />
            <span className={`voice-ring ${isListening ? 'is-listening' : ''}`} />
          </motion.div>

          <div className="robot-copy">
            <h1>小王 AI 语音生图</h1>
            <p>{statusLine}</p>
          </div>

          <div className="voice-controls" aria-label="语音控制">
            {micStatus !== 'granted' ? (
              <button className="primary-action" type="button" onClick={requestMicrophone}>
                <Mic size={18} />
                <span>授权麦克风</span>
              </button>
            ) : isListening ? (
              <button className="icon-action" type="button" onClick={stopListening} aria-label="暂停监听">
                <MicOff size={20} />
              </button>
            ) : (
              <button className="icon-action" type="button" onClick={startListening} aria-label="继续监听">
                <Mic size={20} />
              </button>
            )}
          </div>
        </motion.section>

        <AnimatePresence>
          {isAwake && (
            <motion.section
              className="studio-panel"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              aria-label="对话与图片生成区域"
            >
              <div className="conversation-pane">
                <div className="pane-heading">
                  <Sparkles size={18} />
                  <span>对话</span>
                </div>
                <div className="messages" aria-live="polite">
                  {messages.map((message) => (
                    <div className={`message ${message.role}`} key={message.id}>
                      {message.text}
                    </div>
                  ))}
                </div>
                <div className="live-caption">
                  <span>{interimTranscript || lastHeard || '...'}</span>
                </div>
              </div>

              <div className="image-pane">
                <div className="pane-heading">
                  <ImageIcon size={18} />
                  <span>画框</span>
                </div>
                <div className={`image-frame ${showProgress ? 'is-generating' : ''}`}>
                  {generatedImage ? (
                    <img
                      src={generatedImage.url}
                      alt={`根据语音提示生成的图片：${generatedImage.prompt}`}
                    />
                  ) : (
                    <div className="empty-frame">
                      <WandSparkles size={42} />
                    </div>
                  )}
                  {showProgress && (
                    <div className="generating-layer">
                      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                        <div className="progress-label">
                          <WandSparkles size={16} />
                          <span>{progress >= 100 ? '完成' : '正在生成画面'}</span>
                          <span className="progress-pct">{Math.round(progress)}%</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="image-meta">
                  <span>{generatedImage?.provider ?? 'voice'}</span>
                  <span>{generatedImage?.model ?? 'ready'}</span>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
