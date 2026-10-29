import { api, type Item } from '../api'
import { toast, toastError, useLoad } from '../ui'

/** Načtení a úpravy jedné sbírky obsahu (realizace / services / faqs). */
export function useItems<D>(collection: 'realizace' | 'services' | 'faqs') {
  const q = useLoad<Item<D>[]>(`admin/items/${collection}`)
  const save = async (item: { id?: string; data: D; published: boolean }) => {
    try {
      if (item.id) await api(`admin/items/${collection}/${encodeURIComponent(item.id)}`, { method: 'PUT', body: item })
      else await api(`admin/items/${collection}`, { body: item })
      toast(item.id ? 'Uloženo' : 'Přidáno na web')
      await q.reload()
      return true
    } catch (e) { toastError(e); return false }
  }
  const remove = async (id: string) => {
    try {
      await api(`admin/items/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      q.setData((d) => d?.filter((x) => x.id !== id) ?? null)
      toast('Smazáno')
      return true
    } catch (e) { toastError(e); return false }
  }
  const move = async (id: string, dir: -1 | 1) => {
    const list = [...(q.data ?? [])]
    const i = list.findIndex((x) => x.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    q.setData(list)
    try { await api(`admin/items/${collection}/order`, { body: { ids: list.map((x) => x.id) } }) } catch (e) { toastError(e); q.reload() }
  }
  return { ...q, save, remove, move }
}
