const {
  getWardrobeItems,
  addWardrobeItem,
  deleteWardrobeItem,
  getOotdRecommendation
} = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole } = require('../../utils/role')

Page({
  data: {
    recommendation: {
      title: '薄外套 + 长裤 + 防滑鞋',
      weatherSummary: '',
      reason: '今天可能下雨，温差偏大，穿得舒服一点更好。',
      items: [],
      tags: ['薄外套', '带伞', '简单防晒']
    },
    wardrobeItems: [],
    typeOptions: ['上衣', '外套', '裤子', '裙子', '鞋子', '包包', '配饰'],
    colorOptions: ['白色', '黑色', '米白', '浅蓝', '粉色', '灰色', '棕色', '绿色'],
    styleOptions: ['日常', '温柔', '休闲', '通勤', '甜美', '运动', '约会'],
    seasonOptions: ['四季', '春秋', '夏季', '冬季'],
    typeIndex: 0,
    colorIndex: 0,
    styleIndex: 0,
    seasonIndex: 0,
    form: {
      imageUrl: ''
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
    let wardrobeItems = getWardrobeItems()
    let recommendation = getOotdRecommendation()

    try {
      const responses = await Promise.all([
        api.getWardrobeItems(),
        api.getOotdRecommendation()
      ])
      wardrobeItems = responses[0]
      recommendation = responses[1]
    } catch (error) {
      wardrobeItems = getWardrobeItems()
      recommendation = getOotdRecommendation()
    }

    this.setData({
      wardrobeItems,
      recommendation
    })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (result) => {
        const file = result.tempFiles && result.tempFiles[0]
        this.setData({ 'form.imageUrl': file ? file.tempFilePath : '' })
      }
    })
  },

  onTypeChange(event) {
    this.setData({ typeIndex: Number(event.detail.value) })
  },

  onColorChange(event) {
    this.setData({ colorIndex: Number(event.detail.value) })
  },

  onStyleChange(event) {
    this.setData({ styleIndex: Number(event.detail.value) })
  },

  onSeasonChange(event) {
    this.setData({ seasonIndex: Number(event.detail.value) })
  },

  async addItem() {
    const payload = {
      imageUrl: this.data.form.imageUrl,
      type: this.data.typeOptions[this.data.typeIndex],
      color: this.data.colorOptions[this.data.colorIndex],
      style: this.data.styleOptions[this.data.styleIndex],
      season: this.data.seasonOptions[this.data.seasonIndex]
    }

    try {
      await api.addWardrobeItem(payload)
    } catch (error) {
      addWardrobeItem(payload)
    }

    this.setData({ 'form.imageUrl': '' })
    await this.refresh()
    wx.showToast({ title: '已加入衣橱', icon: 'success' })
  },

  async deleteItem(event) {
    const id = Number(event.currentTarget.dataset.id)

    try {
      await api.deleteWardrobeItem(id)
    } catch (error) {
      deleteWardrobeItem(id)
    }

    await this.refresh()
    wx.showToast({ title: '已删除', icon: 'none' })
  }
})
