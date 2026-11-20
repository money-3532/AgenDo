const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 运行当天即「今天」，全站日期与相对时间都基于它计算 */
export const TODAY_KEY = toDateKey(new Date())

export const parseDateKey = (key) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const addDays = (date, amount) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export const daysBetween = (fromKey, toKey) =>
  Math.round((parseDateKey(toKey) - parseDateKey(fromKey)) / 86400000)

/** "6月18日" */
export const formatDateCN = (key) => {
  const date = parseDateKey(key)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** "6月18日 · 周四" */
export const formatDateWithWeekday = (key) => `${formatDateCN(key)} · ${WEEKDAYS[parseDateKey(key).getDay()]}`

/** "2026年6月" */
export const formatMonthCN = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`

export const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** "14:00 — 15:00" */
export const formatTimeRange = (start, end) => `${formatTime(start)} — ${formatTime(end)}`

/** 分组标题：今天 · 6月18日 周三 / 昨天 · 6月17日 周二 / 6月20日 · 周六 */
export const formatDayGroupLabel = (key) => {
  const diff = daysBetween(TODAY_KEY, key)
  if (diff === 0) return `今天 · ${formatDateCN(key)} ${WEEKDAYS[parseDateKey(key).getDay()]}`
  if (diff === -1) return `昨天 · ${formatDateCN(key)} ${WEEKDAYS[parseDateKey(key).getDay()]}`
  if (diff === 1) return `明天 · ${formatDateCN(key)} ${WEEKDAYS[parseDateKey(key).getDay()]}`
  return `${formatDateCN(key)} · ${WEEKDAYS[parseDateKey(key).getDay()]}`
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / 昨天 / 09/24 */
export const formatRelativeTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  if (diffMinutes < 60 * 24) return `${Math.floor(diffMinutes / 60)} 小时前`
  const key = toDateKey(date)
  if (daysBetween(key, TODAY_KEY) === 1) return '昨天'
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 生成月视图单元格（周一起始）。
 */
export const buildMonthCells = ({ year, month, todayKey = TODAY_KEY, rows = null }) => {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const start = addDays(first, -offset)
  const daysInMonth = new Date(year, month, 0).getDate()
  const rowCount = rows || Math.ceil((offset + daysInMonth) / 7)
  const cells = []
  for (let index = 0; index < rowCount * 7; index += 1) {
    const date = addDays(start, index)
    const key = toDateKey(date)
    cells.push({
      key,
      day: date.getDate(),
      month: date.getMonth() + 1,
      isOutside: date.getMonth() + 1 !== month,
      isToday: key === todayKey,
    })
  }
  return cells
}

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
