export type WorshipScheduleItem = {
  day: string;
  title: string;
  time: string;
};

/** Ratiba ya ibada za kila wiki — PHM-ARCC Iyumbu */
export const WORSHIP_SCHEDULE: WorshipScheduleItem[] = [
  {
    day: "Jumanne",
    title: "Idara ya Wanawake (WWM)",
    time: "10:30 jioni",
  },
  {
    day: "Jumatano",
    title: "Mafundisho ya Biblia / Neno la Mungu",
    time: "10:30 jioni",
  },
  {
    day: "Ijumaa",
    title: "Maombi na Maombezi",
    time: "10:30 jioni",
  },
  {
    day: "Jumamosi",
    title: "Idara ya Vijana (CFD'S)",
    time: "4:30 asubuhi",
  },
  {
    day: "Jumapili",
    title: "Ibada Kuu",
    time: "9:00 asubuhi",
  },
];

export const WORSHIP_SCHEDULE_EVENTS = WORSHIP_SCHEDULE.map((item) => ({
  tag:
    item.title.includes("WWM")
      ? "WWM"
      : item.title.includes("CFD")
        ? "CFD'S"
        : item.title.includes("Ibada")
          ? "Ibada"
          : item.title.includes("Maombi")
            ? "Maombi"
            : "Neno",
  title: item.title,
  date: `Kila ${item.day}`,
  time: item.time,
  place: "PHM-ARCC Iyumbu",
  desc: `${item.day} — ${item.title}`,
}));
