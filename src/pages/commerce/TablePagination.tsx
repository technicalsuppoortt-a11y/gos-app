import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import type { useTablePagination } from './useTablePagination';

export function TablePagination({ pagination: p, noun, sizes, onNavigate }: { pagination: ReturnType<typeof useTablePagination>; noun: string; sizes: readonly number[]; onNavigate?: () => void }) {
  return <footer className="ce-table-pagination" aria-label={`${noun} pagination`}>
    <div className="ce-page-size"><span>Rows per page</span><CommerceSelect label={`${noun} rows per page`} value={String(p.pageSize)} options={sizes.map(String)} onChange={value => { p.setPageSize(Number(value)); onNavigate?.(); }}/></div>
    <span className="ce-page-range" role="status" aria-live="polite">Showing {p.start}–{p.end} of {p.total} {noun}</span>
    <nav aria-label={`${noun} pages`}><button className="cw-button small" disabled={p.page === 0} onClick={() => { p.setPage(p.page - 1); onNavigate?.(); }}><ChevronLeft size={13}/>Previous</button><span>Page <b>{p.page + 1}</b> of {p.pages}</span><button className="cw-button small" disabled={p.page >= p.pages - 1} onClick={() => { p.setPage(p.page + 1); onNavigate?.(); }}>Next<ChevronRight size={13}/></button></nav>
  </footer>;
}
