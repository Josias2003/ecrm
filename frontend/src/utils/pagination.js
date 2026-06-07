export const PAGE_SIZE = 20

export function pageSlice(items, page, pageSize = PAGE_SIZE) {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function totalPages(total, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize))
}
