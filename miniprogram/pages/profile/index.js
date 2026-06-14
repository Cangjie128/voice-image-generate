const {
  getState,
  updatePrivacy,
  generateBindCode
} = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole, clearSelectedRole } = require('../../utils/role')

Page({
  data: {
    avatarText: '歪',
    user: {},
    couple: {},
    privacy: {},
    importantDates: []
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
    let state = getState()

    try {
      state = await api.getMe()
      state.importantDates = await api.getImportantDates()
    } catch (error) {
      state = getState()
    }

    const importantDates = state.importantDates || getState().importantDates

    this.setData({
      avatarText: state.user.nickname.slice(0, 1),
      user: state.user,
      couple: state.couple,
      privacy: state.privacy,
      importantDates
    })
  },

  async generateCode() {
    try {
      await api.generateBindCode()
    } catch (error) {
      generateBindCode()
    }

    this.refresh()
    wx.showToast({ title: '邀请码已更新', icon: 'none' })
  },

  async onPrivacyChange(event) {
    const key = event.currentTarget.dataset.key
    const nextPrivacy = {
      ...this.data.privacy,
      [key]: event.detail.value
    }

    try {
      await api.updatePrivacy(nextPrivacy)
    } catch (error) {
      updatePrivacy(key, event.detail.value)
    }

    this.refresh()
    wx.showToast({ title: '已保存设置', icon: 'success' })
  },

  chooseRoleAgain() {
    clearSelectedRole()
    wx.reLaunch({ url: '/pages/role/index' })
  }
})
