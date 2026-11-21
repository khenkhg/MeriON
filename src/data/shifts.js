// Worker shifts: who works when, and on which machine. Pure functions, no React.
//
// DEMO MODEL (replace with the real roster): the 3 workers of an atelier form one crew.
// The crew works one shift per week and the shift rotates every week (Sunday to Thursday,
// Friday and Saturday off, like the production history). Inside the crew every worker is
// placed on a machine of the atelier, and the placement rotates weekly too.
import { MACHINES } from "./alerts";

export const WORKER_ROLE = "Worker";

// Under this notice, an absence announced by a worker raises a staff-shortage alert on its own
export const ABSENCE_NOTICE_HOURS = 24;

// "team" must match the Team options of the staff alert (data/alerts.js)
export const SHIFTS = [
  { id: "morning", team: "Team A · Morning", label: "Morning", start: 6, hours: "06:00–14:00" },
  { id: "afternoon", team: "Team B · Afternoon", label: "Afternoon", start: 14, hours: "14:00–22:00" },
  { id: "night", team: "Team C · Night", label: "Night", start: 22, hours: "22:00–06:00" },
];

const H = 3600000;
const DAY = 24 * H;
const SHIFT_LENGTH = 8 * H;

// Sunday-based week number (1 Jan 1970 was a Thursday)
const weekOf = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY + 4) / 7);
const isWorkday = (d) => d.getDay() <= 4; // Sun..Thu

const dayStart = (now, offset) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

// One entry per day from `from` to `to` (days relative to today). shift === null on days off.
export function scheduleFor(user, now, from = 0, to = 6) {
  const out = [];
  for (let i = from; i <= to; i++) {
    const day = dayStart(now, i);
    const shift = isWorkday(day) ? SHIFTS[(weekOf(day) + user.atelier) % SHIFTS.length] : null;
    if (!shift) {
      out.push({ offset: i, date: day, shift: null });
      continue;
    }
    const names = MACHINES[user.atelier];
    const start = new Date(day);
    start.setHours(shift.start, 0, 0, 0);
    out.push({
      offset: i,
      date: day,
      shift,
      machine: names[(user.slot - 1 + weekOf(day)) % names.length],
      start: start.getTime(),
      end: start.getTime() + SHIFT_LENGTH,
    });
  }
  return out;
}

// First shift that has not started yet
export const nextShift = (user, now) =>
  scheduleFor(user, now, 0, 14).find((d) => d.shift && d.start > now) || null;

// Shift in progress right now (a night shift started yesterday is still running at 02:00)
export const currentShift = (user, now) =>
  scheduleFor(user, now, -1, 0).find((d) => d.shift && d.start <= now && now < d.end) || null;

export const dayLabel = (entry) =>
  entry.offset === 0
    ? "Today"
    : entry.offset === 1
    ? "Tomorrow"
    : entry.date.toLocaleDateString([], { weekday: "long" });
