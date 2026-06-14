const {
  getHomeSnapshot,
  addTodo: addTodoToStore,
  toggleTodo: toggleTodoInStore,
  saveDiary
} = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole } = require('../../utils/role')

Page({
  data: {
    greeting: '',
    encouragement: '',
    loveDays: 0,
    importantDates: [],
    weather: {},
    todos: [],
    moods: ['很好', '还可以', '有点累', '不太开心', '想被抱抱'],
    moodIndex: 1,
    diaryDraft: '',
    newTodoTitle: '',
    aiAnalyzing: false,
    aiResult: null
  },

  onLoad() {
    if (ensureRole('waibao')) {
      this.refresh()
    }
  },

  onShow() {
    if (ensureRole('waibao')) {
      this.refresh()
    }
  },

  async refresh() {
    let snapshot = getHomeSnapshot()

    try {
      snapshot = await api.getTodayHome()
    } catch (error) {
      snapshot = getHomeSnapshot()
    }

    this.setData({
      greeting: snapshot.greeting,
      encouragement: snapshot.encouragement,
      loveDays: snapshot.loveDays,
      importantDates: snapshot.importantDates,
      weather: snapshot.weather,
      todos: snapshot.todos,
      aiResult: snapshot.diary
    })
  },

  onTodoInput(event) {
    this.setData({ newTodoTitle: event.detail.value })
  },

  async addTodo() {
    if (!this.data.newTodoTitle.trim()) {
      wx.showToast({ title: '先写一个小任务', icon: 'none' })
      return
    }

    try {
      await api.addTodo(this.data.newTodoTitle)
    } catch (error) {
      addTodoToStore(this.data.newTodoTitle)
    }

    this.setData({ newTodoTitle: '' })
    this.refresh()
  },

  async toggleTodo(event) {
    const id = Number(event.currentTarget.dataset.id)

    try {
      await api.completeTodo(id)
    } catch (error) {
      toggleTodoInStore(id)
    }

    this.refresh()
    wx.showToast({ title: '歪宝真棒', icon: 'success' })
  },

  onMoodChange(event) {
    this.setData({ moodIndex: Number(event.detail.value) })
  },

  onDiaryInput(event) {
    this.setData({ diaryDraft: event.detail.value })
  },

  async submitDiary() {
    const content = this.data.diaryDraft.trim()

    if (!content) {
      wx.showToast({ title: '先写一点点今天吧', icon: 'none' })
      return
    }

    this.setData({ aiAnalyzing: true })

    try {
      const result = await api.createDiary(content, 4 - this.data.moodIndex)
      this.setData({
        aiAnalyzing: false,
        aiResult: result,
        diaryDraft: ''
      })
      wx.showToast({ title: '小窝抱住你啦', icon: 'none' })
    } catch (error) {
      const result = saveDiary(content, 4 - this.data.moodIndex)
      this.setData({
        aiAnalyzing: false,
        aiResult: result,
        diaryDraft: ''
      })
      wx.showToast({ title: '小窝抱住你啦', icon: 'none' })
    }
  },

  goWeather() {
    wx.switchTab({ url: '/pages/weather/index' })
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/index' })
  },

  goDiary() {
    wx.navigateTo({ url: '/pages/diary/index' })
  }
})
