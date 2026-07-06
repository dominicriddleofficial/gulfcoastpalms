import { parseDateOnlyLocal, toLocalDateKey, todayLocalKey, startOfLocalDay, endOfLocalDay, isSameLocalDay, addLocalDays } from "/dev-server/src/lib/localDate.ts";
import { format } from "date-fns";

console.log("TZ:", Intl.DateTimeFormat().resolvedOptions().timeZone);

// (i) Schedule day-header: dateKey "2026-07-06" → local Mon Jul 6
const key = "2026-07-06";
const d = parseDateOnlyLocal(key);
console.log("(i) DayHeader for", key, "=>", format(d, "EEEE, MMMM d, yyyy"));

// (ii) Chart Today marker with today Mon Jul 6 09:00 local
const monMorning = new Date(2026, 6, 6, 9, 0);
console.log("(ii) todayKey from Mon 09:00 =>", toLocalDateKey(monMorning));

// (iii) Evening job Jul 6 19:00 local should stay in Jul 6
const monEve = new Date(2026, 6, 6, 19, 0);
console.log("(iii) evening 19:00 local => key", toLocalDateKey(monEve));

// Contrast with the buggy pattern
console.log("BUGGY: new Date(\"2026-07-06\").toString() =>", new Date("2026-07-06").toString().slice(0,33));
console.log("BUGGY: eve.toISOString().slice(0,10) =>", monEve.toISOString().slice(0,10));

// Sanity
console.log("startOfLocalDay 19:00 =>", startOfLocalDay(monEve).toString().slice(0,33));
console.log("endOfLocalDay 09:00 =>", endOfLocalDay(monMorning).toString().slice(0,33));
console.log("isSameLocalDay(9am, 7pm) =>", isSameLocalDay(monMorning, monEve));
console.log("addLocalDays(+1) =>", toLocalDateKey(addLocalDays(monMorning, 1)));
