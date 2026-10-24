/** 槽位/链接等实体的 id 生成 */
export function newId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}
