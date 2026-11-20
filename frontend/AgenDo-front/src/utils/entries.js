/** 悬浮预览中展示的同日关联条目：排除自身，最多取 2 条 */
export const relatedEntries = (entries, entryId, limit = 2) =>
  entries.filter((item) => item.id !== entryId).slice(0, limit)
