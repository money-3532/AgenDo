import { describe, expect, it } from 'vitest'
import { buildMonthCells } from '../utils/date'

describe('buildMonthCells', () => {
  it('生成 2026 年 6 月的 5 行月历，并从周一开始', () => {
    const cells = buildMonthCells({ year: 2026, month: 6 })

    expect(cells).toHaveLength(35)
    expect(cells[0].key).toBe('2026-06-01')
    expect(cells[29].key).toBe('2026-06-30')
    expect(cells[30].isOutside).toBe(true)
    expect(cells.find((cell) => cell.isToday)?.key).toBe('2026-06-18')
  })

  it('按月份天数自动补足 6 行', () => {
    const cells = buildMonthCells({ year: 2026, month: 8 })

    expect(cells).toHaveLength(42)
    expect(cells[0].key).toBe('2026-07-27')
  })
})
