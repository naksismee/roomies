import { scheduledTurns } from './Calendar';
test('calendar projects recurring assignments and respects rotation being off', () => {
  const house = { members: [{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bob' }], rotate: true, chores: [{ id: 'c', name: 'Bins', dueDate: '2026-11-25', frequencyDays: 7, memberId: 'a' }] };
  const turns = scheduledTurns(house, '2026-11-01', '2026-12-31');
  expect(turns.slice(0, 3).map(turn => [turn.date, turn.assignedTo])).toEqual([['2026-11-25', 'Alice'], ['2026-12-02', 'Bob'], ['2026-12-09', 'Alice']]);
  expect(scheduledTurns({ ...house, rotate: false }, '2026-11-01', '2026-12-31').every(turn => turn.assignedTo === 'Alice')).toBe(true);
});
