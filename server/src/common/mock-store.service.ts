import { Injectable } from '@nestjs/common'

type TodoStatus = 'pending' | 'done'
type WishStatus = 'wanted' | 'claimed' | 'preparing' | 'done' | 'archived'

interface Todo {
  id: number
  userId: number
  title: string
  dueDate: string
  priority: 'low' | 'normal' | 'high'
  status: TodoStatus
  repeatType: 'none' | 'daily' | 'weekly' | 'monthly'
}

interface Wish {
  id: number
  userId: number
  title: string
  description: string
  imageUrl: string
  category: string
  priority: 'low' | 'normal' | 'high'
  progress: number
  status: WishStatus
  claimedBy: number | null
}

interface Diary {
  id: number
  userId: number
  content: string
  moodScore: number
  emotionLevel: number
  emotionType: string
  comfortText: string
  notifyPartner: boolean
  boyfriendMessage: string
  createdAt: string
}

interface ImportantDate {
  id: number
  userId: number
  coupleId: number | null
  title: string
  date: string
  repeatType: 'none' | 'yearly'
  remindDaysBefore: number
  showOnHome: boolean
  remindPartner: boolean
}

interface PeriodRecord {
  id: number
  userId: number
  startDate: string
  endDate: string
  painLevel: string
  flowLevel: string
  mood: string
  note: string
}

interface WardrobeItem {
  id: number
  userId: number
  imageUrl: string
  type: string
  color: string
  style: string
  season: string
}

