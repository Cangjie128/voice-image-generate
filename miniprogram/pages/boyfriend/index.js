const { getBoyfriendSnapshot } = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole, clearSelectedRole } = require('../../utils/role')

const phrases = [
  '抱抱歪宝，今天辛苦啦。不开心可以慢慢说，我一直都在。',
  '宝宝别难过，你已经很棒了，今天不用把自己逼得太紧。',
  '今天不想努力也没关系，我陪你，我们一点点来。',
  '我想听你说说今天，也想认真抱抱你。'
]

Page({
  data: {
    snapshot: {
      status: '',
      advice: '',
      importantDates: [],
      wishes: []
    },
    currentPhrase: phrases[0],
    phraseIndex: 0,
    bindCode: ''
  },

  onLoad() {
    if (ensureRole('boyfriend')) {
      this.refresh()
    }
  },

  onShow() {
    if (ensureRole('boyfriend')) {
      this.refresh()
    }
  },

  async refresh() {
    let snapshot = getBoyfriendSnapshot()

    try {
      const response = await api.getBoyfriendHome()
      snapshot = {
        status: response.waiBaoStatus,
        advice: response.todayAdvice,
        message: response.todayAdvice,
        importantDates: response.importantDates || [],
        wishes: response.recentWishes || []
      }
    } catch (error) {
      snapshot = getBoyfriendSnapshot()
    }

    this.setData({
      snapshot,
      currentPhrase: snapshot.message || phrases[this.data.phraseIndex]
    })
  },

  refreshPhrase() {
    const nextIndex = (this.data.phraseIndex + 1) % phrases.length
    this.setData({
      phraseIndex: nextIndex,
      currentPhrase: phrases[nextIndex]
    })
  },

  copyPhrase() {
    wx.setClipboardData({
      data: this.data.currentPhrase,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  onBindCodeInput(event) {
    this.setData({ bindCode: event.detail.value })
  },

  submitBindCode() {
    if (!this.data.bindCode.trim()) {
      wx.showToast({ title: '先输入邀请码', icon: 'none' })
      return
    }

    wx.showToast({ title: '绑定流程待接入', icon: 'none' })
  },

  chooseRoleAgain() {
    clearSelectedRole()
    wx.reLaunch({ url: '/pages/role/index' })
  }
})
