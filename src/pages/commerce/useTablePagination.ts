import { useState } from 'react';
import { paginationRange } from './pagination-model';

export function useTablePagination(total: number) {
  const [state, setState] = useState({ page: 0, pageSize: 10 });
  const range = paginationRange(total, state.pageSize, state.page);
  // Clamp after a filter or deletion removes the last page, without an extra effect.
  if (state.page !== range.page) setState({ ...state, page: range.page });
  return { ...range, pageSize: state.pageSize,
    setPage: (page: number) => setState(current => ({ ...current, page })),
    setPageSize: (pageSize: number) => setState({ page: 0, pageSize }),
  };
}
