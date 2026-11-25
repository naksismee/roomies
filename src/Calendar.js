import { useState } from 'react';
import { dueLabel, repeatLabel, today } from './api';

export function localDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function scheduledTurns(house, start, end) {
  const result = [];
  for (const chore of house.chores) {
    const cursor = new Date(`${chore.dueDate}T12:00:00`);
    const baseMember = Math.max(0, house.members.findIndex(member => member.id === chore.memberId));
    let occurrence = 0;
    const interval = Math.max(1, Number(chore.frequencyDays));
    // Jump over older occurrences without walking an unbounded history.
    const difference = Math.floor((new Date(`${start}T12:00:00`) - cursor) / 86400000);
    if (difference > 0) { occurrence = Math.max(0, Math.floor(difference / interval) - 1); cursor.setDate(cursor.getDate() + occurrence * interval); }
    while (localDate(cursor) <= end) {
      const value = localDate(cursor);
      if (value >= start) result.push({ ...chore, date: value, projected: occurrence > 0, assignedTo: house.members[house.rotate ? (baseMember + occurrence) % house.members.length : baseMember].name });
      cursor.setDate(cursor.getDate() + interval); occurrence++;
    }
  }
  return result;
}
export default function Calendar({ house }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [selected, setSelected] = useState(today());
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const offset = (first.getDay() + 6) % 7;
  const turns = scheduledTurns(house, localDate(first), localDate(last));
  const selectedTurns = turns.filter(turn => turn.date === selected);
  function move(amount) { const next = new Date(month.getFullYear(), month.getMonth() + amount, 1, 12); setMonth(next); setSelected(localDate(next)); }
  return <div className="calendar-layout"><section className="panel calendar-panel"><div className="section-heading"><div><p className="eyebrow">A rhythm for your home</p><h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2></div><div className="calendar-navigation"><button className="small-button" aria-label="Previous month" onClick={() => move(-1)}>‹</button><button className="small-button" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12)); setSelected(today()); }}>Today</button><button className="small-button" aria-label="Next month" onClick={() => move(1)}>›</button></div></div><p className="muted small-copy">Select a day to see the chores and whose turn is planned.</p><div className="calendar-grid">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: offset }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}{Array.from({ length: last.getDate() }, (_, index) => { const value = localDate(new Date(month.getFullYear(), month.getMonth(), index + 1, 12)); const entries = turns.filter(turn => turn.date === value); return <button key={value} className={`calendar-day ${value === today() ? 'is-today' : ''} ${value === selected ? 'is-selected' : ''}`} aria-pressed={value === selected} aria-label={`${dueLabel(value)}, ${entries.length} ${entries.length === 1 ? 'chore' : 'chores'}`} onClick={() => setSelected(value)}><span className="calendar-number">{index + 1}</span>{entries.slice(0, 2).map(entry => <span className="calendar-event" key={entry.id}>{entry.name}</span>)}{entries.length > 2 && <span className="calendar-more">+{entries.length - 2} more</span>}<span className="mobile-count">{entries.length > 0 ? entries.length : ''}</span></button>; })}</div><div className="note calendar-note">Future turns are a forecast: they assume each chore is completed on schedule. The actual next turn changes when you mark a chore done. Overdue chores stay on your board until completed.</div></section><section className="panel day-panel"><p className="eyebrow">The day’s little quests</p><h2>{new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>{selectedTurns.length ? <div className="day-tasks">{selectedTurns.map(turn => <article key={turn.id}><strong>{turn.name}</strong><p>{turn.area} · {repeatLabel(turn.frequencyDays)}</p><span className="member-pill">{turn.assignedTo}{turn.projected ? ' · planned' : ''}</span></article>)}</div> : <div className="empty-state"><h3>A little room to breathe.</h3><p>No chores planned for this day.</p></div>}</section></div>;
}
