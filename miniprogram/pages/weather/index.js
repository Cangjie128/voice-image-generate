const { getState } = require('../../utils/store')
const { getOotdRecommendation } = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole } = require('../../utils/role')

Page({
  data: {
    weather: {},
    ootd: {
      title: '薄外套 + 长裤 + 防滑鞋',
      reason: '今天可能下雨，温差偏大，穿得舒服一点更好。',
      tags: ['薄外套', '带伞', '简单防晒']
    }
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
    let weather = getState().weather
    let ootd = getOotdRecommendation()

    try {
      const responses = await Promise.all([
        api.getWeather(),
        api.getOotdRecommendation()
      ])
      weather = responses[0]
      ootd = responses[1]
    } catch (error) {
      weather = getState().weather
      ootd = getOotdRecommendation()
    }

    this.setData({ weather, ootd })
  },

  goOotd() {
    wx.navigateTo({ url: '/pages/ootd/index' })
  }
})
