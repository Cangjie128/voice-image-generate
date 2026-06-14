const { formatDate } = require('../../utils/date')
const { getPeriodRecords, addPeriodRecord } = require('../../utils/store')
const api = require('../../utils/api')
const { ensureRole } = require('../../utils/role')

Page({
  data: {
    records: [],
    painOptions: ['无', '轻微', '中等', '严重'],
    flowOptions: ['少', '正常', '多'],
    moodOptions: ['正常', '易怒', '难过', '焦虑'],
    painIndex: 1,
    flowIndex: 1,
    moodIndex: 0,
    form: {
      startDate: formatDate(new Date()),
      endDate: formatDate(new Date()),
      note: ''
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
    try {
      this.setData({ records: await api.getPeriodRecords() })
    } catch (error) {
      this.setData({ records: getPeriodRecords() })
    }
  },

  onStartDateChange(event) {
    this.setData({ 'form.startDate': event.detail.value })
  },

  onEndDateChange(event) {
    this.setData({ 'form.endDate': event.detail.value })
  },

  onPainChange(event) {
    this.setData({ painIndex: Number(event.detail.value) })
  },

  onFlowChange(event) {
    this.setData({ flowIndex: Number(event.detail.value) })
  },

  onMoodChange(event) {
    this.setData({ moodIndex: Number(event.detail.value) })
  },

  onNoteInput(event) {
    this.setData({ 'form.note': event.detail.value })
  },

  async addRecord() {
    const payload = {
      startDate: this.data.form.startDate,
      endDate: this.data.form.endDate,
      painLevel: this.data.painOptions[this.data.painIndex],
      flowLevel: this.data.flowOptions[this.data.flowIndex],
      mood: this.data.moodOptions[this.data.moodIndex],
      note: this.data.form.note || '已记录'
    }

    try {
      await api.addPeriodRecord(payload)
    } catch (error) {
      addPeriodRecord(payload)
    }

    this.setData({ 'form.note': '' })
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  }
})
