import { useEffect, useState } from "react";
import { Factory, CalendarClock, Cog, BellRing, CheckCircle2 } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { ATELIER_NAMES } from "../data/ateliers";
import { formatEta } from "../data/catalog";
import {
  ABSENCE_NOTICE_HOURS,
  scheduleFor,
  nextShift,
  currentShift,
  dayLabel,
} from "../data/shifts";

const KEY = "merion_absences";
const H = 3600000;

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const fmtDay = (d) => d.toLocaleDateString([], { day: "2-digit", month: "short" });

export default function MyShifts() {
  const { user } = useAuth();
  const { now, createAlert } = useAlerts();
  const [absences, setAbsences] = useState(read);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(absences));
  }, [absences]);

  const week = scheduleFor(user, now, 0, 6);
  const next = nextShift(user, now);
  const current = currentShift(user, now);

  const mine = absences.filter((a) => a.workerId === user.id);
  const announcedFor = (start) => mine.find((a) => a.shiftStart === start);
  const nextAnnounced = next ? announcedFor(next.start) : null;
  const hoursLeft = next ? (next.start - now) / H : null;
  const urgent = hoursLeft !== null && hoursLeft < ABSENCE_NOTICE_HOURS;

  const announce = () => {
    if (!next || nextAnnounced) return;
    const when = `${dayLabel(next)} ${next.shift.hours}`;
    if (!window.confirm(`Announce your absence for the ${next.shift.label.toLowerCase()} shift (${when}, ${next.machine})?`)) return;

    let alertId = null;

    // Less than 24 h before the shift: the shortage alert goes out by itself,
    // to HR and to the chef of the atelier (the worker is left out of the recipients).
    if (urgent) {
      const alert = createAlert(
        "staff",
        {
          atelier: String(user.atelier),
          team: next.shift.team,
          machine: next.machine,
          missing: "1 operator",
        },
        user,
        null,
        [
          { label: "Absent worker", value: user.name },
          { label: "Shift", value: `${when} (starts in ${formatEta(hoursLeft)})` },
          { label: "Announced by", value: "The worker, less than 24 h before the shift" },
        ]
      );
      alertId = alert.id;
    }

    setAbsences((prev) => [
      ...prev,
      { id: `${Date.now()}`, workerId: user.id, shiftStart: next.start, announcedAt: Date.now(), alertId },
    ]);
    setMsg(
      urgent
        ? { ok: true, text: "Absence announced. Your atelier chef and HR were alerted automatically so they can find a replacement." }
        : { ok: true, text: "Absence announced. You gave more than 24 h of notice, so no urgent alert was needed." }
    );
  };

  const status = (d) => {
    if (!d.shift) return { tone: "gray", label: "Day off" };
    if (announcedFor(d.start)) return { tone: "amber", label: "Absence announced" };
    if (d.end <= now) return { tone: "gray", label: "Completed" };
    if (d.start <= now) return { tone: "green", label: "On shift now" };
    return { tone: "gray", label: "Scheduled" };
  };

  return (
    <>
      <Navbar />
      <main className="commercial-page">
        <header className="commercial-header">
          <div>
            <span className="eyebrow">WORKER / MY SHIFTS</span>
            <h1>My shifts</h1>
            <p>
              Your schedule and the machine you work on. If you cannot come, announce it here as early as you can.
            </p>
          </div>
          {current && (
            <span className="connection-status connected">
              <span className="status-dot" />
              On shift now · {current.machine}
            </span>
          )}
        </header>

        <div className="dash-cta">
          <div>
            <strong>
              {next ? `Next shift: ${next.shift.label}, ${dayLabel(next).toLowerCase()} ${next.shift.hours}` : "No upcoming shift"}
            </strong>
            <span>
              {!next
                ? "Nothing is planned in the next two weeks."
                : nextAnnounced
                ? "Your absence is announced for this shift."
                : urgent
                ? `Starts in ${formatEta(hoursLeft)}. Your atelier chef and HR will be alerted automatically.`
                : `Starts in ${formatEta(hoursLeft)}. You are announcing more than 24 h ahead, so no urgent alert is sent.`}
            </span>
          </div>
          <button type="button" className="btn-white" disabled={!next || !!nextAnnounced} onClick={announce}>
            {nextAnnounced ? <CheckCircle2 size={17} /> : <BellRing size={17} />}
            {nextAnnounced ? "Absence announced" : "Announce absence in next shift"}
          </button>
        </div>

        {msg && (
          <div className="dash-empty" role="status" style={{ marginBottom: 32 }}>
            <CheckCircle2 size={18} /> {msg.text}
          </div>
        )}

        <div className="commercial-stats">
          <div className="commercial-stat-card">
            <div className="commercial-stat-icon green"><Factory size={22} /></div>
            <span>My atelier</span>
            <strong>Atelier {user.atelier}</strong>
            <small>{ATELIER_NAMES[user.atelier]}</small>
          </div>
          <div className="commercial-stat-card">
            <div className="commercial-stat-icon blue"><CalendarClock size={22} /></div>
            <span>Next shift</span>
            <strong>{next ? next.shift.label : "—"}</strong>
            <small>{next ? `${next.shift.team} · ${dayLabel(next)}` : "no shift planned"}</small>
          </div>
          <div className="commercial-stat-card">
            <div className="commercial-stat-icon amber"><Cog size={22} /></div>
            <span>My machine</span>
            <strong>{next ? next.machine : "—"}</strong>
            <small>for the next shift</small>
          </div>
        </div>

        <section className="commercial-section">
          <div className="commercial-section-heading">
            <span className="eyebrow">THIS WEEK</span>
            <h2>My schedule</h2>
          </div>

          <div className="commercial-table-wrapper">
            <table className="commercial-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Shift</th>
                  <th>Hours</th>
                  <th>Machine</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {week.map((d) => {
                  const s = status(d);
                  return (
                    <tr key={d.offset}>
                      <td>
                        <strong>{dayLabel(d)}</strong>
                        <br />
                        <small className="pred-sub">{fmtDay(d.date)}</small>
                      </td>
                      <td>{d.shift ? d.shift.team : "—"}</td>
                      <td>{d.shift ? d.shift.hours : "—"}</td>
                      <td>{d.shift ? d.machine : "—"}</td>
                      <td><span className={`pred-badge ${s.tone}`}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
