/** 标签颜色（接口 tags.color）映射到设计稿的标签色板 */
const TAG_PALETTE = {
  '#4B719C': { fg: 'var(--color-tag-blue-text)', bg: 'var(--color-tag-blue-bg)' },
  '#5F8774': { fg: 'var(--color-tag-green-text)', bg: 'var(--color-tag-green-bg)' },
  '#A4864F': { fg: 'var(--color-tag-amber-text)', bg: 'var(--color-tag-amber-bg)' },
  '#84729E': { fg: 'var(--color-tag-purple-text)', bg: 'var(--color-tag-purple-bg)' },
  '#778596': { fg: 'var(--color-tag-neutral-text)', bg: 'var(--color-tag-neutral-bg)' },
}

export const tagStyle = (tag) => {
  const palette = TAG_PALETTE[tag?.color] || TAG_PALETTE['#778596']
  return {
    color: palette.fg,
    backgroundColor: palette.bg,
  }
}

export const entryTypeLabel = (type) => {
  if (type === 'event') return '日程'
  if (type === 'todo') return '待办'
  return '备忘'
}
