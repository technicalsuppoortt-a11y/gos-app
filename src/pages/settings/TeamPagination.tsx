import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { useTablePagination } from '../commerce/useTablePagination';
import { Select } from '../../components/ui/Select';
export function TeamPagination({ pagination: p }: { pagination: ReturnType<typeof useTablePagination> }) {
 return <footer className="st-pagination" aria-label="Team members pagination">
  <label className="st-page-size flex items-center gap-2">Rows per page<Select label="Team members rows per page" value={String(p.pageSize)} onChange={value => p.setPageSize(Number(value))} options={[10, 25, 50].map(String)} /></label>
  <span className="st-page-range" role="status" aria-live="polite">Showing {p.start}–{p.end} of {p.total} members</span>
  <nav aria-label="Team members pages"><button className="st-secondary small" disabled={p.page === 0} onClick={() => p.setPage(p.page - 1)}><ChevronLeft size={14}/>Previous</button><span>Page <b>{p.page + 1}</b> of {p.pages}</span><button className="st-secondary small" disabled={p.page >= p.pages - 1} onClick={() => p.setPage(p.page + 1)}>Next<ChevronRight size={14}/></button></nav>
 </footer>;
}
