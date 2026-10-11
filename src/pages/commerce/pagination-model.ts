export function paginationRange(total: number, pageSize: number, requestedPage: number) {
  const count = Math.max(0, Math.floor(total));
  const size = Math.max(1, Math.floor(pageSize));
  const pages = Math.max(1, Math.ceil(count / size));
  const page = Math.max(0, Math.min(Math.floor(requestedPage), pages - 1));
  const offset = page * size;
  return { page, pages, offset, start: count ? offset + 1 : 0, end: Math.min(offset + size, count), total: count };
}
