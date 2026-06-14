function getBaseUrl() {
  const app = getApp()
  return app && app.globalData && app.globalData.apiBaseUrl
    ? app.globalData.apiBaseUrl
    : 'http://localhost:3000'
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}/api${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || 3500,
      header: {
        'content-type': 'application/json',
        ...(options.header || {})
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data)
          return
        }

        reject(new Error(`API ${path} failed with ${response.statusCode}`))
      },
      fail(error) {
        reject(error)
      }
    })
  })
}

function getTodayHome() {
  return request('/home/today')
}

function getBoyfriendHome() {
  return request('/home/boyfriend')
}

function getWeather() {
  return request('/weather/today')
}

function addTodo(title) {
  return request('/todos', {
    method: 'POST',
    data: {
      title,
      priority: 'normal',
      repeatType: 'none'
    }
  })
}

function completeTodo(id) {
  return request(`/todos/${id}/complete`, { method: 'POST' })
}

function createDiary(content, moodScore) {
  return request('/diaries', {
    method: 'POST',
    data: {
      content,
      moodScore
    }
  })
}

function getWishes() {
  return request('/wishes')
}

function addWish(payload) {
  return request('/wishes', {
    method: 'POST',
    data: payload
  })
}

function claimWish(id) {
  return request(`/wishes/${id}/claim`, { method: 'POST' })
}

function updateWishProgress(id, progress) {
  return request(`/wishes/${id}/progress`, {
    method: 'PATCH',
    data: { progress }
  })
}

function getMe() {
  return request('/me')
}

function generateBindCode() {
  return request('/couples/bind-code', { method: 'POST' })
}

function updatePrivacy(payload) {
  return request('/privacy-settings', {
    method: 'PATCH',
    data: payload
  })
}

function getImportantDates() {
  return request('/important-dates')
}

function getPeriodRecords() {
  return request('/period-records')
}

function addPeriodRecord(payload) {
  return request('/period-records', {
    method: 'POST',
    data: payload
  })
}

function getWardrobeItems() {
  return request('/wardrobe-items')
}

function addWardrobeItem(payload) {
  return request('/wardrobe-items', {
    method: 'POST',
    data: payload
  })
}

function deleteWardrobeItem(id) {
  return request(`/wardrobe-items/${id}`, { method: 'DELETE' })
}

function getOotdRecommendation() {
  return request('/ootd/recommendation')
}

module.exports = {
  getTodayHome,
  getBoyfriendHome,
  getWeather,
  addTodo,
  completeTodo,
  createDiary,
  getWishes,
  addWish,
  claimWish,
  updateWishProgress,
  getMe,
  generateBindCode,
  updatePrivacy,
  getImportantDates,
  getPeriodRecords,
  addPeriodRecord,
  getWardrobeItems,
  addWardrobeItem,
  deleteWardrobeItem,
  getOotdRecommendation
}
