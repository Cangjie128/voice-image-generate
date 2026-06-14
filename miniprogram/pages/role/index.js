const { setSelectedRole, enterRoleHome } = require('../../utils/role')

Page({
  chooseWaibao() {
    setSelectedRole('waibao')
    enterRoleHome('waibao')
  },

  chooseBoyfriend() {
    setSelectedRole('boyfriend')
    enterRoleHome('boyfriend')
  }
})
