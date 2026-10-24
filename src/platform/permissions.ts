/** 插件 fetch 权限对应的 origin 授权（MV3 optional host permissions，安装/启用时用户手势触发） */

export async function requestOriginPermission(origin: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.request) return true // 普通浏览器开发环境跳过
  try {
    return await chrome.permissions.request({ origins: [origin] })
  } catch {
    return false
  }
}

export async function containsOriginPermission(origin: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.contains) return true
  try {
    return await chrome.permissions.contains({ origins: [origin] })
  } catch {
    return false
  }
}

/** 把 fetch:xxx 权限项换算成 origin 匹配模式（通配符覆盖子域） */
export function fetchPermissionOrigins(permission: string): string[] {
  if (!permission.startsWith('fetch:')) return []
  const host = permission.slice('fetch:'.length).toLowerCase()
  if (host.startsWith('*.')) {
    const base = host.slice(2)
    return [`https://${base}/*`, `https://*.${base}/*`]
  }
  return [`https://${host}/*`, `http://${host}/*`]
}
