const { formatDate, getGreeting, daysFrom, getDaysLeft } = require('./date')

const STORAGE_KEY = 'waibao_state_v1'

const initialState = {
  user: {
    id: 1,
    role: 'waibao',
    nickname: '歪宝',
    avatar: '',
    birthday: '2026-08-08',
    preferredName: '小宝宝',
    comfortPreference: '先抱抱，再慢慢讲道理',
    dislikeExpression: '不要说别想太多',
    loveStartDate: '2025-01-01'
  },
  partner: {
    id: 2,
    nickname: '男朋友'
  },
  couple: {
    status: 'active',
    bindCode: 'WY5201314',
    loveStartDate: '2025-01-01'
  },
  privacy: {
    allowWishView: true,
    allowEmotionNotify: true,
    allowPeriodNotify: false,
    allowMoodView: false
  },
  importantDates: [
    {
      id: 1,
      title: '歪宝生日',
      date: '2026-08-08',
      repeatType: 'yearly',
      showOnHome: true,
      remindPartner: true
    },
    {
      id: 2,
      title: '恋爱纪念日',
      date: '2025-01-01',
      repeatType: 'yearly',
      showOnHome: true,
      remindPartner: true
    },
    {
      id: 3,
      title: '第一次旅行',
      date: '2026-06-20',
      repeatType: 'none',
      showOnHome: true,
      remindPartner: false
    }
  ],
  weather: {
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
  },
  todos: [
    {
      id: 1,
      title: '喝水',
      dueDate: formatDate(new Date()),
      priority: 'normal',
      status: 'pending'
    },
    {
      id: 2,
      title: '晚上早点休息',
      dueDate: formatDate(new Date()),
      priority: 'high',
      status: 'pending'
    }
  ],
  diaries: [],
  wishes: [
    {
      id: 1,
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
      title: '想吃火锅',
      description: '要番茄锅和很多虾滑',
      imageUrl: '',
      category: '想吃的东西',
      priority: 'normal',
      progress: 0,
      status: 'claimed',
      claimedBy: 2
    }
  ],
  periodRecords: [
    {
      id: 1,
      startDate: '2026-05-16',
      endDate: '2026-05-20',
      painLevel: '轻微',
      flowLevel: '正常',
      mood: '正常',
      note: '第一版先做生活记录'
    }
  ],
  wardrobeItems: [
    {
      id: 1,
      imageUrl: '',
      type: '外套',
      color: '米白',
      style: '温柔',
      season: '春秋'
    },
    {
      id: 2,
      imageUrl: '',
      type: '裤子',
      color: '浅蓝',
      style: '休闲',
      season: '四季'
    },
    {
      id: 3,
      imageUrl: '',
      type: '鞋子',
      color: '白色',
      style: '通勤',
      season: '四季'
    }
  ],
  notifications: []
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getState() {
  const saved = wx.getStorageSync(STORAGE_KEY)

  if (saved) return saved

  const state = clone(initialState)
  wx.setStorageSync(STORAGE_KEY, state)
  return state
}

function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, state)
  return state
}

function nextId(list) {
  return list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1
}

