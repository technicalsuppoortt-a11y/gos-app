import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import type { useTablePagination } from './useTablePagination';

export function TablePagination({ pagination: p, noun, sizes, onNavigate }: { pagination: ReturnType<typeof useTablePagination>; noun: string; sizes: readonly number[]; onNavigate?: () => void }) {
  useUILanguage();
  return <footer className="ce-table-pagination" aria-label={translateText(`${noun} pagination`)}>
    <div className="ce-page-size"><span>{translateText("Rows per page")}</span><CommerceSelect label={`${noun} rows per page`} value={String(p.pageSize)} options={sizes.map(String)} onChange={value => { p.setPageSize(Number(value)); onNavigate?.(); }}/></div>
    <span className="ce-page-range" role="status" aria-live="polite">{translateText("Showing ")}{localizeNode(p.start)}–{localizeNode(p.end)}{translateText(" of ")}{localizeNode(p.total)} {localizeNode(noun)}</span>
    <nav aria-label={translateText(`${noun} pages`)}><button className="cw-button small" disabled={p.page === 0} onClick={() => { p.setPage(p.page - 1); onNavigate?.(); }}><ChevronLeft size={13}/>{translateText("Previous")}</button><span>{translateText("Page ")}<b>{localizeNode(p.page + 1)}</b>{translateText(" of ")}{localizeNode(p.pages)}</span><button className="cw-button small" disabled={p.page >= p.pages - 1} onClick={() => { p.setPage(p.page + 1); onNavigate?.(); }}>{translateText("Next")}<ChevronRight size={13}/></button></nav>
  </footer>;
}
