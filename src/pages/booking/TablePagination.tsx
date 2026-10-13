import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useTablePagination } from './useTablePagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BookingSelect } from './BookingSelect';


type Pagination = Omit<ReturnType<typeof useTablePagination>, 'rows'>;
export function TablePagination({ pagination: p, label }: { pagination: Pagination; label: string }) {
  useUILanguage();
  const numbers = [...new Set([1, p.count, p.page - 1, p.page, p.page + 1])].filter(n => n > 0 && n <= p.count).sort((a, b) => a - b);
  return <footer className="bk-table-pagination">
    <label>{translateText("Rows per page")}<BookingSelect aria-label={translateText(`${label} rows per page`)} value={p.size} onChange={e => p.setSize(Number(e.target.value))}>{localizeNode([10, 25, 50, 100].map(n => <option key={n} value={n}>{localizeNode(n)}</option>))}</BookingSelect></label>
    <span role="status">{translateText("Showing ")}{localizeNode(p.total ? (p.page - 1) * p.size + 1 : 0)}–{localizeNode(Math.min(p.page * p.size, p.total))}{translateText(" of ")}{localizeNode(p.total)}{translateText(" items")}</span>
    <nav aria-label={translateText(`${label} pagination`)}><button className="bk-button" disabled={p.page === 1} onClick={() => p.setPage(p.page - 1)}><ChevronLeft size={14}/>{translateText("Previous")}</button>
      {localizeNode(numbers.map((n, i) => <span key={n}>{localizeNode(i > 0 && n - numbers[i - 1] > 1 && <span className="bk-page-gap">…</span>)}<button className={`bk-button ${n === p.page ? 'primary' : ''}`} aria-label={translateText(`Page ${n}`)} aria-current={n === p.page ? 'page' : undefined} onClick={() => p.setPage(n)}>{localizeNode(n)}</button></span>))}
      <button className="bk-button" disabled={p.page === p.count} onClick={() => p.setPage(p.page + 1)}>{translateText("Next")}<ChevronRight size={14}/></button>
    </nav>
  </footer>;
}