function today() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const date = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${date}`
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour <= 10) return '早安'
  if (hour >= 11 && hour <= 13) return '中午好'
  if (hour >= 14 && hour <= 17) return '下午好'
  if (hour >= 18 && hour <= 23) return '晚上好'
  return '夜深啦'
}

function nextId(items: Array<{ id: number }>) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1
}

function daysFrom(date: string) {
  const start = new Date(`${date}T00:00:00`)
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
}

function getDaysLeft(date: string, repeatType: string) {
  const base = new Date(`${date}T00:00:00`)
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let target = new Date(base)

  if (repeatType === 'yearly') {
    target = new Date(now.getFullYear(), base.getMonth(), base.getDate())
    if (target < todayDate) {
      target = new Date(now.getFullYear() + 1, base.getMonth(), base.getDate())
    }
  }

  return Math.ceil((target.getTime() - todayDate.getTime()) / 86400000)
}

function analyzeEmotion(content: string, moodScore: number) {
  const strongWords = /崩溃|撑不住|想消失|不想活|绝望|救救我/
  const sadWords = /委屈|想哭|难过|烦|焦虑|生气|疲惫|好累|没人理解/
  const requestedComfort = /哄哄|抱抱|陪陪|安慰/.test(content)

  let emotionLevel = 0
  let emotionType = '平静'

  if (strongWords.test(content)) {
    emotionLevel = 4
    emotionType = '强烈低落'
  } else if (sadWords.test(content) || moodScore <= 1) {
    emotionLevel = moodScore <= 1 ? 3 : 2
    emotionType = content.includes('焦虑') ? '焦虑' : content.includes('生气') ? '生气' : '委屈'
  } else if (moodScore <= 2) {
    emotionLevel = 1
    emotionType = '轻微低落'
  }

  if (requestedComfort && emotionLevel < 3) {
    emotionLevel = 3
    emotionType = '需要陪伴'
  }

  const comfortText = [
    '今天的你也被认真记录下来啦，继续轻轻松松往前走。',
    '有一点点低落也没关系，先把自己照顾好，慢慢来就好。',
    '今天这种委屈感是真的会让人累。先抱抱你，你已经做得很好啦。',
    '你不需要一个人把所有情绪都扛住。先停一下，喝点水，允许自己被抱抱。',
    '我很在意你现在的感受。请马上联系一个你信任的人，别一个人待在危险里。'
  ][emotionLevel]

  return {
    emotionLevel,
    emotionType,
    comfortText,
    notifyPartner: emotionLevel >= 3,
    boyfriendMessage: emotionLevel >= 3
      ? '歪宝今天可能有点不开心，适合温柔一点陪她聊聊。'
      : ''
  }
}

function normalizeAiAnalysis(value: unknown) {
  const fallback = analyzeEmotion('', 3)

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const data = value as Record<string, unknown>
  const level = Number(data.emotion_level ?? data.emotionLevel ?? fallback.emotionLevel)
  const emotionLevel = Number.isFinite(level) ? Math.max(0, Math.min(4, Math.round(level))) : fallback.emotionLevel
  const emotionType = String(data.emotion_type ?? data.emotionType ?? fallback.emotionType)
  const comfortText = String(data.comfort_text ?? data.comfortText ?? fallback.comfortText)
  const notifyPartner = emotionLevel >= 3 && Boolean(data.notify_boyfriend ?? data.notifyPartner ?? true)
  const boyfriendMessage = String(data.boyfriend_message ?? data.boyfriendMessage ?? '')

  return {
    emotionLevel,
    emotionType,
    comfortText,
    notifyPartner,
    boyfriendMessage: notifyPartner && boyfriendMessage
      ? boyfriendMessage
      : notifyPartner
        ? '歪宝今天可能有点不开心，适合温柔一点陪她聊聊。'
        : ''
  }
}

@Injectable()
export class MockStoreService {
  private user = {
    id: 1,
    openid: 'mock-openid-waibao',
    nickname: '歪宝',
    avatar: '',
    birthday: '2026-08-08',
    gender: 'female',
    role: 'waibao',
    preferredName: '小宝宝',
    loveStartDate: '2025-01-01'
  }

  private partner = {
    id: 2,
    openid: 'mock-openid-boyfriend',
    nickname: '男朋友',
    avatar: '',
    role: 'boyfriend'
  }

  private couple = {
    id: 1,
    userId: 1,
    partnerId: 2,
    loveStartDate: '2025-01-01',
    bindCode: 'WY5201314',
    status: 'active'
  }

  private privacy = {
    allowWishView: true,
    allowEmotionNotify: true,
    allowPeriodNotify: false,
    allowMoodView: false
  }

  private importantDates: ImportantDate[] = [
    {
      id: 1,
      userId: 1,
      coupleId: 1,
      title: '歪宝生日',
      date: '2026-08-08',
      repeatType: 'yearly',
      remindDaysBefore: 7,
      showOnHome: true,
      remindPartner: true
    },
    {
      id: 2,
      userId: 1,
      coupleId: 1,
      title: '恋爱纪念日',
      date: '2025-01-01',
      repeatType: 'yearly',
      remindDaysBefore: 7,
      showOnHome: true,
      remindPartner: true
    }
  ]

  private weather = {
    city: '上海',
    current: 22,
    temperatureMin: 18,
    temperatureMax: 25,
    weather: '小雨',
    rainProbability: 62,
    uv: '中等',
    airQuality: '良',
    clothingAdvice: '薄外套 + 长裤 + 防滑鞋',
    skincareAdvice: '简单防晒，晚上注意保湿',
    summary: '下午可能有小雨，出门记得带伞，薄外套会更舒服。',
    forecast: [
      { day: '今天', weather: '小雨', temp: '18 - 25℃' },
      { day: '明天', weather: '多云', temp: '19 - 27℃' },
      { day: '后天', weather: '晴', temp: '21 - 29℃' }
    ]
  }

  private todos: Todo[] = [
    {
      id: 1,
      userId: 1,
      title: '喝水',
      dueDate: today(),
      priority: 'normal',
      status: 'pending',
      repeatType: 'none'
    },
    {
      id: 2,
      userId: 1,
      title: '晚上早点休息',
      dueDate: today(),
      priority: 'high',
      status: 'pending',
      repeatType: 'none'
    }
  ]

  private wishes: Wish[] = [
    {
      id: 1,
      userId: 1,
      title: '想去海边',
      description: '想穿漂亮小裙子拍照',
      imageUrl: '',
      category: '想去的地方',
      priority: 'high',
      progress: 30,
      status: 'wanted',
      claimedBy: null
    },
    {
      id: 2,
      userId: 1,
      title: '想吃火锅',
      description: '要番茄锅和很多虾滑',
      imageUrl: '',
      category: '想吃的东西',
      priority: 'normal',
      progress: 10,
      status: 'claimed',
      claimedBy: 2
    }
  ]

  private diaries: Diary[] = []

  private periodRecords: PeriodRecord[] = [
    {
      id: 1,
      userId: 1,
      startDate: '2026-05-16',
      endDate: '2026-05-20',
      painLevel: '轻微',
      flowLevel: '正常',
      mood: '正常',
      note: '第一版先做生活记录'
    }
  ]

  private wardrobeItems: WardrobeItem[] = [
    {
      id: 1,
      userId: 1,
      imageUrl: '',
      type: '外套',
      color: '米白',
      style: '温柔',
      season: '春秋'
    },
    {
      id: 2,
      userId: 1,
      imageUrl: '',
      type: '裤子',
      color: '浅蓝',
      style: '休闲',
      season: '四季'
    },
    {
      id: 3,
      userId: 1,
      imageUrl: '',
      type: '鞋子',
      color: '白色',
      style: '通勤',
      season: '四季'
    }
  ]

  getMe() {
    return {
      user: this.user,
      partner: this.partner,
      couple: this.couple,
      privacy: this.privacy
    }
  }

  mockLogin(payload: Record<string, unknown>) {
    return {
      token: 'mock-token',
      isNewUser: false,
      user: {
        ...this.user,
        nickname: String(payload.nickname || this.user.nickname)
      }
    }
  }

  updateProfile(payload: Record<string, unknown>) {
    this.user = {
      ...this.user,
      nickname: String(payload.nickname || this.user.nickname),
      avatar: String(payload.avatar || this.user.avatar),
      birthday: String(payload.birthday || this.user.birthday),
      preferredName: String(payload.preferredName || this.user.preferredName),
      loveStartDate: String(payload.loveStartDate || this.user.loveStartDate)
    }

    if (payload.loveStartDate) {
      this.couple.loveStartDate = String(payload.loveStartDate)
    }

    return this.user
  }

  getPrivacy() {
    return this.privacy
  }

  updatePrivacy(payload: Record<string, unknown>) {
    this.privacy = {
      allowWishView: typeof payload.allowWishView === 'boolean' ? payload.allowWishView : this.privacy.allowWishView,
      allowEmotionNotify: typeof payload.allowEmotionNotify === 'boolean' ? payload.allowEmotionNotify : this.privacy.allowEmotionNotify,
      allowPeriodNotify: typeof payload.allowPeriodNotify === 'boolean' ? payload.allowPeriodNotify : this.privacy.allowPeriodNotify,
      allowMoodView: typeof payload.allowMoodView === 'boolean' ? payload.allowMoodView : this.privacy.allowMoodView
    }

    return this.privacy
  }

  getImportantDates() {
    return this.importantDates
  }

  addImportantDate(payload: Record<string, unknown>) {
    const repeatType = String(payload.repeatType) === 'yearly' ? 'yearly' : 'none'
    const item: ImportantDate = {
      id: nextId(this.importantDates),
      userId: 1,
      coupleId: this.couple.id,
      title: String(payload.title || '重要日子').trim(),
      date: String(payload.date || today()),
      repeatType,
      remindDaysBefore: Number(payload.remindDaysBefore || 0),
      showOnHome: typeof payload.showOnHome === 'boolean' ? payload.showOnHome : true,
      remindPartner: typeof payload.remindPartner === 'boolean' ? payload.remindPartner : false
    }

    this.importantDates.unshift(item)
    return item
  }

  updateImportantDate(id: number, payload: Record<string, unknown>) {
    const item = this.importantDates.find((date) => date.id === id)
    if (!item) return null

    item.title = String(payload.title || item.title)
    item.date = String(payload.date || item.date)
    item.repeatType = String(payload.repeatType) === 'yearly' ? 'yearly' : item.repeatType
    item.remindDaysBefore = payload.remindDaysBefore === undefined ? item.remindDaysBefore : Number(payload.remindDaysBefore)
    item.showOnHome = typeof payload.showOnHome === 'boolean' ? payload.showOnHome : item.showOnHome
    item.remindPartner = typeof payload.remindPartner === 'boolean' ? payload.remindPartner : item.remindPartner

    return item
  }

  deleteImportantDate(id: number) {
    const before = this.importantDates.length
    this.importantDates = this.importantDates.filter((item) => item.id !== id)
    return { deleted: this.importantDates.length < before }
  }

  getTodayHome() {
    return {
      greeting: `${getGreeting()}，${this.user.nickname}`,
      encouragement: '今天也慢慢来，你已经很棒啦。',
      user: this.user,
      partner: this.partner,
      loveDays: daysFrom(this.couple.loveStartDate),
      importantDates: this.importantDates
        .filter((item) => item.showOnHome)
        .map((item) => ({
          ...item,
          daysLeft: getDaysLeft(item.date, item.repeatType),
          isToday: getDaysLeft(item.date, item.repeatType) === 0
        })),
      weather: this.weather,
      todos: this.todos.filter((item) => item.dueDate === today()),
      diary: this.diaries[0] || null
    }
  }

  getBoyfriendHome() {
    const latestDiary = this.diaries[0]

    return {
      waiBaoStatus: latestDiary?.emotionType || '状态平稳',
      todayAdvice: latestDiary?.notifyPartner ? '适合温柔一点陪她聊聊' : '今天可以多夸夸她',
      importantDates: this.getTodayHome().importantDates,
      recentWishes: this.privacy.allowWishView ? this.wishes.slice(0, 2) : []
    }
  }

  getCouple() {
    return this.couple
  }

  generateBindCode() {
    this.couple.bindCode = `WY${Math.floor(100000 + Math.random() * 900000)}`
    return {
      bindCode: this.couple.bindCode,
      expiresInSeconds: 1800
    }
  }

  getWeather() {
    return this.weather
  }

  getTodos() {
    return this.todos
  }

  addTodo(payload: Record<string, unknown>) {
    const priority = ['low', 'normal', 'high'].includes(String(payload.priority))
      ? String(payload.priority) as Todo['priority']
      : 'normal'
    const repeatType = ['none', 'daily', 'weekly', 'monthly'].includes(String(payload.repeatType))
      ? String(payload.repeatType) as Todo['repeatType']
      : 'none'

    const todo: Todo = {
      id: nextId(this.todos),
      userId: 1,
      title: String(payload.title || '').trim(),
      dueDate: String(payload.dueDate || today()),
      priority,
      status: 'pending',
      repeatType
    }

    this.todos.unshift(todo)
    return todo
  }

  completeTodo(id: number) {
    const todo = this.todos.find((item) => item.id === id)
    if (!todo) return null
    todo.status = 'done'
    return todo
  }

  getWishes() {
    return this.wishes
  }

  addWish(payload: Record<string, unknown>) {
    const priority = ['low', 'normal', 'high'].includes(String(payload.priority))
      ? String(payload.priority) as Wish['priority']
      : 'normal'

    const wish: Wish = {
      id: nextId(this.wishes),
      userId: 1,
      title: String(payload.title || '').trim(),
      description: String(payload.description || '想和你一起完成'),
      imageUrl: String(payload.imageUrl || ''),
      category: String(payload.category || '想一起做的事'),
      priority,
      progress: 0,
      status: 'wanted',
      claimedBy: null
    }

    this.wishes.unshift(wish)
    return wish
  }

  claimWish(id: number) {
    const wish = this.wishes.find((item) => item.id === id)
    if (!wish) return null
    wish.status = 'claimed'
    wish.claimedBy = this.partner.id
    wish.progress = Math.max(wish.progress, 10)
    return wish
  }

  updateWishProgress(id: number, progress: number) {
    const wish = this.wishes.find((item) => item.id === id)
    if (!wish) return null
    wish.progress = Math.max(0, Math.min(100, progress))
    wish.status = wish.progress >= 100 ? 'done' : wish.status
    return wish
  }

  getDiaries() {
    return this.diaries
  }

  async analyzeDiaryWithAi(payload: { content: string; moodScore: number }) {
    if (process.env.AI_PROVIDER !== 'deepseek' || !process.env.AI_API_KEY) {
      return analyzeEmotion(payload.content, payload.moodScore)
    }

    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: [
              '你是歪宝小窝的情绪陪伴助手，必须温柔、克制、保护隐私。',
              '请分析用户日记和心情分，返回严格 JSON，不要输出多余文本。',
              '不要把日记原文暴露给伴侣；男朋友消息只能是概括性的关心建议。',
              'JSON 字段：emotion_level(0-4), emotion_type, comfort_text, notify_boyfriend, boyfriend_message。'
            ].join('\n')
          },
          {
            role: 'user',
            content: JSON.stringify({
              diary_content: payload.content,
              mood_score: payload.moodScore,
              note: 'mood_score 越低代表越不开心。请优先安抚情绪，再给轻建议。'
            })
          }
        ],
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek request failed with ${response.status}`)
    }

    const completion = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const content = completion.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('DeepSeek returned empty content')
    }

    return normalizeAiAnalysis(JSON.parse(content))
  }

  async addDiary(payload: { content: string; moodScore: number }) {
    let analysis = analyzeEmotion(payload.content, payload.moodScore)

    try {
      analysis = await this.analyzeDiaryWithAi(payload)
    } catch {
      analysis = analyzeEmotion(payload.content, payload.moodScore)
    }

    const diary: Diary = {
      id: nextId(this.diaries),
      userId: 1,
      content: payload.content,
      moodScore: payload.moodScore,
      ...analysis,
      createdAt: new Date().toISOString()
    }

    this.diaries.unshift(diary)
    return diary
  }

  getPeriodRecords() {
    return this.periodRecords
  }

  addPeriodRecord(payload: Record<string, unknown>) {
    const record: PeriodRecord = {
      id: nextId(this.periodRecords),
      userId: 1,
      startDate: String(payload.startDate || today()),
      endDate: String(payload.endDate || payload.startDate || today()),
      painLevel: String(payload.painLevel || '轻微'),
      flowLevel: String(payload.flowLevel || '正常'),
      mood: String(payload.mood || '正常'),
      note: String(payload.note || '已记录')
    }

    this.periodRecords.unshift(record)
    return record
  }

  getWardrobeItems() {
    return this.wardrobeItems
  }

  addWardrobeItem(payload: Record<string, unknown>) {
    const item: WardrobeItem = {
      id: nextId(this.wardrobeItems),
      userId: 1,
      imageUrl: String(payload.imageUrl || ''),
      type: String(payload.type || '上衣'),
      color: String(payload.color || '白色'),
      style: String(payload.style || '日常'),
      season: String(payload.season || '四季')
    }

    this.wardrobeItems.unshift(item)
    return item
  }

  deleteWardrobeItem(id: number) {
    const before = this.wardrobeItems.length
    this.wardrobeItems = this.wardrobeItems.filter((item) => item.id !== id)
    return { deleted: this.wardrobeItems.length < before }
  }

  getOotdRecommendation() {
    const isRainy = /雨/.test(`${this.weather.weather}${this.weather.summary}`)
    const isCool = this.weather.temperatureMin <= 20
    const itemTypes = isRainy || isCool
      ? ['外套', '上衣', '裤子', '鞋子']
      : ['上衣', '裙子', '裤子', '鞋子']
    const picked = itemTypes
      .map((type) => this.wardrobeItems.find((item) => item.type === type))
      .filter((item): item is WardrobeItem => Boolean(item))

    return {
      weatherSummary: `${this.weather.weather}，${this.weather.temperatureMin}-${this.weather.temperatureMax}℃`,
      title: picked.length
        ? picked.map((item) => `${item.color}${item.type}`).join(' + ')
        : '薄外套 + 长裤 + 防滑鞋',
      reason: isRainy
        ? '今天可能下雨，温差偏大，优先选择外套、长裤和不容易打滑的鞋子。'
        : isCool
          ? '今天早晚有点凉，搭一件外套会更舒服，也方便室内外切换。'
          : '今天温度比较舒服，可以选择轻盈一点的搭配，保持清爽就好。',
      items: picked,
      tags: [
        isRainy ? '带伞' : '轻便',
        isCool ? '薄外套' : '透气',
        this.weather.uv === '强' ? '注意防晒' : '简单防晒'
      ]
    }
  }
}
