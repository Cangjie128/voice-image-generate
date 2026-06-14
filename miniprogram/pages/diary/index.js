const { saveDiary } = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole } = require('../../utils/role')

Page({
  data: {
    moods: ['很好', '还可以', '有点累', '不太开心', '想被抱抱'],
    moodIndex: 2,
    content: '',
    loading: false,
    result: null
  },

  onLoad() {
    ensureRole('waibao')
  },

  onMoodChange(event) {
    this.setData({ moodIndex: Number(event.detail.value) })
  },

  onInput(event) {
    this.setData({ content: event.detail.value })
  },

  async submit() {
    const content = this.data.content.trim()

    if (!content) {
      wx.showToast({ title: '先写一点内容', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      const result = await api.createDiary(content, 4 - this.data.moodIndex)
      this.setData({
        loading: false,
        result,
        content: ''
      })
    } catch (error) {
      const result = saveDiary(content, 4 - this.data.moodIndex)
      this.setData({
        loading: false,
        result,
        content: ''
      })
    }
  }
})
