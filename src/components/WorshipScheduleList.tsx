import { WORSHIP_SCHEDULE } from "@/lib/worship-schedule";

type WorshipScheduleListProps = {
  className?: string;
  itemClassName?: string;
};

export function WorshipScheduleList({
  className = "space-y-3 text-sm",
  itemClassName = "flex items-start gap-3",
}: WorshipScheduleListProps) {
  return (
    <ul className={className}>
      {WORSHIP_SCHEDULE.map((item) => (
        <li key={item.day} className={itemClassName}>
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
          <span>
            <strong>{item.day}</strong> — {item.title} · {item.time}
          </span>
        </li>
      ))}
    </ul>
  );
}
