App({
  globalData: {
    appName: '歪宝小窝',
    apiBaseUrl: 'http://localhost:3000'
  },

  onLaunch() {
    wx.setStorageSync('launched', true)
  }
})
