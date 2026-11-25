import { demoApi } from './demoApi';
export const IS_DEMO = process.env.REACT_APP_STORAGE_MODE === 'browser';

export async function api(path, method = 'GET', data) {
  if (IS_DEMO) return demoApi(path, method, data);
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
  } catch {
    throw new Error('Cannot reach Roomies. Make sure npm start is running, then try again.');
  }
  const result = await response.json().catch(() => ({ error: 'The Roomies server is unavailable. Restart using npm start.' }));
  if (!response.ok || result.error) {
    const error = new Error(result.error || 'That did not work. Please try again.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export const uid = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function repeatLabel(days) {
  return Number(days) === 1 ? 'Every day' : Number(days) === 7 ? 'Every week' : `Every ${days} days`;
}
export function dueLabel(value) {
  if (value === today()) return 'Today';
  const d = new Date(`${value}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
export function balance(chores, members) {
  const loads = Object.fromEntries(members.map(member => [member.id, 0]));
  const assignments = {};
  [...chores].sort((a, b) => b.effort / b.frequencyDays - a.effort / a.frequencyDays).forEach(chore => {
    const member = members.reduce((best, next) => loads[next.id] < loads[best.id] ? next : best);
    assignments[chore.id] = member.id;
    loads[member.id] += chore.effort * 7 / chore.frequencyDays;
  });
  return assignments;
}

export const AREA_OPTIONS = ['Kitchen', 'Bathroom', 'Living room', 'Laundry', 'Outdoor space'];
export const SUGGESTIONS = [
  { id: 'kitchen-reset', name: 'Wipe benches and stovetop', area: 'Kitchen', frequencyDays: 1, effort: 1 },
  { id: 'dishes', name: 'Wash dishes and clear the sink', area: 'Kitchen', frequencyDays: 1, effort: 1 },
  { id: 'bins', name: 'Take the bins out', area: 'Kitchen', frequencyDays: 7, effort: 1 },
  { id: 'fridge', name: 'Clean out the fridge', area: 'Kitchen', frequencyDays: 14, effort: 2 },
  { id: 'bathroom', name: 'Clean the shower and toilet', area: 'Bathroom', frequencyDays: 7, effort: 3 },
  { id: 'bathroom-sink', name: 'Wipe the sink and mirror', area: 'Bathroom', frequencyDays: 3, effort: 1 },
  { id: 'vacuum', name: 'Vacuum shared floors', area: 'Living room', frequencyDays: 7, effort: 2 },
  { id: 'dust', name: 'Dust and tidy shared surfaces', area: 'Living room', frequencyDays: 7, effort: 1 },
  { id: 'laundry', name: 'Clean the lint filter and laundry', area: 'Laundry', frequencyDays: 7, effort: 1 },
  { id: 'outdoor', name: 'Sweep the balcony or outdoor area', area: 'Outdoor space', frequencyDays: 7, effort: 2 },
];
