import * as React from "react";

import { cn } from "@/lib/utils";

type TableResponsive = "compact" | "scroll" | "stack";

const TableContext = React.createContext<TableResponsive>("compact");

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { responsive?: TableResponsive }
>(({ className, responsive = "compact", ...props }, ref) => (
  <TableContext.Provider value={responsive}>
    <div
      className={cn(
        "relative w-full overscroll-x-contain",
        (responsive === "scroll" || responsive === "compact") && "overflow-x-auto",
        responsive === "compact" && "table-responsive-compact",
        responsive === "stack" && "table-responsive-stack",
      )}
    >
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-[10px] leading-tight md:text-sm md:leading-normal",
          responsive === "scroll" && "min-w-[360px]",
          className,
        )}
        {...props}
      />
    </div>
  </TableContext.Provider>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-6 whitespace-nowrap px-0.5 text-left align-middle text-[9px] font-semibold uppercase tracking-wide text-muted-foreground md:h-10 md:px-3 md:text-sm md:font-medium md:normal-case md:tracking-normal [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { label?: string }
>(({ className, label, ...props }, ref) => (
  <td
    ref={ref}
    data-label={label}
    className={cn(
      "px-0.5 py-0.5 align-middle md:p-3 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

/** Card-style wrapper for page tables — compact on small screens with horizontal scroll when needed. */
function TableCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-card md:rounded-2xl", className)}>
      {children}
    </div>
  );
}

/** Hide table column on small screens (show from md breakpoint up). */
const tableColHideMobile = "hidden md:table-cell";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableCard,
  tableColHideMobile,
};
