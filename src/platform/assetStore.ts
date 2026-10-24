/**
 * 本地资产仓库（IndexedDB）：壁纸等大文件以 Blob 原样存储，
 * 配置树只保留 asset:<id> 引用，避免撑爆 chrome.storage / 未来同步通道。
 */
import { newId } from '@/shared/id'

const DB_NAME = 'hyacinth'
const DB_VERSION = 1
const STORE = 'assets'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** 存入资产，返回资产 id */
export function putAsset(blob: Blob): Promise<string> {
  const id = newId()
  return withStore('readwrite', (store) => store.put(blob, id)).then(() => id)
}

export function getAsset(id: string): Promise<Blob | undefined> {
  return withStore('readonly', (store) => store.get(id) as IDBRequest<Blob | undefined>)
}

/** 尽力删除（资产不存在不视为错误） */
export async function deleteAsset(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}
