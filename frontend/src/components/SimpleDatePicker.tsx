import { cn } from "@/lib/utils";

const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseIso(value: string): { day: string; month: string; year: string } {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { day: "", month: "", year: "" };
  }
  const [year, month, day] = value.split("-");
  return { day, month, year };
}

function toIso(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  const maxDay = daysInMonth(Number(year), Number(month));
  const d = Math.min(Number(day), maxDay);
  return `${year}-${month}-${String(d).padStart(2, "0")}`;
}

const selectClass = cn(
  "h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-background px-2 text-base shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
);

type SimpleDatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  /** First year in dropdown (default: current year) */
  yearFrom?: number;
  /** Last year in dropdown (default: current year + 15) */
  yearTo?: number;
  className?: string;
};

export function SimpleDatePicker({
  value,
  onChange,
  yearFrom,
  yearTo,
  className,
}: SimpleDatePickerProps) {
  const now = new Date();
  const startYear = yearFrom ?? now.getFullYear();
  const endYear = yearTo ?? now.getFullYear() + 15;
  const { day, month, year } = parseIso(value);

  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  const maxDay = month && year ? daysInMonth(Number(year), Number(month)) : 31;
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0"));

  const update = (next: { day?: string; month?: string; year?: string }) => {
    const d = next.day ?? day;
    const m = next.month ?? month;
    const y = next.year ?? year;
    onChange(toIso(d, m, y));
  };

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <select
        aria-label="Day"
        className={selectClass}
        value={day}
        onChange={(e) => update({ day: e.target.value })}
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {Number(d)}
          </option>
        ))}
      </select>
      <select
        aria-label="Month"
        className={selectClass}
        value={month}
        onChange={(e) => update({ month: e.target.value })}
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Year"
        className={selectClass}
        value={year}
        onChange={(e) => update({ year: e.target.value })}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
