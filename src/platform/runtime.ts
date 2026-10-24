/** runtime 相关的浏览器 API 收口 */

export function openOptionsPage(): void {
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage()
  }
}

export function getExtensionVersion(): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    return chrome.runtime.getManifest().version
  }
  return '0.0.0-dev'
}

/** 扩展内资源路径 → 可访问 URL（开发模式用 dev server 根路径） */
export function extensionUrl(path: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path)
  }
  return new URL(`/${path.replace(/^\//, '')}`, location.origin).toString()
}
