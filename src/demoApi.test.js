import { demoApi } from './demoApi';
beforeEach(() => localStorage.clear());
test('recruiters can explore a persistent demo without signing up', async () => {
  const opened = await demoApi('/demo', 'POST');
  expect(opened.house.chores.length).toBeGreaterThan(0);
  const first = opened.house.chores[0];
  const completed = await demoApi(`/chores/${first.id}/complete`, 'POST');
  expect(completed.house.chores[0].memberId).not.toBe(first.memberId);
  expect(completed.house.history).toHaveLength(1);
  expect((await demoApi('/household')).house.chores[0].dueDate).toBe(completed.house.chores[0].dueDate);
  const undone = await demoApi(`/chores/${first.id}/undo`, 'POST', { completionId: completed.completionId });
  expect(undone.house.chores[0].memberId).toBe(first.memberId);
  expect(undone.house.history).toHaveLength(0);
  const added = await demoApi('/groceries', 'POST', { name: 'Coffee', quantity: '1 bag' });
  expect(added.house.groceries.some(item => item.name === 'Coffee')).toBe(true);
});
test('a visitor can build their own demo household and inspect a sample invitation', async () => {
  await demoApi('/auth/signup', 'POST', { name: 'Recruiter' });
  const invite = await demoApi('/invites/ROOMIESDEMO1');
  expect(invite.members.map(member => member.name)).toContain('Maya');
  const joined = await demoApi('/join', 'POST', { code: 'ROOMIESDEMO1', memberId: 'maya' });
  expect(joined.house.members.find(member => member.id === 'maya').name).toBe('Recruiter');
});