function getHomeSnapshot() {
  const state = getState()
  const today = formatDate(new Date())
  const dates = state.importantDates
    .filter((item) => item.showOnHome)
    .map((item) => ({
      ...item,
      daysLeft: getDaysLeft(item.date, item.repeatType),
      isToday: getDaysLeft(item.date, item.repeatType) === 0,
      countdownText: getDaysLeft(item.date, item.repeatType) === 0
        ? '就是今天'
        : `还有 ${getDaysLeft(item.date, item.repeatType)} 天`
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)

  return {
    user: state.user,
    partner: state.partner,
    privacy: state.privacy,
    greeting: `${getGreeting()}，${state.user.nickname}`,
    encouragement: '今天也慢慢来，你已经很棒啦。',
    loveDays: daysFrom(state.couple.loveStartDate || state.user.loveStartDate),
    importantDates: dates,
    weather: state.weather,
    todos: state.todos.filter((item) => item.dueDate === today),
    diary: state.diaries[0] || null
  }
}

function getBoyfriendSnapshot() {
  const state = getState()
  const latestDiary = state.diaries[0] || null
  const dates = state.importantDates
    .filter((item) => item.showOnHome)
    .map((item) => ({
      ...item,
      daysLeft: getDaysLeft(item.date, item.repeatType),
      isToday: getDaysLeft(item.date, item.repeatType) === 0
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)

  return {
    status: latestDiary ? latestDiary.emotionType : '状态平稳',
    advice: latestDiary && latestDiary.notifyPartner ? '适合温柔一点陪她聊聊' : '今天可以多夸夸她',
    message: latestDiary && latestDiary.boyfriendMessage ? latestDiary.boyfriendMessage : '歪宝今天也需要被认真喜欢。',
    importantDates: dates,
    wishes: state.privacy.allowWishView ? state.wishes.slice(0, 3) : [],
    privacy: state.privacy
  }
}

function addTodo(title) {
  const state = getState()
  const trimmed = title.trim()

  if (!trimmed) return state.todos

  state.todos.unshift({
    id: nextId(state.todos),
    title: trimmed,
    dueDate: formatDate(new Date()),
    priority: 'normal',
    status: 'pending'
  })

  saveState(state)
  return state.todos
}

function toggleTodo(id) {
  const state = getState()
  state.todos = state.todos.map((item) => (
    item.id === id
      ? { ...item, status: item.status === 'done' ? 'pending' : 'done' }
      : item
  ))
  saveState(state)
  return state.todos
}

function analyzeEmotion(content, moodScore) {
  const text = content || ''
  const strongWords = /崩溃|撑不住|想消失|不想活|绝望|救救我/
  const sadWords = /委屈|想哭|难过|烦|焦虑|生气|疲惫|好累|没人理解/
  const requestedComfort = /哄哄|抱抱|陪陪|安慰/.test(text)

  let level = 0
  let type = '平静'

  if (strongWords.test(text)) {
    level = 4
    type = '强烈低落'
  } else if (sadWords.test(text) || moodScore <= 1) {
    level = moodScore <= 1 ? 3 : 2
    type = text.includes('焦虑') ? '焦虑' : text.includes('生气') ? '生气' : '委屈'
  } else if (moodScore <= 2) {
    level = 1
    type = '轻微低落'
  }

  if (requestedComfort && level < 3) {
    level = 3
    type = '需要陪伴'
  }

  const comfortMap = {
    0: '今天的你也被认真记录下来啦，继续轻轻松松往前走。',
    1: '有一点点低落也没关系，先把自己照顾好，慢慢来就好。',
    2: '今天这种委屈感是真的会让人累。先抱抱你，你已经做得很好啦。',
    3: '你不需要一个人把所有情绪都扛住。先停一下，喝点水，允许自己被抱抱。',
    4: '我很在意你现在的感受。请马上联系一个你信任的人，别一个人待在危险里。'
  }

  return {
    emotionLevel: level,
    emotionType: type,
    comfortText: comfortMap[level],
    notifyPartner: level >= 3,
    boyfriendMessage: level >= 3
      ? '歪宝今天可能有点不开心，适合温柔一点陪她聊聊。'
      : ''
  }
}

function saveDiary(content, moodScore) {
  const state = getState()
  const analysis = analyzeEmotion(content, moodScore)
  const diary = {
    id: nextId(state.diaries),
    content,
    moodScore,
    ...analysis,
    createdAt: new Date().toISOString()
  }

  state.diaries.unshift(diary)

  if (analysis.notifyPartner && state.privacy.allowEmotionNotify) {
    state.notifications.unshift({
      id: nextId(state.notifications),
      userId: state.user.id,
      targetUserId: state.partner.id,
      type: 'emotion',
      content: analysis.boyfriendMessage,
      status: 'sent',
      createdAt: new Date().toISOString()
    })
  }

  saveState(state)
  return diary
}

function getWishes() {
  return getState().wishes
}

function addWish(payload) {
  const state = getState()

  state.wishes.unshift({
    id: nextId(state.wishes),
    title: payload.title.trim(),
    description: payload.description.trim(),
    imageUrl: '',
    category: payload.category,
    priority: payload.priority,
    progress: 0,
    status: 'wanted',
    claimedBy: null
  })

  saveState(state)
  return state.wishes
}

function claimWish(id) {
  const state = getState()
  state.wishes = state.wishes.map((item) => (
    item.id === id
      ? { ...item, status: 'claimed', claimedBy: state.partner.id, progress: Math.max(item.progress, 10) }
      : item
  ))
  saveState(state)
  return state.wishes
}

function updateWishProgress(id, progress) {
  const state = getState()
  state.wishes = state.wishes.map((item) => (
    item.id === id
      ? { ...item, progress, status: progress >= 100 ? 'done' : item.status }
      : item
  ))
  saveState(state)
  return state.wishes
}

function getPeriodRecords() {
  return getState().periodRecords
}

function addPeriodRecord(payload) {
  const state = getState()
  state.periodRecords.unshift({
    id: nextId(state.periodRecords),
    ...payload
  })
  saveState(state)
  return state.periodRecords
}

function getWardrobeItems() {
  return getState().wardrobeItems || []
}

function addWardrobeItem(payload) {
  const state = getState()

  if (!state.wardrobeItems) {
    state.wardrobeItems = []
  }

  state.wardrobeItems.unshift({
    id: nextId(state.wardrobeItems),
    imageUrl: payload.imageUrl || '',
    type: payload.type,
    color: payload.color,
    style: payload.style,
    season: payload.season
  })

  saveState(state)
  return state.wardrobeItems
}

function deleteWardrobeItem(id) {
  const state = getState()
  state.wardrobeItems = (state.wardrobeItems || []).filter((item) => item.id !== id)
  saveState(state)
  return state.wardrobeItems
}

function getOotdRecommendation() {
  const state = getState()
  const weather = state.weather
  const items = state.wardrobeItems || []
  const isRainy = /雨/.test(weather.weather || weather.summary || '')
  const isCool = Number(weather.temperatureMin) <= 20
  const itemTypes = isRainy || isCool
    ? ['外套', '上衣', '裤子', '鞋子']
    : ['上衣', '裙子', '裤子', '鞋子']

  const picked = itemTypes
    .map((type) => items.find((item) => item.type === type))
    .filter(Boolean)

  return {
    weatherSummary: `${weather.weather}，${weather.temperatureMin}-${weather.temperatureMax}℃`,
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
      weather.uv === '强' ? '注意防晒' : '简单防晒'
    ]
  }
}

function updatePrivacy(key, value) {
  const state = getState()
  state.privacy[key] = value
  saveState(state)
  return state.privacy
}

function generateBindCode() {
  const state = getState()
  state.couple.bindCode = `WY${Math.floor(100000 + Math.random() * 900000)}`
  saveState(state)
  return state.couple.bindCode
}

module.exports = {
  getState,
  getHomeSnapshot,
  getBoyfriendSnapshot,
  addTodo,
  toggleTodo,
  saveDiary,
  getWishes,
  addWish,
  claimWish,
  updateWishProgress,
  getPeriodRecords,
  addPeriodRecord,
  getWardrobeItems,
  addWardrobeItem,
  deleteWardrobeItem,
  getOotdRecommendation,
  updatePrivacy,
  generateBindCode
}
