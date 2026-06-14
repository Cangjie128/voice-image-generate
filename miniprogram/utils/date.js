const DAY = 24 * 60 * 60 * 1000

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function formatDate(date) {
  const value = date instanceof Date ? date : new Date(date)
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function getGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour >= 5 && hour <= 10) return '早安'
  if (hour >= 11 && hour <= 13) return '中午好'
  if (hour >= 14 && hour <= 17) return '下午好'
  if (hour >= 18 && hour <= 23) return '晚上好'
  return '夜深啦'
}

function daysFrom(startDate, endDate = new Date()) {
  if (!startDate) return 0

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  return Math.max(1, Math.floor((end - start) / DAY) + 1)
}

function getDaysLeft(date, repeatType = 'none', now = new Date()) {
  const base = new Date(`${date}T00:00:00`)
  let target = new Date(base)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (repeatType === 'yearly') {
    target = new Date(now.getFullYear(), base.getMonth(), base.getDate())

    if (target < today) {
      target = new Date(now.getFullYear() + 1, base.getMonth(), base.getDate())
    }
  }

  return Math.ceil((target - today) / DAY)
}

module.exports = {
  formatDate,
  getGreeting,
  daysFrom,
  getDaysLeft
}
