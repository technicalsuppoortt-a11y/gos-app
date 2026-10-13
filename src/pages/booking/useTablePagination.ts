import { useState } from 'react';

export function useTablePagination<T>(items: T[], filterKey: string) {
  const [state, setState] = useState({ page: 1, size: 10, filterKey });
  const count = Math.max(1, Math.ceil(items.length / state.size));
  const page = state.filterKey === filterKey ? Math.min(state.page, count) : 1;
  if (state.filterKey !== filterKey || state.page !== page) setState({ ...state, filterKey, page });
  const start = (page - 1) * state.size;
  return {
    rows: items.slice(start, start + state.size), total: items.length, page, count, size: state.size,
    setPage: (next: number) => setState({ ...state, filterKey, page: Math.max(1, Math.min(next, count)) }),
    setSize: (size: number) => setState({ page: 1, size, filterKey }),
  };
}

