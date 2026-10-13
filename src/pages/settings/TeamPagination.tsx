import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { useTablePagination } from '../commerce/useTablePagination';
import { Select } from '../../components/ui/Select';
export function TeamPagination({ pagination: p }: { pagination: ReturnType<typeof useTablePagination> }) {
  useUILanguage();
 return <footer className="st-pagination" aria-label={translateText("Team members pagination")}>
  <label className="st-page-size flex items-center gap-2">{translateText("Rows per page")}<Select label="Team members rows per page" value={String(p.pageSize)} onChange={value => p.setPageSize(Number(value))} options={[10, 25, 50].map(String)} /></label>
  <span className="st-page-range" role="status" aria-live="polite">{translateText("Showing ")}{localizeNode(p.start)}–{localizeNode(p.end)}{translateText(" of ")}{localizeNode(p.total)}{translateText(" members")}</span>
  <nav aria-label={translateText("Team members pages")}><button className="st-secondary small" disabled={p.page === 0} onClick={() => p.setPage(p.page - 1)}><ChevronLeft size={14}/>{translateText("Previous")}</button><span>{translateText("Page ")}<b>{localizeNode(p.page + 1)}</b>{translateText(" of ")}{localizeNode(p.pages)}</span><button className="st-secondary small" disabled={p.page >= p.pages - 1} onClick={() => p.setPage(p.page + 1)}>{translateText("Next")}<ChevronRight size={14}/></button></nav>
 </footer>;
}
