import { HyacinthPlugin } from '@/plugin-sdk/client'

/** 倒计时示例插件：走通 storage（持久目标日）/ theme（变量联动）/ layout（紧凑尺寸请求） */

const plugin = new HyacinthPlugin()

interface CountdownData {
  title: string
  date: string // yyyy-mm-dd
}

const els = {
  box: document.getElementById('box')!,
  days: document.getElementById('days')!,
  unit: document.getElementById('unit')!,
  title: document.getElementById('title')!,
  titleInput: document.getElementById('title-input') as HTMLInputElement,
  dateInput: document.getElementById('date-input') as HTMLInputElement,
  save: document.getElementById('save')!,
  toggle: document.getElementById('toggle')!,
}

function daysLeft(dateStr: string): number | null {
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86_400_000)
}

function render(data: CountdownData | undefined): void {
  const left = data?.date ? daysLeft(data.date) : null
  if (left === null || left === undefined) {
    els.days.textContent = '—'
    els.unit.textContent = '点右上角 ✎ 设置'
    els.title.textContent = ''
    return
  }
  els.days.textContent = String(Math.abs(left))
  els.unit.textContent = left >= 0 ? '天（还剩）' : '天（已过）'
  els.title.textContent = data?.title || ''
}

async function save(): Promise<void> {
  const data: CountdownData = {
    title: els.titleInput.value.trim(),
    date: els.dateInput.value,
  }
  await plugin.setStorage('target', data)
  render(data)
  els.box.classList.remove('editing')
  // layout API 演示：未设置时占大位置，设置后收缩到紧凑卡片
  await plugin.resizeSlot(data.date ? 7 : 4, data.date ? 5 : 3)
}

void plugin.ready.then(async () => {
  plugin.applyTheme()
  plugin.onThemeChange = (vars) => plugin.applyTheme(vars)

  const saved = await plugin.getStorage<CountdownData>('target')
  render(saved)
  if (saved) {
    els.titleInput.value = saved.title
    els.dateInput.value = saved.date
  }

  els.toggle.addEventListener('click', () => els.box.classList.add('editing'))
  els.save.addEventListener('click', () => void save())
  els.dateInput.addEventListener('change', () => void save())
})
