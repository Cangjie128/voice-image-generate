const ROLE_KEY = 'waibao_selected_role'

function getSelectedRole() {
  return wx.getStorageSync(ROLE_KEY) || ''
}

function setSelectedRole(role) {
  wx.setStorageSync(ROLE_KEY, role)
}

function clearSelectedRole() {
  wx.removeStorageSync(ROLE_KEY)
}

function ensureRole(pageRole) {
  const role = getSelectedRole()

  if (!role) {
    wx.reLaunch({ url: '/pages/role/index' })
    return false
  }

  if (pageRole && role !== pageRole) {
    wx.reLaunch({
      url: role === 'boyfriend' ? '/pages/boyfriend/index' : '/pages/today/index'
    })
    return false
  }

  return true
}

function enterRoleHome(role) {
  if (role === 'boyfriend') {
    wx.reLaunch({ url: '/pages/boyfriend/index' })
    return
  }

  wx.switchTab({ url: '/pages/today/index' })
}

module.exports = {
  getSelectedRole,
  setSelectedRole,
  clearSelectedRole,
  ensureRole,
  enterRoleHome
}
