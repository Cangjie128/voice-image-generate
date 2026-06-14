const {
  getWishes,
  addWish: addWishToStore,
  claimWish: claimWishInStore,
  updateWishProgress
} = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole } = require('../../utils/role')

const statusMap = {
  wanted: '想要中',
  claimed: '已认领',
  preparing: '准备中',
  done: '已完成',
  archived: '已归档'
}

const priorityMap = {
  low: '随缘',
  normal: '想要',
  high: '很想要'
}

Page({
  data: {
    wishes: [],
    categories: ['想买的东西', '想吃的东西', '想去的地方', '想一起做的事', '小惊喜'],
    priorities: ['随缘', '想要', '很想要'],
    priorityValues: ['low', 'normal', 'high'],
    categoryIndex: 2,
    priorityIndex: 1,
    form: {
      title: '',
      description: ''
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

  decorate(wishes) {
    return wishes.map((item) => ({
      ...item,
      statusLabel: statusMap[item.status] || item.status,
      priorityLabel: priorityMap[item.priority] || item.priority,
      categoryShort: item.category.replace('想', '').slice(0, 2)
    }))
  },

  async refresh() {
    let wishes = getWishes()

    try {
      wishes = await api.getWishes()
    } catch (error) {
      wishes = getWishes()
    }

    this.setData({ wishes: this.decorate(wishes) })
  },

  onTitleInput(event) {
    this.setData({ 'form.title': event.detail.value })
  },

  onDescInput(event) {
    this.setData({ 'form.description': event.detail.value })
  },

  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) })
  },

  onPriorityChange(event) {
    this.setData({ priorityIndex: Number(event.detail.value) })
  },

  async addWish() {
    if (!this.data.form.title.trim()) {
      wx.showToast({ title: '先写心愿标题', icon: 'none' })
      return
    }

    const payload = {
      title: this.data.form.title,
      description: this.data.form.description || '想和你一起完成',
      category: this.data.categories[this.data.categoryIndex],
      priority: this.data.priorityValues[this.data.priorityIndex]
    }

    try {
      await api.addWish(payload)
    } catch (error) {
      addWishToStore(payload)
    }

    this.setData({
      form: {
        title: '',
        description: ''
      }
    })
    this.refresh()
    wx.showToast({ title: '已放进心愿墙', icon: 'none' })
  },

  async claimWish(event) {
    const id = Number(event.currentTarget.dataset.id)

    try {
      await api.claimWish(id)
    } catch (error) {
      claimWishInStore(id)
    }

    this.refresh()
    wx.showToast({ title: '已认领', icon: 'success' })
  },

  async onProgressChange(event) {
    const id = Number(event.currentTarget.dataset.id)
    const progress = Number(event.detail.value)

    try {
      await api.updateWishProgress(id, progress)
    } catch (error) {
      updateWishProgress(id, progress)
    }

    this.refresh()
  },

  async finishWish(event) {
    const id = Number(event.currentTarget.dataset.id)

    try {
      await api.updateWishProgress(id, 100)
    } catch (error) {
      updateWishProgress(id, 100)
    }

    this.refresh()
    wx.showToast({ title: '心愿完成啦', icon: 'success' })
  }
})
