import React from 'react';
import { cn } from '../../utils/cn';
import './table.css';

export type TableColumnAlign = 'start' | 'center' | 'end';

const alignClassMap: Record<TableColumnAlign, string> = {
  start: 'text-start [text-align:start]',
  center: 'text-center [text-align:center]',
  end: 'text-end [text-align:end]',
};

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: 'compact' | 'comfortable';
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, density = 'compact', ...props }, ref) => (
    <table
      ref={ref}
      data-density={density}
      className={cn('gos-table w-full border-collapse align-middle text-start', className)}
      {...props}
    />
  )
);
Table.displayName = 'Table';

/** Opt-in scrolling keeps the table element and its ref backwards-compatible. */
export const TableScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, tabIndex = 0, role, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('gos-table-scroll', className)}
      tabIndex={tabIndex}
      role={role ?? (props['aria-label'] || props['aria-labelledby'] ? 'region' : undefined)}
      {...props}
    />
  )
);
TableScrollArea.displayName = 'TableScrollArea';

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('gos-table-caption', className)} {...props} />
  )
);
TableCaption.displayName = 'TableCaption';

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('gos-table-header [&_tr]:border-b', className)} {...props} />
  )
);
TableHeader.displayName = 'TableHeader';

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('gos-table-body [&_tr:last-child]:border-0', className)} {...props} />
  )
);
TableBody.displayName = 'TableBody';

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('gos-table-footer border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('gos-table-row transition-colors', className)}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export interface TableHeadProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: TableColumnAlign;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, align = 'start', scope = 'col', ...props }, ref) => (
    <th
      ref={ref}
      scope={scope}
      data-align={align}
      className={cn(
        'gos-table-head px-3.5 py-2.5 align-middle font-medium',
        alignClassMap[align],
        align === 'center' && 'justify-center',
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: TableColumnAlign;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'start', ...props }, ref) => (
    <td
      ref={ref}
      data-align={align}
      className={cn(
        'gos-table-cell px-3.5 py-2.5 align-middle',
        alignClassMap[align],
        align === 'center' && 'justify-center',
        className
      )}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';
